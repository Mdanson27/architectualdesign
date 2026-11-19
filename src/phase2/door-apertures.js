import * as THREE from 'three';
const MAX=60;
/**
 * Reversible visual repair of confirmed wall occlusion over IFC door positions.
 * Only removes rendered wall pixels inside source-derived doorway rectangles.
 * The architect's IFC/GLB mesh vertices and metadata remain unchanged.
 */
export function revealObstructedDoors(wallMaterial,doorSystem,meshRecords,inside=()=>true,windowSystem=null){
 const wallRecords=meshRecords.filter(r=>
  inside(r)&&(r.category==='walls'||/^SW\s*-/i.test(r.mesh.userData.ifc?.name||'')) &&
  r.box.getSize(new THREE.Vector3()).y>1.5);
 const rays=new THREE.Raycaster();
 const origin=new THREE.Vector3();
 const cuts=[],occlusionDetails=[],windowOcclusionDetails=[];
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
 // Phase 3: extend the same reversible shader cutouts to verified IFC-window
 // openings. Using one shader avoids duplicated GLSL hooks and overdraw.
 // Wall triangles and collision geometry are not modified by this treatment.
 if(windowSystem?.windows){
  for(const w of windowSystem.windows){
   if(cuts.length>=MAX)break;
   const axis=w.alongX?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);
   const localWalls=wallRecords.filter(rec=>{
    const b=rec.box;
    return b.max.x>w.position.x-w.width/2-.32&&b.min.x<w.position.x+w.width/2+.32 &&
      b.max.z>w.position.z-w.width/2-.32&&b.min.z<w.position.z+w.width/2+.32 &&
      b.max.y>w.position.y-w.height/2+.15&&b.min.y<w.position.y+w.height/2-.15;
   });
   if(!localWalls.length)continue;
   let hits=0;
   for(const dy of [-.23,.16]){
    origin.set(w.position.x-axis.x*.75,w.position.y+dy,w.position.z-axis.z*.75);
    rays.set(origin,axis);rays.near=.03;rays.far=1.5;
    if(rays.intersectObjects(localWalls.map(rec=>rec.mesh),false).some(hit=>hit.distance<1.48))hits++;
   }
   if(!hits)continue;
   const width=w.width+.035,depth=.42;
   const x=w.position.x,z=w.position.z;
   const box=w.alongX?
     new THREE.Vector4(x-width/2,x+width/2,z-depth/2,z+depth/2):
     new THREE.Vector4(x-depth/2,x+depth/2,z-width/2,z+width/2);
   cuts.push({box,height:new THREE.Vector2(w.position.y-w.height/2+.015,w.position.y+w.height/2-.015),
    windowSourceGUIDs:w.group.userData.sourceGUIDs,kind:'window'});
   windowOcclusionDetails.push({sourceGUIDs:w.group.userData.sourceGUIDs,sourceWallCount:localWalls.length,rayHits:hits});
  }
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
 wallMaterial.customProgramCacheKey=()=>('source-opening-visibility-v2-'+cuts.length);
 wallMaterial.needsUpdate=true;
 return {doorCount:doorSystem.doors.length,obstructedCount:occlusionDetails.length,
  windowCount:windowSystem?.windows.length??0,windowObstructedCount:windowOcclusionDetails.length,
  visualCuts:cuts,occlusionDetails,windowOcclusionDetails,
  restore:()=>{wallMaterial.onBeforeCompile=old;wallMaterial.customProgramCacheKey=previousCache;wallMaterial.needsUpdate=true;}};
}
