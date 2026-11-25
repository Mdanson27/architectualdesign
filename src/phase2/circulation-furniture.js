import * as THREE from 'three';
import {replaceSofaVisual} from './phase14abc-sofas.js';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from './stage1-plan-crosswalk.js';

/**
 * Source-backed furniture repositioning without moving or deleting IFC meshes.
 * The first-floor Family Room lies within SW-019/SW-022 and the SW-004 rear
 * wall, with the balcony sliding door on its front wall (Home(3).pdf S1).
 *
 * Original sofa FU-007 was incorrectly shifted +1.35m east by the earlier
 * access repair. That made the display intersect SW-022 and spill outside the
 * actual Family Room. Restore the furniture entirely INSIDE the room, with a
 * coffee table and a clear door approach. Do not touch other rooms.
 */
export const FAMILY_ROOM_FURNITURE_BOUNDS=Object.freeze({
 xMin:112.4,xMax:116.92,zMin:-4.31,zMax:-.15,clearance:.14
});
const CORRECTIONS=[
 {
  key:'first-floor',label:'Upstairs Family Room sofa',level:'first',
  name:'FU - 007',center:[115.02,-1.445],size:[2.15,3.3,1.3,2.0],
  target:[114.72,-3.19],room:FAMILY_ROOM_FURNITURE_BOUNDS,
  reason:'Sofa centred inside the first-floor Family Room, away from the sliding balcony door and SW-022'
 },
 {
  key:'family-coffee-table',label:'Family Room coffee table',level:'first',
  name:'FU - 008',center:[114.44,-2.08],size:[1.06,1.35,.48,.76],
  target:[114.72,-1.69],room:FAMILY_ROOM_FURNITURE_BOUNDS,
  reason:'Coffee table aligned in front of the sofa, entirely inside the Family Room'
 },
 {
  key:'ground-sitting',label:'Ground Sitting Room west-facing sofa',level:'ground',
  name:'FU - 007',center:[113.9,-6.6],size:[1.45,1.9,2.3,2.7],
  offset:[.82,0,0],
  reason:'Unchanged existing ground Sitting Room access clearance'
 }
];

