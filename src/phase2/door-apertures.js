import * as THREE from 'three';
const MAX=40;
/**
 * Reversible visual repair of confirmed wall occlusion over IFC door positions.
 * Only removes rendered wall pixels inside source-derived doorway rectangles.
 * The architect's IFC/GLB mesh vertices and metadata remain unchanged.
 */
export function revealObstructedDoors(wallMaterial,doorSystem,meshRecords,inside=()=>true){
 const wallRecords=meshRecords.filter(r=>
  inside(r)&&(r.category==='walls'||/^SW\s*-/i.test(r.mesh.userData.ifc?.name||'')) &&
  r.box.getSize(new THREE.Vector3()).y>1.5);
 const rays=new THREE.Raycaster();
 const origin=new THREE.Vector3();
 const cuts=[],occlusionDetails=[];
 for(const rec of wallRecords)rec.mesh.updateWorldMatrix(true,false);
 for(const door of doorSystem.doors){
  const direction=door.alongX?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);
  const candidates=wallRecords.filter(r=>{
   const b=r.box;
   return b.max.x>=door.position.x-door.width/2-.5 &&
     b.min.x<=door.position.x+door.width/2+.5 &&
     b.max.z>=door.position.z-door.width/2-.5 &&
     b.min.z<=door.position.z+door.width/2+.5 &&
     b.max.y>door.groundY+.85&&b.min.y<door.groundY+1.7;
  });
  if(!candidates.length)continue;
  let intersections=0;
  for(const height of [1.0,1.65]){
   origin.set(door.position.x-direction.x*.75,door.groundY+height,door.position.z-direction.z*.75);
   rays.set(origin,direction);rays.near=.03;rays.far=1.5;
   const hits=rays.intersectObjects(candidates.map(r=>r.mesh),false);
   if(hits.some(hit=>hit.distance<1.49))intersections++;
  }
  if(!intersections)continue;
  const width=door.width+.085,depth=.46;
  const cx=door.position.x,cz=door.position.z;
  const b=door.alongX?
   new THREE.Vector4(cx-width/2,cx+width/2,cz-depth/2,cz+depth/2):
   new THREE.Vector4(cx-depth/2,cx+depth/2,cz-width/2,cz+width/2);
  cuts.push({box:b,height:new THREE.Vector2(door.groundY+.10,door.groundY+door.height-.08),doorId:door.id});
  occlusionDetails.push({doorId:door.id,sourceWallCount:candidates.length,rayHits:intersections});
  if(cuts.length>=MAX)break;
 }
 const bounds=Array.from({length:MAX},(_,i)=>cuts[i]?.box||new THREE.Vector4(999999,999999,999999,999999));
 const heights=Array.from({length:MAX},(_,i)=>cuts[i]?.height||new THREE.Vector2(999999,999999));
 const uniforms={uDoorBounds:{value:bounds},uDoorHeights:{value:heights},uDoorCount:{value:cuts.length}};
 const old=wallMaterial.onBeforeCompile;
 const previousCache=wallMaterial.customProgramCacheKey;
 wallMaterial.onBeforeCompile=(shader,renderer)=>{
  old?.(shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vHouseWorldPoint;\n'+shader.vertexShader.replace(
   '#include <begin_vertex>',
   '#include <begin_vertex>\n vHouseWorldPoint=(modelMatrix * vec4(transformed,1.0)).xyz;');
  const hook='#include <clipping_planes_fragment>';
  const test=hook+
   '\n for(int doorIndex=0;doorIndex<'+MAX+';doorIndex++){' +
   '\n  if(doorIndex>=uDoorCount)break;' +
   '\n  vec4 area=uDoorBounds[doorIndex];' +
   '\n  vec2 h=uDoorHeights[doorIndex];' +
   '\n  if(vHouseWorldPoint.x>area.x && vHouseWorldPoint.x<area.y' +
   ' && vHouseWorldPoint.z>area.z && vHouseWorldPoint.z<area.w' +
   ' && vHouseWorldPoint.y>h.x && vHouseWorldPoint.y<h.y)discard;' +
   '\n }';
  shader.fragmentShader='varying vec3 vHouseWorldPoint;\n'+
   'uniform vec4 uDoorBounds['+MAX+'];\n'+
   'uniform vec2 uDoorHeights['+MAX+'];\n'+
   'uniform int uDoorCount;\n'+shader.fragmentShader.replace(hook,test);
 };
 wallMaterial.customProgramCacheKey=()=>('source-door-visibility-v1-'+cuts.length);
 wallMaterial.needsUpdate=true;
 return {doorCount:doorSystem.doors.length,obstructedCount:cuts.length,visualCuts:cuts,occlusionDetails,
  restore:()=>{wallMaterial.onBeforeCompile=old;wallMaterial.customProgramCacheKey=previousCache;wallMaterial.needsUpdate=true;}};
}
