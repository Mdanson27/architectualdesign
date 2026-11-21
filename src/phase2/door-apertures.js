import * as THREE from 'three';

const MAX_OPENINGS=64;
const sourceName=record=>String(record.mesh.userData.ifc?.name||'');
const isStructuralWall=record=>record.category==='walls'||/^SW\s*-/i.test(sourceName(record));

/** Source-backed aperture geometry, shared by rendering and walking.
 * The source IFC geometry is never removed or modified.
 */
export function buildSourceApertures(doorSystem,records,inside=()=>true,windowSystem=null,facadeSystem=null,planCirculation=null){
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
  // Match the actual source wall, not an intersecting perpendicular exterior
  // wall at the end of an open-plan bay. Otherwise the kitchen/dining visual
  // cut can open a false hole in the house envelope near the front facade.
  const sourceGuids=new Set(sourceIds??[]);
  const closeWalls=walls.filter(w=>{
   if(closestNormal(w)>=normalBand+.11)return false;
   if(kind==='plan')return sourceGuids.has(w.mesh.userData.ifc?.guid);
   const size=w.box.getSize(new THREE.Vector3());
   // Ignore a perpendicular full-height wall sharing a corner of the aperture.
   return (size.x>=size.z)===alongX || Math.max(size.x,size.z)<.40;
  });
  if(!closeWalls.length)return;
  const low=kind==='plan'?ymin-.025:ymin+(kind==='door'?.055:.015);
  const high=kind==='plan'?ymax+.025:ymax-(kind==='door'?.05:.015);
  if(high-low<.30)return;
  // Wall cuts are applied only to genuine source-derived door/window positions.
  // The depth accounts for thicker IFC wall faces without cutting adjacent rooms.
  const depth=kind==='plan'?.64:Math.min(1.52,Math.max(.66,
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
  if(d.removedFromPlan)continue;
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
 for(const p of planCirculation?.apertures??[]){
  if(cuts.length>=MAX_OPENINGS)break;
  append('plan',p.id,p.cx,p.cz,p.groundY,p.groundY+p.height,
    p.width,p.alongX,p.sourceWallGuids);
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
   if(cut.kind==='window')continue;
   if(cut.kind==='door'&&(!cut.door||cut.door.current<.85 ||
     !cut.door.visual.visible||Math.abs(footY-cut.door.groundY)>1.22))continue;
   if(cut.kind==='plan'&&Math.abs(footY)>1.20)continue;
   if(!cut.sourceWallMeshes.has(hit.object))continue;
   // An IFC wall face can register below the actual first-floor surface.
   // Keep the source doorway rectangle exact in plan, allowing only 28cm
   // below the visual sill for physical collisions (not for shader cuts).
   const b=cut.box,h=cut.height,p=hit.point;
   if(!(p.x>b.x&&p.x<b.y&&p.z>b.z&&p.z<b.w&&
     p.y>h.x-.28&&p.y<h.y))continue;
   // Restrict the ignored collision to the door's actual clear centre.
   const d=cut.door;
   const lateral=d?
    (d.alongX?hit.point.x-d.position.x:hit.point.z-d.position.z):
    (cut.alongX?hit.point.x-(cut.box.x+cut.box.y)/2:hit.point.z-(cut.box.z+cut.box.w)/2);
   if(Math.abs(lateral)>cut.width/2-.055)continue;
   return true;
  }
  return false;
 }
 return {cuts,structural,sourceWallSet,permitsOpenDoorWallHit,
  doorCutCount:cuts.filter(c=>c.kind==='door').length,
  windowCutCount:cuts.filter(c=>c.kind==='window').length,
  planCutCount:cuts.filter(c=>c.kind==='plan').length,
  summary:{
   sourceAnchoredDoors:doorSystem?.doors.length??0,
   verifiedDoorWallCutouts:cuts.filter(c=>c.kind==='door').length,
   sourceAnchoredWindows:(windowSystem?.windows?.length??0)+(facadeSystem?.panels?.length??0),
   verifiedWindowWallCutouts:cuts.filter(c=>c.kind==='window').length,
   planConfirmedCirculationOpenings:cuts.filter(c=>c.kind==='plan').length,
   noSourceVerticesModified:true
  }};
}

/** Non-destructive shader cuts through source-backed structural walls.
 * The SAME aperture registry is used by collision filtering.
 */
export function revealObstructedDoors(wallMaterial,doorSystem,meshRecords,inside=()=>true,windowSystem=null,facadeSystem=null,planCirculation=null){
 const registry=buildSourceApertures(doorSystem,meshRecords,inside,windowSystem,facadeSystem,planCirculation);
 const cuts=registry.cuts;
 // A shader cut is a property of a SPECIFIC IFC wall, never every wall
 // sharing the same material. In particular, the kitchen-to-dining opening
 // must not remove the perpendicular exterior kitchen/front walls.
 const bySourceWall=new Map();
 for(const cut of cuts)for(const mesh of cut.sourceWallMeshes){
  if(!bySourceWall.has(mesh))bySourceWall.set(mesh,[]);
  bySourceWall.get(mesh).push(cut);
 }
 const patchedWalls=new Map();
 for(const [mesh,wallCuts] of bySourceWall){
  const original=mesh.material;
  const derived=original.clone();
  const n=wallCuts.length;
  const localUniforms={
   uDoorBounds:{value:wallCuts.map(c=>c.box)},
   uDoorHeights:{value:wallCuts.map(c=>c.height)},
   uDoorCount:{value:n}
  };
  const inheritedCompile=original.onBeforeCompile;
  derived.onBeforeCompile=(shader,renderer)=>{
   inheritedCompile?.call(original,shader,renderer);
   Object.assign(shader.uniforms,localUniforms);
   shader.vertexShader='varying vec3 vHouseWorldPoint;\n'+
    shader.vertexShader.replace('#include <begin_vertex>',
     '#include <begin_vertex>\n vHouseWorldPoint=(modelMatrix*vec4(transformed,1.0)).xyz;');
   const hook='#include <clipping_planes_fragment>';
   const test=hook+
    '\n for(int openingIndex=0;openingIndex<'+n+';openingIndex++){' +
    '\n if(openingIndex>=uDoorCount)break;' +
    '\n vec4 rect=uDoorBounds[openingIndex];' +
    '\n vec2 y=uDoorHeights[openingIndex];' +
    '\n if(vHouseWorldPoint.x>rect.x && vHouseWorldPoint.x<rect.y' +
    ' && vHouseWorldPoint.z>rect.z && vHouseWorldPoint.z<rect.w' +
    ' && vHouseWorldPoint.y>y.x && vHouseWorldPoint.y<y.y)discard;' +
    '\n }';
   shader.fragmentShader='varying vec3 vHouseWorldPoint;\n'+
    'uniform vec4 uDoorBounds['+n+'];\n'+
    'uniform vec2 uDoorHeights['+n+'];\n'+
    'uniform int uDoorCount;\n'+shader.fragmentShader.replace(hook,test);
  };
  derived.customProgramCacheKey=()=>('ifc-source-wall-cut-v4-'+
   wallCuts.map(c=>c.kind+':'+c.id).join('|'));
  derived.needsUpdate=true;
  mesh.material=derived;
  patchedWalls.set(mesh,{original,derived});
 }
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
  summary:{...registry.summary,sourceScopedWallMaterials:patchedWalls.size,
   untargetedExteriorWallsUnmodified:true},
  restore:()=>{
   for(const [mesh,{original,derived}] of patchedWalls){
    mesh.material=original;
    derived.dispose();
   }
  }
 };
}