function fullyWithinRoom(box,room,origin){
 const c=room.clearance;
 return box.min.x>=room.xMin-origin.x+c-1e-5 &&
  box.max.x<=room.xMax-origin.x-c+1e-5 &&
  box.min.z>=room.zMin-origin.z+c-1e-5 &&
  box.max.z<=room.zMax-origin.z-c+1e-5;
}
function boxClearance(boxA,boxB){
 const gapX=Math.max(boxA.min.x-boxB.max.x,boxB.min.x-boxA.max.x,0);
 const gapZ=Math.max(boxA.min.z-boxB.max.z,boxB.min.z-boxA.max.z,0);
 return Math.hypot(gapX,gapZ);
}
export function organizeSourceSittingFurniture(records,scene,origin={x:0,z:0},inside=()=>true){
 const root=new THREE.Group();root.name='IFC_SOURCE_SOFAS_REPOSITIONED_FOR_PLAN_CIRCULATION';
 scene.add(root);
 const sourceSet=new Set(),colliders=[],placements=[],accepted=new Map();
 for(const spec of CORRECTIONS){
  const source=records.find(r=>{
   if(!inside(r)||r.layer?.level!==spec.level||r.category!=='furniture')return false;
   if(String(r.mesh.userData.ifc?.name||'').toUpperCase().trim()!==spec.name)return false;
   const c=r.box.getCenter(new THREE.Vector3()),sz=r.box.getSize(new THREE.Vector3());
   return Math.abs(c.x+origin.x-spec.center[0])<.32 &&
     Math.abs(c.z+origin.z-spec.center[1])<.37 &&
     sz.x>spec.size[0]&&sz.x<spec.size[1]&&
     sz.z>spec.size[2]&&sz.z<spec.size[3];
  });
  if(!source){
   placements.push({id:spec.key,sourceMatched:false,
     reason:'Missing required source '+spec.name+' at expected IFC position'});
   continue;
  }
  source.mesh.updateWorldMatrix(true,false);
  const preview=source.mesh.clone();
  preview.matrix.copy(source.mesh.matrixWorld);
  preview.matrix.decompose(preview.position,preview.quaternion,preview.scale);
  const originalCentre=source.box.getCenter(new THREE.Vector3());
  const delta=spec.target
   ?new THREE.Vector3(spec.target[0]-origin.x-originalCentre.x,0,
      spec.target[1]-origin.z-originalCentre.z)
   :new THREE.Vector3(...spec.offset);
  preview.position.add(delta);
  preview.name='REPOSITIONED_IFC_FURNITURE_'+spec.key;
  preview.userData={...preview.userData,circulationPreview:true,
    originalGUID:source.mesh.userData.ifc?.guid,sourceRegion:spec.key};
  root.add(preview);
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(preview);
  const insideRoom=spec.room?fullyWithinRoom(box,spec.room,origin):true;
  if(!insideRoom){
   // Never display furniture outside the room just to make a doorway pass.
   root.remove(preview);
   placements.push({id:spec.key,sourceMatched:true,placed:false,
     sourceGUID:source.mesh.userData.ifc?.guid,
     reason:'Rejected: proposed furniture footprint protrudes beyond its actual room'});
   continue;
  }
  sourceSet.add(source);
  colliders.push({mesh:preview,box,category:'furniture',layer:source.layer});
  accepted.set(spec.key,{box,preview,source});
  placements.push({id:spec.key,label:spec.label,sourceMatched:true,placed:true,
    sourceGUID:source.mesh.userData.ifc?.guid,
    offsetMetres:delta.toArray(),originalUnmodified:true,
    previewFootprint:box.getSize(new THREE.Vector3()).toArray(),
    previewCentre:box.getCenter(new THREE.Vector3()).add(
      new THREE.Vector3(origin.x,0,origin.z)).toArray(),
    insideRoom,roomBounds:spec.room??null,rationale:spec.reason});
 }
 const sofa=accepted.get('first-floor'),table=accepted.get('family-coffee-table');
 const coffeeTableGapMetres=sofa&&table?
   +boxClearance(sofa.box,table.box).toFixed(3):null;
 // An actual room arrangement cannot have a coffee table intersecting a sofa.
 if(sofa&&table&&sofa.box.intersectsBox(table.box)){
  root.remove(table.preview);
  sourceSet.delete(table.source);
  const i=colliders.findIndex(r=>r.mesh===table.preview);
  if(i>=0)colliders.splice(i,1);
  const row=placements.find(p=>p.id==='family-coffee-table');
  Object.assign(row,{placed:false,insideRoom:false,reason:'Rejected overlapping furniture position'});
 }
 const upstairs=placements.find(p=>p.id==='first-floor');
 // Replace the original rendered sofa geometry, retaining the source
 // correction and collision records. Cover additional unambiguous FU-007
 // sofas fully inside the two plan-backed living spaces.
 const replacements=[],unresolvedSofas=[];
 const ground=accepted.get('ground-sitting');
 const family=accepted.get('first-floor');
 const groundTarget=ground?ground.box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(2,0,0)):null;
 const familyTarget=table?.box.getCenter(new THREE.Vector3())??(family?family.box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0,0,2)):null);
 const replace=(entry,target)=>{
  const result=replaceSofaVisual(entry.preview,entry.box,target,root);
  if(!result)return false;
  const {model,...evidence}=result;replacements.push(evidence);return true;
 };
 if(ground&&!replace(ground,groundTarget))unresolvedSofas.push({id:'ground-sitting',reason:'Replacement envelope rejected'});
 if(family&&!replace(family,familyTarget))unresolvedSofas.push({id:'first-floor',reason:'Replacement envelope rejected'});
 for(const source of records){
  if(sourceSet.has(source)||!inside(source)||source.category!=='furniture'||String(source.mesh.userData.ifc?.name||'').trim().toUpperCase()!=='FU - 007')continue;
  const id=source.layer.level==='ground'?'G-SITTING':source.layer.level==='first'?'F-FAMILY':null;
  if(!id)continue;
  const poly=STAGE1_PLAN_SKETCHES[id].vertices,b=source.box,d=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
  if(!insidePolygon([c.x+origin.x,c.z+origin.z],poly))continue;
  const corners=[b.min.x,b.max.x].flatMap(x=>[b.min.z,b.max.z].map(z=>[x+origin.x,z+origin.z]));
  if(!corners.every(p=>insidePolygon(p,poly))||Math.max(d.x,d.z)<1.1||Math.min(d.x,d.z)<.65||d.y<.4||d.y>1.35||
    colliders.some(r=>r.layer.level===source.layer.level&&r.box.clone().expandByScalar(.025).intersectsBox(b))){
   unresolvedSofas.push({guid:source.mesh.userData.ifc?.guid,room:id,reason:'Unverified or overlapping source footprint'});continue;
  }
  source.mesh.updateWorldMatrix(true,false);
  const preview=source.mesh.clone();preview.matrix.copy(source.mesh.matrixWorld);preview.matrix.decompose(preview.position,preview.quaternion,preview.scale);
  preview.name='REPOSITIONED_IFC_FURNITURE_additional-'+source.mesh.userData.ifc?.guid;
  preview.userData={...preview.userData,circulationPreview:true,sourceRegion:'additional-'+source.mesh.userData.ifc?.guid,originalGUID:source.mesh.userData.ifc?.guid};
  root.add(preview);root.updateMatrixWorld(true);
  const target=id==='G-SITTING'?new THREE.Vector3(116.7,c.y,-7.15).sub(new THREE.Vector3(origin.x,0,origin.z)):familyTarget;
  if(!target||!replace({preview,box:b},target)){root.remove(preview);unresolvedSofas.push({guid:source.mesh.userData.ifc?.guid,room:id,reason:'Replacement envelope rejected'});continue;}
  sourceSet.add(source);colliders.push({mesh:preview,box:b.clone(),category:'furniture',layer:source.layer});
 }
 const roomArrangementValid=upstairs?.placed===true &&
   (placements.find(p=>p.id==='family-coffee-table')?.placed===true) &&
   coffeeTableGapMetres>=.30;
 return {root,sourceSet,colliders,placements,
  summary:{sourceMatched:upstairs?.sourceMatched??false,
   sourceGUID:upstairs?.sourceGUID,offsetMetres:upstairs?.offsetMetres,
   originalUnmodified:true,previewFootprint:upstairs?.previewFootprint,
   rationale:upstairs?.rationale,
   roomArrangementValid,coffeeTableGapMetres,
   familyRoomSofa:upstairs??null,
   familyRoomCoffeeTable:placements.find(p=>p.id==='family-coffee-table')??null,
   groundSittingRoom:placements.find(p=>p.id==='ground-sitting')??null,
   presentations:placements,sofaReplacements:replacements,unresolvedSofas}};
}
