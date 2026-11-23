import * as THREE from 'three';
import {STAGE1_PLAN_SKETCHES,insidePolygon,polygonBounds} from './stage1-plan-crosswalk.js';
import {STAGE1_ROOMS} from './stage1-room-audit.js';
import {STUDIO_ANNE_SCHEMES} from './studio-anne-brief.js';

/**
 * Stage 2: whole-house finishes specification and *reversible* 3D rendering.
 * Studio Anne pp. 3–8 offers alternatives, not an authorized final schedule.
 * The house does not contain verified IfcSpace polygons; only SAMPLE known
 * source walls/slabs, and use the preliminary room contours to clip previews.
 * No source geometry, door leaf, collision record or floor slab is created,
 * deleted, offset, or modified by this system.
 */
export const STAGE2_FINISH_ROOMS=Object.freeze(STAGE1_ROOMS.map(room=>
 Object.freeze({id:room.id,label:room.label,level:room.level,reportedAreaM2:room.reportedAreaM2})
));
export const STAGE2_WALL_CHOICES=Object.freeze(['source','painted','textured','stone-accent']);
export const STAGE2_CEILING_CHOICES=Object.freeze(['source','flat','beamed','suspended']);
export const STAGE2_FLOOR_CHOICES=Object.freeze(['source','porcelain','ash','caramel']);
export const STAGE2_PALETTE_CHOICES=Object.freeze(['source','mint','taupe','powder']);
const DATUM=Object.freeze({ground:0,first:3.3});
const JOINT=.01,TILE=.54,STEP=.55,EDGE_INSET=.075;
const BASEBOARD_HEIGHT=.085,BASEBOARD_DEPTH=.006;
const color=(scheme,role)=>STUDIO_ANNE_SCHEMES[scheme]?.colors?.[role]||'#eee8df';
const finite=x=>Number.isFinite(x);
const round=x=>Math.round(x*1000)/1000;
const selectedDefaults=()=>({floor:'source',wall:'source',ceiling:'source',palette:'source',skirting:false});
const PROPOSALS=Object.freeze({
 'G-SITTING':{floor:'porcelain',wall:'textured',ceiling:'suspended',palette:'taupe',skirting:true},
 'G-DINING':{floor:'porcelain',wall:'painted',ceiling:'flat',palette:'taupe',skirting:true},
 'G-KITCHEN':{floor:'porcelain',wall:'painted',ceiling:'flat',palette:'mint',skirting:true},
 'G-BEDROOM':{floor:'ash',wall:'painted',ceiling:'flat',palette:'powder',skirting:true},
 'G-MAID':{floor:'source',wall:'source',ceiling:'source',palette:'source',skirting:false},
 'F-MASTER':{floor:'ash',wall:'textured',ceiling:'beamed',palette:'taupe',skirting:true},
 'F-BEDROOM-2':{floor:'ash',wall:'painted',ceiling:'flat',palette:'powder',skirting:true},
 'F-BEDROOM-3':{floor:'caramel',wall:'painted',ceiling:'flat',palette:'powder',skirting:true},
 'F-FAMILY':{floor:'porcelain',wall:'stone-accent',ceiling:'suspended',palette:'taupe',skirting:true},
 'F-READING':{floor:'ash',wall:'painted',ceiling:'flat',palette:'mint',skirting:true}
});
export const STAGE2_ROOM_PROPOSALS=Object.freeze(PROPOSALS);
function withinRoom(x,z,poly,margin=0){
 if(!insidePolygon([x,z],poly))return false;
 if(!margin)return true;
 const pts=[[x-margin,z-margin],[x+margin,z-margin],
  [x-margin,z+margin],[x+margin,z+margin]];
 return pts.every(point=>insidePolygon(point,poly));
}
function closestDistanceXZ(x,z,r,origin){
 const b=r.box;
 const minX=b.min.x+(origin.x||0),maxX=b.max.x+(origin.x||0);
 const minZ=b.min.z+(origin.z||0),maxZ=b.max.z+(origin.z||0);
 return Math.hypot(Math.max(minX-x,0,x-maxX),Math.max(minZ-z,0,z-maxZ));
}
function getRoom(roomId){
 const room=STAGE2_FINISH_ROOMS.find(x=>x.id===roomId);
 if(!room||!STAGE1_PLAN_SKETCHES[roomId])throw Error('Unknown plan-listed Stage 2 room '+roomId);
 return room;
}
function checkChoice(choice,options,label){
 if(!options.includes(choice))throw Error('Unsupported Stage 2 '+label+': '+choice);
}
function validate(spec){
 checkChoice(spec.floor,STAGE2_FLOOR_CHOICES,'floor');
 checkChoice(spec.wall,STAGE2_WALL_CHOICES,'wall');
 checkChoice(spec.ceiling,STAGE2_CEILING_CHOICES,'ceiling');
 checkChoice(spec.palette,STAGE2_PALETTE_CHOICES,'palette');
 if(typeof spec.skirting!=='boolean')throw Error('Stage 2 skirting must be boolean');
 return Object.freeze({...spec});
}
const objectIsVisualOnly=(o,roomId,part)=>{
 o.userData={stage2:true,sourceIfcUnchanged:true,collidable:false,
  approved:false,planPolygonCertified:false,roomId,part};
 o.castShadow=false;o.receiveShadow=false;
 return o;
};
const nearDoor=(x,z,level,doors,origin)=>{
 for(const d of doors){
  if(d.level!==level||d.removedFromPlan)continue;
  const px=d.position.x+(origin.x||0),pz=d.position.z+(origin.z||0);
  if(Math.hypot(px-x,pz-z)<Math.min(1.25,Math.max(.62,(d.width||1)/2+.32)))
   return true;
 }
 return false;
};

