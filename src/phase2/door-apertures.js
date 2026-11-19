import * as THREE from 'three';

const MAX_OPENINGS=64;
const sourceName=record=>String(record.mesh.userData.ifc?.name||'');
const isStructuralWall=record=>record.category==='walls'||/^SW\s*-/i.test(sourceName(record));

/** Source-backed aperture geometry, shared by rendering and walking.
 * The source IFC geometry is never removed or modified.
 */
export function buildSourceApertures(doorSystem,records,inside=()=>true,windowSystem=null,facadeSystem=null){
 const structural=records.filter(r=>inside(r)&&isStructuralWall(r)&&
   r.box.getSize(new THREE.Vector3()).y>1.0);
 const cuts=[];
 const sourceWallSet=new Set();
 function append(kind,id,cx,cz,ymin,ymax,width,alongX,sourceIds,door=null){
  const margin=.115,half=width/2+margin,normalBand=.74;
  const checkBox=new THREE.Box3(
   alongX?new THREE.Vector3(cx-half,ymin+.13,cz-normalBand):new THREE.Vector3(cx-normalBand,ymin+.13,cz-half),
   alongX?new THREE.Vector3(cx+half,ymax-.11,cz+normalBand):new THREE.Vector3(cx+normalBand,ymax-.11,cz+half)
  );
  const walls=structural.filter(rec=>rec.box.intersectsBox(checkBox));
  if(!walls.length)return;
  const closestNormal=(w)=>alongX?
    Math.min(Math.abs(cz-w.box.min.z),Math.abs(cz-w.box.max.z)):
    Math.min(Math.abs(cx-w.box.min.x),Math.abs(cx-w.box.max.x));
  const closeWalls=walls.filter(w=>closestNormal(w)<normalBand+.11);
  if(!closeWalls.length)return;
  const low=ymin+(kind==='door'?.055:.015),high=ymax-(kind==='door'?.05:.015);
  if(high-low<.30)return;
  // Wall cuts are applied only to genuine source-derived door/window positions.
  // The depth accounts for thicker IFC wall faces without cutting adjacent rooms.
  const depth=Math.min(1.52,Math.max(.66,
    ...closeWalls.map(w=>alongX?
      Math.max(Math.abs(cz-w.box.min.z),Math.abs(cz-w.box.max.z))*2+.045:
      Math.max(Math.abs(cx-w.box.min.x),Math.abs(cx-w.box.max.x))*2+.045)));
  const halfDepth=depth/2;
  const bounds=alongX?
   new THREE.Vector4(cx-width/2-.028,cx+width/2+.028,cz-halfDepth,cz+halfDepth):
   new THREE.Vector4(cx-halfDepth,cx+halfDepth,cz-width/2-.028,cz+width/2+.028);
  const wallMeshes=new Set(closeWalls.map(w=>w.mesh));
  for(const m of wallMeshes)sourceWallSet.add(m);
  cuts.push({kind,id,door,box:bounds,height:new THREE.Vector2(low,high),
    sourceWallMeshes:wallMeshes,sourceWallGuids:closeWalls.map(w=>w.mesh.userData.ifc?.guid),
    sourceIds,alongX,width,wallCount:wallMeshes.size});
 }
 for(const d of doorSystem?.doors??[]){
  if(cuts.length>=MAX_OPENINGS)break;
  append('door',d.id,d.position.x,d.position.z,d.groundY,d.groundY+d.height,
    d.width,d.alongX,d.source.map(s=>s.mesh.userData.ifc?.guid),d);
 }
 for(let i=0;i<(windowSystem?.windows?.length??0)&&cuts.length<MAX_OPENINGS;i++){
  const w=windowSystem.windows[i];
  append('window',i+1,w.position.x,w.position.z,
    w.position.y-w.height/2,w.position.y+w.height/2,w.width,w.alongX,
    w.group.userData.sourceGUIDs);
 }
 for(let i=0;i<(facadeSystem?.panels?.length??0)&&cuts.length<MAX_OPENINGS;i++){
  const p=facadeSystem.panels[i];
  append('window',1000+i,p.position.x,p.position.z,
    p.position.y-p.height/2,p.position.y+p.height/2,
    p.width,p.alongX,p.sourceGuids);
 }
 function pointInsideCut(point,cut){
  const b=cut.box,h=cut.height;
  return point.x>b.x&&point.x<b.y&&point.z>b.z&&point.z<b.w&&
    point.y>h.x&&point.y<h.y;
 }
 /** Only confirmed *wall* intersections at *open* doors may be ignored.
  * Furniture, columns, windows and closed door leaves remain obstacles.
  */
 function permitsOpenDoorWallHit(hit,footY){
  if(!sourceWallSet.has(hit?.object))return false;
  for(const cut of cuts){
   if(cut.kind!=='door'||!cut.door||cut.door.current<.85 ||
     !cut.door.visual.visible||Math.abs(footY-cut.door.groundY)>1.22)continue;
   if(!cut.sourceWallMeshes.has(hit.object))continue;
   if(!pointInsideCut(hit.point,cut))continue;
   // Restrict the ignored collision to the door's actual clear centre.
   const d=cut.door;
   const lateral=d.alongX?hit.point.x-d.position.x:hit.point.z-d.position.z;
   if(Math.abs(lateral)>d.width/2-.055)continue;
   return true;
  }
  return false;
 }
 return {cuts,structural,sourceWallSet,permitsOpenDoorWallHit,
  doorCutCount:cuts.filter(c=>c.kind==='door').length,
  windowCutCount:cuts.filter(c=>c.kind==='window').length,
  summary:{
   sourceAnchoredDoors:doorSystem?.doors.length??0,
   verifiedDoorWallCutouts:cuts.filter(c=>c.kind==='door').length,
   sourceAnchoredWindows:(windowSystem?.windows?.length??0)+(facadeSystem?.panels?.length??0),
   verifiedWindowWallCutouts:cuts.filter(c=>c.kind==='window').length,
   noSourceVerticesModified:true
  }};
}

