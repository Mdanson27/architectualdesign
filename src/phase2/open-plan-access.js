import * as THREE from 'three';

/**
 * User-approved ground-floor correction: spaces are OPEN plan and the maid
 * has only external / balcony access. Do not mutate the imported IFC source.
 *
 * The source catalog contains 29 provisional door groups.  Door 25 is a
 * mistakenly interpreted Sitting/Dining divider. Door 22 is a service-side
 * entrance adjoining the maid's corner; preserve exterior door 19.
 * Door ids are validated against world position before any suppression.
 */
export const OPEN_PLAN_REMOVED_DOORS=Object.freeze([
 {id:25,level:'ground',position:[114.635,-4.39],name:'Sitting to Dining pseudo-door'},
 {id:22,level:'ground',position:[111.76,-11.14],name:'Maid interior service-side door'},
 {id:21,level:'ground',position:[111.681,-5.309],name:'Stair to Kitchen partition door - fully open'}
]);
export const MAID_EXTERNAL_DOOR=Object.freeze({
 id:19,level:'ground',position:[108.22,-13.80]
});
const near=(d,s,origin)=>d.id===s.id&&d.level===s.level&&
 Math.hypot(d.position.x+origin.x-s.position[0],d.position.z+origin.z-s.position[1])<.16;

export function implementOpenPlanMaidAccess(doorSystem,scene,origin={x:0,z:0}){
 const removed=[];
 for(const spec of OPEN_PLAN_REMOVED_DOORS){
  const door=doorSystem?.doors?.find(d=>near(d,spec,origin));
  if(!door)throw Error('Expected source door missing or moved: '+spec.name);
  door.removedFromPlan=true;
  door.planOverrideReason=spec.name;
  door.current=door.target=1;
  door.visual.visible=false;
  removed.push({id:door.id,name:spec.name,
   sourceGuids:door.source.map(r=>r.mesh.userData.ifc?.guid),
   sourceIFCPreserved:true});
 }
 const external=doorSystem?.doors?.find(d=>near(d,MAID_EXTERNAL_DOOR,origin));
 if(!external)throw Error('Maid exterior/balcony access not present; refuse to seal the interior');
 if(external.removedFromPlan)throw Error('Maid balcony-side door must remain functional');

 const root=new THREE.Group();
 root.name='USER_CORRECTED_MAID_ACCESS';
 scene.add(root);
 const wallMaterial=new THREE.MeshStandardMaterial({color:0xe8dfd2,
   metalness:0,roughness:.82,side:THREE.DoubleSide});
 // The existing source wall contains a doorway-shaped gap at SW-008.
 // Fill ONLY that former internal opening; it is NOT an exterior wall.
 const maidWall=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.55,.23),wallMaterial);
 maidWall.position.set(111.76-origin.x,1.275,-11.14-origin.z);
 maidWall.name='MAID_ROOM_INTERIOR_ACCESS_SOLID_WALL';
 maidWall.userData.ifc={name:'CLIENT_CORRECTED_MAID_INTERNAL_SEAL',
  guid:'VIEWER-MAID-INTERNAL-CLOSURE',storey:'ground'};
 maidWall.userData.isMaidRoomSeal=true;
 maidWall.receiveShadow=true;
 root.add(maidWall);
 root.updateWorldMatrix(true);
 const box=new THREE.Box3().setFromObject(maidWall);
 const collider={mesh:maidWall,box,category:'walls',
  layer:{level:'ground',category:'walls',name:'Client-corrected maid wall'}};
 const summary={
  removedFromInteractiveCatalog:removed,
  activeDoorCount:doorSystem.doors.filter(d=>!d.removedFromPlan).length,
  sourceDoorCatalogCount:doorSystem.doors.length,
  maidInteriorDoorId:22,maidInteriorSealed:true,
  maidBalconyEntranceId:external.id,
  maidBalconyEntranceFunctional:true,
  maidAccessSealPosition:[111.76,1.275,-11.14],
  kitchenStairDoorId:21,kitchenStairDoorRemoved:removed.some(r=>r.id===21),
  maidAccessSealBounds:[box.min.toArray(),box.max.toArray()],
  originalIFCUnmodified:true,
  userClarifiedOpenConcept:true
 };
 return {root,collider,removed,external,maidWall,summary};
}


/**
 * Restore the wall CHEEKS and lintel beside the client's main double door.
 * SW-022 is the source 200 mm wall x=116.916..117.116. The door is DOOR 27
 * at world (117.014,-3.496), with window WD-007 further along the same wall.
 * Never insert a full wall across this door, the nearby real window, or
 * the approved Sitting/Dining open connection. Viewer-only local plaster.
 */
export function createMainEntranceWallFinish(doorSystem,records,scene,origin={x:0,z:0}){
 const d=doorSystem?.doors?.find(v=>v.id===27&&v.level==='ground');
 if(!d||d.alongX||Math.abs(d.position.x+origin.x-117.014)>.08||
    Math.abs(d.position.z+origin.z+3.496)>.08)
  throw Error('Main entrance door 27 source location not confirmed');
 const wall=records.find(r=>r.category==='walls'&&r.layer?.level==='ground'&&
  r.mesh.userData.ifc?.guid==='2axYJRzojAfxQ3W1Phspg0');
 if(!wall)throw Error('Main entrance SW-022 enclosing wall missing');
 const root=new THREE.Group();
 root.name='CLIENT_MAIN_DOOR_ENCLOSED_WALL_FINISH';
 scene.add(root);
 const plaster=new THREE.MeshStandardMaterial({
  color:0xe6e0d5,roughness:.83,metalness:0,side:THREE.DoubleSide
 });
 const wallX=d.position.x, doorMin=d.position.z-d.width/2,
  doorMax=d.position.z+d.width/2,doorTop=d.groundY+d.height;
 const seals=[
  {name:'MAIN_DOOR_LEFT_ENCLOSING_CHEEK',z0:wall.box.min.z,z1:doorMin-.10,
   y0:0,y1:doorTop+.06},
  {name:'MAIN_DOOR_RIGHT_ENCLOSING_CHEEK',z0:doorMax+.10,z1:-2.145-origin.z,
   y0:0,y1:doorTop+.06},
  {name:'MAIN_DOOR_SOLID_OVERHEAD_LINTEL',z0:doorMin-.10,z1:doorMax+.10,
   y0:doorTop+.075,y1:3.30}
 ];
 const colliders=[],visuals=[];
 for(const part of seals){
  const length=part.z1-part.z0,height=part.y1-part.y0;
  if(length<=.06||height<=.12)throw Error('Door wall closure has invalid bounds: '+part.name);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.225,height,length),plaster);
  mesh.name=part.name;
  mesh.position.set(wallX,(part.y0+part.y1)/2,(part.z0+part.z1)/2);
  root.add(mesh);visuals.push(mesh);
 }
 root.updateWorldMatrix(true);
 for(const mesh of visuals.slice(0,2)){
  colliders.push({mesh,box:new THREE.Box3().setFromObject(mesh),
   category:'walls',layer:{level:'ground',category:'walls',name:'Verified main entrance wall cheek'}});
 }
 const summary={mainDoubleDoorId:27,sourceWallGuid:wall.mesh.userData.ifc?.guid,
  sideWallPanels:2,overheadClosure:true,doorwayUnblocked:true,
  sourceWindowWD007Preserved:true,originalIFCUnmodified:true};
 return {root,visuals,colliders,summary};
}