export function createStage2SurfaceSystem({
 scene,origin={x:0,z:0},records=[],floorSampler,ceilingSampler,
 textureMaps={},doors=[]
}={}){
 if(!scene||typeof floorSampler!=='function'||typeof ceilingSampler!=='function')
  throw Error('Stage 2 requires a scene, IFC floor sampler and IFC ceiling sampler');
 const root=new THREE.Group();
 root.name='STAGE2_ROOM_SURFACE_COMPARISONS_NOT_IFC_CONSTRUCTION';
 scene.add(root);
 const selections=new Map(STAGE2_FINISH_ROOMS.map(r=>[r.id,selectedDefaults()]));
 const groups=new Map();
 const originalMaterials=new Map();
 const tintedMaterials=[];
 const roomStats=new Map();
 const relevantWalls=records.filter(r=>r.category==='walls'&&r.box&&r.mesh?.isMesh&&
  r.mesh?.material?.isMeshStandardMaterial&&r.layer?.level in DATUM);
 // Excludes source walls deliberately removed for the approved open-plan layout.
 const isApprovedRemoved=r=>r.mesh.userData?.clientKitchenDiningDividerRemoved||
  r.mesh.userData?.clientStairSittingWallRemoved||
  r.mesh.userData?.clientOpenPlanPartitionRemoved||
  r.mesh.userData?.clientKitchenStairPartitionRemoved||
  r.mesh.userData?.facadeDuplicateHidden;
 const sourceWallVisible=r=>r.mesh.visible&&!isApprovedRemoved(r);
 const wallOwners=new Map();
 for(const r of relevantWalls){
  const x=(r.box.min.x+r.box.max.x)/2+(origin.x||0);
  const z=(r.box.min.z+r.box.max.z)/2+(origin.z||0);
  const matches=STAGE2_FINISH_ROOMS.filter(room=>
   room.level===r.layer.level&&insidePolygon([x,z],STAGE1_PLAN_SKETCHES[room.id].vertices));
  if(matches.length===1)wallOwners.set(r,matches[0].id);
 }
 function restoreWalls(){
  for(const [mesh,original] of originalMaterials)mesh.material=original;
  originalMaterials.clear();
  for(const material of tintedMaterials)material.dispose();
  tintedMaterials.length=0;
 }
 function clearGeometry(){
  for(const group of groups.values()){
   group.traverse(o=>{if(o.isMesh){
    o.geometry?.dispose();
    if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
    else o.material?.dispose();
   }});
   root.remove(group);
  }
  groups.clear();roomStats.clear();
 }
 function roomWallCandidates(room){
  const datum=DATUM[room.level];
  return relevantWalls.filter(r=>{
   if(!sourceWallVisible(r)||wallOwners.get(r)!==room.id)return false;
   const b=r.box;
   const h=b.max.y-b.min.y;
   if(h<1.05||b.min.y>datum+1.15||b.max.y<datum+1.4)return false;
   const dx=b.max.x-b.min.x,dz=b.max.z-b.min.z;
   // Avoid assigning long facade panels/entire multi-room walls to one room.
   return Math.min(dx,dz)<.58&&Math.max(dx,dz)>.38&&Math.max(dx,dz)<9;
  });
 }
 function makeWalls(room,spec,stats){
  if(spec.wall==='source')return [];
  const wallRecords=roomWallCandidates(room);
  const selectedStone=spec.wall==='stone-accent'?
   [...wallRecords].sort((a,b)=>
    Math.max(b.box.max.x-b.box.min.x,b.box.max.z-b.box.min.z)-
    Math.max(a.box.max.x-a.box.min.x,a.box.max.z-a.box.min.z))[0]:null;
  for(const record of wallRecords){
   const mesh=record.mesh,original=mesh.material;
   if(originalMaterials.has(mesh))continue;
   const mat=original.clone();
   // Important: some walls carry client-approved *reversible aperture* shaders.
   mat.onBeforeCompile=original.onBeforeCompile;
   mat.customProgramCacheKey=original.customProgramCacheKey;
   const stone=spec.wall==='stone-accent'&&record===selectedStone;
   const map=stone?textureMaps.stone:spec.wall==='textured'?textureMaps.plaster:null;
   mat.color.set(stone?'#e6ddcd':color(spec.palette,stone?'cream':'wall'));
   mat.roughness=stone?.88:.93;
   mat.metalness=0;
   mat.map=map??null;
   mat.needsUpdate=true;
   mesh.material=mat;originalMaterials.set(mesh,original);tintedMaterials.push(mat);
   stats.sourceWallsFinished++;
   if(stone)stats.featureWalls++;
  }
  return wallRecords;
 }
 function addFloor(room,spec,group,stats){
  if(spec.floor==='source')return;
  const mapName={porcelain:'marble',ash:'ash',caramel:'caramel'}[spec.floor];
  const map=textureMaps[mapName];if(!map)throw Error('Stage 2 missing tile material '+mapName);
  const shape=STAGE1_PLAN_SKETCHES[room.id].vertices,b=polygonBounds(shape);
  const datum=DATUM[room.level],points=[];
  for(let x=b.minX+STEP/2;x<b.maxX-STEP/2+.001;x+=STEP){
   for(let z=b.minZ+STEP/2;z<b.maxZ-STEP/2+.001;z+=STEP){
    if(!withinRoom(x,z,shape,STEP/2+EDGE_INSET))continue;
    const floor=floorSampler(x-(origin.x||0),z-(origin.z||0),datum);
    if(!finite(floor?.y)||Math.abs(floor.y-datum)>.18)continue;
    points.push([x-(origin.x||0),floor.y+.012,z-(origin.z||0)]);
   }
  }
  if(!points.length)return;
  const geo=new THREE.BoxGeometry(TILE-JOINT,.006,TILE-JOINT);
  const mat=new THREE.MeshStandardMaterial({
   color:'#ffffff',map,roughness:spec.floor==='porcelain'?.40:.67,
   metalness:0,side:THREE.DoubleSide
  });
  const mesh=objectIsVisualOnly(new THREE.InstancedMesh(geo,mat,points.length),room.id,'floor');
  const dummy=new THREE.Object3D();
  points.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;mesh.name='STAGE2_SOURCE_SAMPLED_FLOOR_'+room.id;
  group.add(mesh);stats.tiles=points.length;
  stats.sampleFloorAreaM2=round(points.length*(TILE-JOINT)**2);
 }
 function addSkirting(room,spec,group,stats){
  if(!spec.skirting)return;
  const shape=STAGE1_PLAN_SKETCHES[room.id].vertices,datum=DATUM[room.level];
  const walls=roomWallCandidates(room);
  if(!walls.length)return; // No source wall = no invented skirting.
  const mat=new THREE.MeshStandardMaterial({
   color:color(spec.palette,'cream'),roughness:.82,metalness:0
  });
  const segs=[];
  for(let i=0;i<shape.length;i++){
   const a=shape[i],b=shape[(i+1)%shape.length];
   const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
   const n=Math.floor(len/.38);
   if(n<1)continue;
   const ux=dx/len,uz=dz/len;
   for(let j=0;j<n;j++){
    const t=(j+.5)/n,x=a[0]+dx*t,z=a[1]+dz*t;
    if(nearDoor(x,z,room.level,doors,origin))continue;
    if(!walls.some(r=>closestDistanceXZ(x,z,r,origin)<.21))continue;
    const floor=floorSampler(x-(origin.x||0),z-(origin.z||0),datum);
    if(!finite(floor?.y)||Math.abs(floor.y-datum)>.18)continue;
    segs.push({x:x-(origin.x||0),y:floor.y+BASEBOARD_HEIGHT/2+.006,
     z:z-(origin.z||0),angle:Math.atan2(-uz,ux),length:Math.min(len/n,.40)});
   }
  }
  if(!segs.length){mat.dispose();return;}
  const geo=new THREE.BoxGeometry(1,BASEBOARD_HEIGHT,BASEBOARD_DEPTH);
  const inst=objectIsVisualOnly(new THREE.InstancedMesh(geo,mat,segs.length),room.id,'skirting');
  inst.name='STAGE2_SOURCE_WALL_FLUSH_SKIRTING_'+room.id;
  inst.frustumCulled=false;
  const dummy=new THREE.Object3D();
  segs.forEach((s,i)=>{
   dummy.position.set(s.x,s.y,s.z);
   dummy.rotation.set(0,s.angle,0);dummy.scale.set(s.length,1,1);
   dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate=true;group.add(inst);stats.skirtingPieces=segs.length;
  stats.skirtingAllowanceM=BASEBOARD_DEPTH;
 }
 function addCeiling(room,spec,group,stats){
  if(spec.ceiling==='source')return;
  const shape=STAGE1_PLAN_SKETCHES[room.id].vertices,b=polygonBounds(shape);
  const datum=DATUM[room.level],panels=[],step=.85;
  for(let x=b.minX+step/2;x<b.maxX-step/2;x+=step){
   for(let z=b.minZ+step/2;z<b.maxZ-step/2;z+=step){
    if(!withinRoom(x,z,shape,step/2+.08))continue;
    const source=ceilingSampler(x-(origin.x||0),z-(origin.z||0),datum);
    if(!finite(source?.y)||source.y-datum<2.38||source.y-datum>3.65)continue;
    panels.push([x-(origin.x||0),source.y-.028,z-(origin.z||0)]);
   }
  }
  if(!panels.length)return; // If no actual overhead source slab, never fabricate one.
  const geo=new THREE.BoxGeometry(step-.006,.016,step-.006);
  const mat=new THREE.MeshStandardMaterial({
   color:color(spec.palette,'cream'),roughness:.94,metalness:0,
   side:THREE.DoubleSide
  });
  const inst=objectIsVisualOnly(new THREE.InstancedMesh(geo,mat,panels.length),room.id,'ceiling');
  inst.name='STAGE2_SOURCE_SUPPORTED_'+spec.ceiling.toUpperCase()+'_CEILING_'+room.id;
  inst.frustumCulled=false;
  const dummy=new THREE.Object3D();
  panels.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});
  inst.instanceMatrix.needsUpdate=true;
  group.add(inst);stats.ceilingPanels=panels.length;
  if(spec.ceiling==='flat')return;
  const decorative=new THREE.MeshStandardMaterial({
   color:spec.ceiling==='beamed'?color(spec.palette,'oak'):'#e7d6be',
   roughness:spec.ceiling==='beamed'?.78:.55,
   emissive:spec.ceiling==='suspended'?'#c9a371':'#000000',
   emissiveIntensity:spec.ceiling==='suspended'?.38:0
  });
  const length=spec.ceiling==='beamed'?.54:.48;
  const decoGeo=new THREE.BoxGeometry(length,.055,.035);
  const deco=objectIsVisualOnly(new THREE.InstancedMesh(decoGeo,decorative,Math.ceil(panels.length/3)),room.id,'ceiling-detail');
  deco.frustumCulled=false;deco.name='STAGE2_'+spec.ceiling.toUpperCase()+'_DETAIL_'+room.id;
  let count=0;
  for(let i=0;i<panels.length;i+=3){
   dummy.position.set(panels[i][0],panels[i][1]-.03,panels[i][2]);
   dummy.rotation.set(0,spec.ceiling==='beamed'?0:Math.PI/2,0);
   dummy.updateMatrix();deco.setMatrixAt(count++,dummy.matrix);
  }
  deco.count=count;deco.instanceMatrix.needsUpdate=true;
  group.add(deco);stats.ceilingDetails=count;
 }
 function addThresholds(room,spec,group,stats){
  if(spec.floor==='source'||!doors.length)return;
  const datum=DATUM[room.level];
  const shape=STAGE1_PLAN_SKETCHES[room.id].vertices,b=polygonBounds(shape);
  const mat=new THREE.MeshStandardMaterial({
   color:color(spec.palette,'accent'),metalness:.28,roughness:.53
  });
  const geom=new THREE.BoxGeometry(.72,.006,.036);
  for(const d of doors){
   if(d.level!==room.level||d.removedFromPlan)continue;
   const x=d.position.x+(origin.x||0),z=d.position.z+(origin.z||0);
   if(x<b.minX-.2||x>b.maxX+.2||z<b.minZ-.2||z>b.maxZ+.2)continue;
   const nearAnyEdge=shape.some((a,i)=>{
    const b=shape[(i+1)%shape.length],vx=b[0]-a[0],vz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1)));
    return Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t)<.45;
   });
   if(!nearAnyEdge)continue;
   const floor=floorSampler(d.position.x,d.position.z,datum);
   if(!finite(floor?.y)||Math.abs(floor.y-datum)>.18)continue;
   const piece=objectIsVisualOnly(new THREE.Mesh(geom,mat),room.id,'floor-threshold');
   piece.position.set(d.position.x,floor.y+.012,d.position.z);
   piece.rotation.y=d.visual?.rotation?.y??0;
   piece.name='STAGE2_OPTIONAL_SOURCE_DOOR_TRANSITION_'+d.id;
   group.add(piece);stats.thresholds++;
  }
  if(!stats.thresholds){geom.dispose();mat.dispose();}
  // This geometry/material can be shared by N thresholds. In cleanup they are
  // disposed once; redundant Three.js dispose calls on shared objects are safe.
 }
 function rebuild(){
  restoreWalls();clearGeometry();
  for(const room of STAGE2_FINISH_ROOMS){
   const spec=selections.get(room.id);
   if(Object.values(spec).every((v,k)=>k===4?!v:v==='source'))continue;
   const group=new THREE.Group();
   group.name='STAGE2_ROOM_'+room.id+'_DRAFT_NOT_APPROVED';
   group.userData={stage2:true,roomId:room.id,approved:false,
    sourceRoomPolygonVerified:false,collidable:false};
   const stats={roomId:room.id,tiles:0,sampleFloorAreaM2:0,
    sourceWallsFinished:0,featureWalls:0,skirtingPieces:0,
    skirtingAllowanceM:0,ceilingPanels:0,ceilingDetails:0,thresholds:0};
   makeWalls(room,spec,stats);
   addFloor(room,spec,group,stats);
   addSkirting(room,spec,group,stats);
   addCeiling(room,spec,group,stats);
   addThresholds(room,spec,group,stats);
   root.add(group);groups.set(room.id,group);roomStats.set(room.id,stats);
  }
  return summary();
 }
 function setRoom(roomId,patch){
  getRoom(roomId);
  const prev=selections.get(roomId);
  selections.set(roomId,validate({...prev,...patch}));
  return rebuild();
 }
 function applyProposal(){
  for(const room of STAGE2_FINISH_ROOMS)
   selections.set(room.id,validate(PROPOSALS[room.id]));
  return rebuild();
 }
 function restoreAll(){
  for(const room of STAGE2_FINISH_ROOMS)
   selections.set(room.id,selectedDefaults());
  return rebuild();
 }
 function roomStatus(roomId){
  getRoom(roomId);
  return {roomId,selection:{...selections.get(roomId)},
   counts:roomStats.get(roomId)??null,clientApproved:false,
   stage1PolygonCertified:false};
 }
 function summary(){
  const list=[...roomStats.values()];
  const total=(field)=>list.reduce((sum,r)=>sum+(r[field]||0),0);
  return {
   mappedRooms:STAGE2_FINISH_ROOMS.length,
   enhancedRooms:groups.size,
   tiles:total('tiles'),
   sampledFloorAreaM2:round(total('sampleFloorAreaM2')),
   finishedSourceWallParts:total('sourceWallsFinished'),
   skirtingPieces:total('skirtingPieces'),
   ceilingPanels:total('ceilingPanels'),
   ceilingDetails:total('ceilingDetails'),
   thresholds:total('thresholds'),
   sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true,
   finalPaletteApproved:false,roomPolygonsCertified:false,
   sourceWallMaterialsOverriddenReversibly:originalMaterials.size,
   stage:2,studioAnnePages:[3,4,5,6,7,8],
   roomSelections:Object.fromEntries([...selections].map(([id,x])=>[id,{...x}]))
  };
 }
 function updateVisibility(floor='all',walking=false,section=false){
  for(const [id,group] of groups){
   const room=getRoom(id);
   group.visible=walking||floor==='all'||floor===room.level;
   // Decorative ceiling panels must not cover a cutaway / section view.
   for(const child of group.children)
    if(child.userData?.part?.startsWith('ceiling'))
     child.visible=!section||walking;
  }
 }
 function dispose(){
  restoreWalls();clearGeometry();scene.remove(root);
 }
 return {root,setRoom,roomStatus,applyProposal,restoreAll,summary,updateVisibility,dispose};
}