/** Non-destructive shader cuts through source-backed structural walls.
 * The SAME aperture registry is used by collision filtering.
 */
export function revealObstructedDoors(wallMaterial,doorSystem,meshRecords,inside=()=>true,windowSystem=null,facadeSystem=null){
 const registry=buildSourceApertures(doorSystem,meshRecords,inside,windowSystem,facadeSystem);
 const cuts=registry.cuts;
 const vecBounds=Array.from({length:MAX_OPENINGS},(_,i)=>cuts[i]?.box||new THREE.Vector4(999999,999999,999999,999999));
 const vecHeights=Array.from({length:MAX_OPENINGS},(_,i)=>cuts[i]?.height||new THREE.Vector2(999999,999999));
 const uniforms={
  uDoorBounds:{value:vecBounds},
  uDoorHeights:{value:vecHeights},
  uDoorCount:{value:cuts.length}
 };
 const previousShader=wallMaterial.onBeforeCompile;
 const previousKey=wallMaterial.customProgramCacheKey;
 wallMaterial.onBeforeCompile=(shader,renderer)=>{
  previousShader?.(shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vHouseWorldPoint;\n'+
    shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vHouseWorldPoint=(modelMatrix*vec4(transformed,1.0)).xyz;');
  const hook='#include <clipping_planes_fragment>';
  const test=hook+
   '\n for(int openingIndex=0;openingIndex<'+MAX_OPENINGS+';openingIndex++){' +
   '\n if(openingIndex>=uDoorCount)break;' +
   '\n vec4 rect=uDoorBounds[openingIndex];' +
   '\n vec2 y=uDoorHeights[openingIndex];' +
   '\n if(vHouseWorldPoint.x>rect.x && vHouseWorldPoint.x<rect.y' +
   ' && vHouseWorldPoint.z>rect.z && vHouseWorldPoint.z<rect.w' +
   ' && vHouseWorldPoint.y>y.x && vHouseWorldPoint.y<y.y)discard;' +
   '\n }';
  shader.fragmentShader='varying vec3 vHouseWorldPoint;\n'+
   'uniform vec4 uDoorBounds['+MAX_OPENINGS+'];\n'+
   'uniform vec2 uDoorHeights['+MAX_OPENINGS+'];\n'+
   'uniform int uDoorCount;\n'+shader.fragmentShader.replace(hook,test);
 };
 wallMaterial.customProgramCacheKey=()=>('ifc-source-door-window-apertures-v3-'+cuts.length);
 wallMaterial.needsUpdate=true;
 const occlusionDetails=cuts.filter(c=>c.kind==='door').map(c=>({
  doorId:c.id,sourceWallCount:c.wallCount,sourceWallGuids:c.sourceWallGuids
 }));
 const windowOcclusionDetails=cuts.filter(c=>c.kind==='window').map(c=>({
  windowId:c.id,sourceWallCount:c.wallCount,sourceWallGuids:c.sourceWallGuids
 }));
 return {
  doorCount:doorSystem?.doors.length??0,
  windowCount:(windowSystem?.windows?.length??0)+(facadeSystem?.panels?.length??0),
  obstructedCount:registry.doorCutCount,
  windowObstructedCount:registry.windowCutCount,
  visualCuts:cuts,occlusionDetails,windowOcclusionDetails,
  permitsOpenDoorWallHit:registry.permitsOpenDoorWallHit,
  summary:registry.summary,
  restore:()=>{
   wallMaterial.onBeforeCompile=previousShader;
   wallMaterial.customProgramCacheKey=previousKey;
   wallMaterial.needsUpdate=true;
  }
 };
}
