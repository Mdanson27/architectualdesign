import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createPlanDiningFurniture} from '../src/phase2/dining-furnishings.js';
import {createStage4LivingDining,STAGE4_BRIEF}
 from '../src/phase2/stage4-living-dining.js';
import {activateIntegratedHouseDesign}
 from '../src/phase2/production-design.js';

const origin=new THREE.Vector3(100,0,-12),scene=new THREE.Scene();
const dining=createPlanDiningFurniture(scene,origin,[]);
const source=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.4),
 new THREE.MeshStandardMaterial({color:0xb1ada8}));
source.userData.ifc={guid:'original-source',name:'FU - SOURCE'};
source.position.set(8,.35,6);source.updateWorldMatrix(true);
scene.add(source);
const sourceBox=new THREE.Box3().setFromObject(source);
const sourceRec={mesh:source,box:sourceBox.clone(),category:'furniture',layer:{level:'ground'}};
function moved(name,level,lo,hi){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,.8,1));
 mesh.name='REPOSITIONED_IFC_FURNITURE_'+name;
 return {mesh,category:'furniture',layer:{level},box:new THREE.Box3(
  new THREE.Vector3(lo[0]-origin.x,lo[1],lo[2]-origin.z),
  new THREE.Vector3(hi[0]-origin.x,hi[1],hi[2]-origin.z)
 )};
}
const sofas={
 colliders:[
  moved('ground-sitting','ground',[113.9,0,-7.85],[115.55,.88,-5.35]),
  moved('first-floor','first',[113.7,3.3,-4.08],[115.75,4.23,-2.45]),
  moved('family-coffee-table','first',[114.22,3.3,-2.22],[115.28,3.82,-1.66])
 ],sourceSet:new Set()
};
const cheek=new THREE.Mesh(new THREE.BoxGeometry(.225,2.55,.50));
cheek.name='MAIN_DOOR_RIGHT_ENCLOSING_CHEEK';
cheek.position.set(117.014-origin.x,1.275,-2.37-origin.z);
scene.add(cheek);cheek.updateWorldMatrix(true);
const mainDoorEnclosure={
 summary:{mainDoubleDoorId:27,doorwayUnblocked:true},
 visuals:[cheek]
};
const originalGeo=source.geometry;
const originalMat=source.material;
const originalPos=source.position.clone();
const calls=[];
const unit=createStage4LivingDining({
 scene,origin,records:[sourceRec],sofaSystem:sofas,diningSystem:dining,
 mainDoorEnclosure,floorSampler:(x,z,datum)=>{
  calls.push([x,z,datum]);return {y:datum};
 }
});
assert(STAGE4_BRIEF.pages.includes(13)&&STAGE4_BRIEF.pages.includes(21));
const initial=unit.status();
assert(initial.productionIntegrated&&!initial.previewActivationRequired);
assert(initial.originalIFCGeometryPreserved);
assert(initial.sourceIFCCollidersPreserved);
assert.equal(initial.diningChairsTotal,6);
assert.equal(initial.openPlanWallsCreated,0);
assert.equal(initial.interiorDoorsCreated,0);
assert.equal(initial.pieces.diningChairsImproved,6);
assert.equal(initial.pieces.diningTabletop,1);
assert.equal(initial.pieces.diningPlaceSettings,6);
assert.equal(initial.pieces.diningRug,1);
assert.equal(initial.pieces.sittingCoffeeTable,1);
assert.equal(initial.pieces.groundRug,1);
assert.equal(initial.pieces.sittingChairs,2);
assert.equal(initial.pieces.firstFloorRug,1);
assert.equal(initial.pieces.foyerMirror,1);
assert(initial.pieces.accentLights>=2);
assert(unit.colliders.length>=3);
assert(unit.groups['G-SITTING'].visible);
assert(unit.groups['G-DINING'].visible);
assert(unit.groups['F-FAMILY'].visible);
assert(unit.groups['ENTRY'].visible);
assert(unit.root.children.length===4);
for(const r of unit.colliders)assert.equal(r.category,'furniture');
unit.root.traverse(o=>{
 if(o.isMesh){
  assert(o.userData.stage4===true);
  assert.equal(o.userData.architectApproved,false);
  assert.equal(o.userData.sourceGeometryUnchanged,true);
 }
});
assert.strictEqual(source.geometry,originalGeo);
assert.strictEqual(source.material,originalMat);
assert(source.position.equals(originalPos));
assert(sourceBox.equals(sourceRec.box));
assert(calls.some(x=>x[2]===0)&&calls.some(x=>x[2]===3.3));
const first=unit.update({floor:'first',walking:false,night:true,
 enabled:true,lightLayers:{accent:true},furnitureVisible:true});
