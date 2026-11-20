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
 {id:22,level:'ground',position:[111.76,-11.14],name:'Maid interior service-side door'}
]);
export const MAID_EXTERNAL_DOOR=Object.freeze({
 id:19,level:'ground',position:[108.22,-13.80]
});
const near=(d,s)=>d.id===s.id&&d.level===s.level&&
 Math.hypot(d.position.x-s.position[0],d.position.z-s.position[1])<.16;

export function implementOpenPlanMaidAccess(doorSystem,scene,origin={x:0,z:0}){
 const removed=[];
 for(const spec of OPEN_PLAN_REMOVED_DOORS){
  const door=doorSystem?.doors?.find(d=>near(d,spec));
  if(!door)throw Error('Expected source door missing or moved: '+spec.name);
  door.removedFromPlan=true;
  door.planOverrideReason=spec.name;
  door.current=door.target=1;
  door.visual.visible=false;
  removed.push({id:door.id,name:spec.name,
   sourceGuids:door.source.map(r=>r.mesh.userData.ifc?.guid),
   sourceIFCPreserved:true});
 }
 const external=doorSystem?.doors?.find(d=>near(d,MAID_EXTERNAL_DOOR));
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
  maidAccessSealBounds:[box.min.toArray(),box.max.toArray()],
  originalIFCUnmodified:true,
  userClarifiedOpenConcept:true
 };
 return {root,collider,removed,external,maidWall,summary};
}