assert.deepEqual(first.visibleRooms,['F-FAMILY']);
assert(unit.update({floor:'ground'}).visibleRooms.includes('G-SITTING'));
assert(!unit.update({furnitureVisible:false}).visibleRooms.length);
assert(unit.update({furnitureVisible:true,floor:'all'}).visibleRooms.length===4);
assert(unit.update({floor:'ground',walking:true}).visibleRooms.length===4,
 'first-person walking must not hide the adjoining decorated zones');
const living=activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
   sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceWorktopVerified:true,
   sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,
   baseCabinetPanels:6,appliancePieces:10})},
 livingDining:unit
});
assert.equal(living.stage4LivingDiningIntegrated,true);
assert(living.stage4RoomZones.includes('ENTRY'));
assert.equal(living.stage4FurniturePieces.diningChairsImproved,6);
assert.equal(living.finalClientSignoff,false);
const broken={status:()=>({...initial,openPlanWallsCreated:1})};
assert.throws(()=>activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
   sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceGeometryUnmodified:true,sourceCollidersUnmodified:true})},
 livingDining:broken
}),/must furnish/);
const chairs=dining.root.children.filter(x=>/^DINING_CHAIR_[1-6]$/.test(x.name));
assert(chairs.every(c=>c.children.some(o=>o.userData.stage4)));
unit.dispose();
assert(!scene.children.includes(unit.root));
assert(chairs.every(c=>c.children.every(o=>!o.userData.stage4)));
assert.strictEqual(source.geometry,originalGeo);
assert.strictEqual(source.material,originalMat);
// Missing source sofa, unsupported floor and unverified entrance cannot
// manufacture a fictional room; source dining still survives.
const empty=createStage4LivingDining({scene,origin,records:[],sofaSystem:{
 colliders:[],sourceSet:new Set()},diningSystem:dining,mainDoorEnclosure:null,
 floorSampler:()=>null});
const fallback=empty.status();
assert.equal(fallback.pieces.foyerMirror,0);
assert.equal(fallback.pieces.sittingCoffeeTable,0);
assert.equal(fallback.pieces.groundRug,0);
assert.equal(fallback.pieces.diningRug,0);
assert.equal(fallback.pieces.diningChairsImproved,6);
empty.dispose();
const sourceScript=fs.readFileSync('src/phase2/actual-house.js','utf8');
assert(sourceScript.includes('createStage4LivingDining({'));
assert(sourceScript.includes('state.solids.push(...state.stage4LivingDining.colliders)'));
assert(sourceScript.includes('livingDining:state.stage4LivingDining'));
const schedule=JSON.parse(fs.readFileSync('architecture/stage4-living-dining.json','utf8'));
assert.equal(schedule.status,'production-integrated-visual-design-pending-client-approval');
assert.equal(schedule.newInternalPartitionWalls,0);
assert.equal(schedule.entryOttomanDeferredUntilClearance,true);
console.log('STAGE4_LIVING_DINING_PRODUCTION_VERIFIED',JSON.stringify({
 sittingCoffee:initial.pieces.sittingCoffeeTable,
 chairs:initial.pieces.sittingChairs,
 diningSixSeats:initial.diningChairsTotal,
 diningChairsEnriched:initial.pieces.diningChairsImproved,
 rugs:initial.pieces.diningRug+initial.pieces.groundRug+initial.pieces.firstFloorRug,
 foyerMirror:initial.pieces.foyerMirror,
 sourceGeometryUntouched:true,allRoomsDefaultOn:true
}));
