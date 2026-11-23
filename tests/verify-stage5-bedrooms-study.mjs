import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STAGE5_SPEC,createStage5BedroomsStudy}
 from '../src/phase2/stage5-bedroom-study.js';
import {activateIntegratedHouseDesign} from '../src/phase2/production-design.js';
import fs from 'node:fs';

const scene=new THREE.Scene(),records=[];
const origin=new THREE.Vector3();
function source(name,level,kind,c,size){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),
  new THREE.MeshStandardMaterial({color:0xaaa099}));
 m.position.set(...c);m.updateWorldMatrix(true);
 m.userData.ifc={name,guid:'IFC-'+records.length};
 scene.add(m);
 const r={mesh:m,box:new THREE.Box3().setFromObject(m),
  category:kind,layer:{level}};
 records.push(r);return r;
}
const walls=[
 source('SW - BED1','ground','walls',[117.7,1.65,-11.92],[.20,3.30,2.16]),
 source('SW - MASTER','first','walls',[118.65,4.95,-7.19],[.20,3.30,2.27]),
 source('SW - BED2','first','walls',[110.74,4.95,-12.64],[.20,3.30,2.14]),
 source('SW - BED3','first','walls',[111.66,4.95,-1.76],[.20,3.30,2.16]),
];
const sourceBeds=[
 source('FU - 010','ground','furniture',[114.75,.40,-11.92],[1.52,.8,2]),
 source('FU - 010','first','furniture',[115.45,3.70,-7.45],[1.62,.8,2]),
 source('FU - 010','first','furniture',[108.55,3.70,-12.64],[1.52,.8,2]),
 source('FU - 010','first','furniture',[109.55,3.70,-1.75],[1.42,.8,1.96]),
];
const bedParent=new THREE.Group();scene.add(bedParent);
const bedSpecs=[
 ['ground',114.75,-11.92],
 ['first',115.45,-7.45],
 ['first',108.55,-12.64],
 ['first',109.55,-1.75],
];
const beds=bedSpecs.map(([level,x,z],i)=>{
 const g=new THREE.Group();g.name='REFERENCE_STYLED_BED_'+i;
 g.position.set(x,level==='first'?3.3:0,z);
 g.userData={sourceGuid:sourceBeds[i].mesh.userData.ifc.guid,
  footprint_m:[1.52,1.90],floor:level};
 bedParent.add(g);return g;
});
const bedSystem={group:bedParent,visualBeds:beds,sources:sourceBeds,
 collisionBoxes:beds.map(b=>new THREE.Box3(
  new THREE.Vector3(b.position.x-.76,b.position.y+.15,b.position.z-.95),
  new THREE.Vector3(b.position.x+.76,b.position.y+.97,b.position.z+.95)
 ))};
const doorSystem={doors:[
 {id:17,level:'first',removedFromPlan:false,
  position:new THREE.Vector3(114.8,3.3,-9.8)}
]};
const baseline=records.map(r=>({mesh:r.mesh,
 position:r.mesh.position.clone(),scale:r.mesh.scale.clone(),
 geo:r.mesh.geometry,material:r.mesh.material}));
const probes=[];
const unit=createStage5BedroomsStudy({
 scene,origin,records,bedSystem,doorSystem,
 floorSampler:(x,z,datum)=>{probes.push([x,z,datum]);return {y:datum}}
});
let status=unit.status();
assert.equal(STAGE5_SPEC.pages.length,5);
assert.equal(STAGE5_SPEC.masterWalkInPolygonCertified,false);
assert(status.productionIntegrated&&!status.previewActivationRequired);
assert(status.originalIFCGeometryPreserved);
assert(status.sourceBedCount===4);
assert(status.sourceSupportedBedsFinished===4);
assert(status.headboardMoodLightStrips===4);
assert(status.integratedBedsideShelves===8);
assert(status.bedroomAccentArt===4);
assert(status.wardrobePanels>=4,'at least two measured-room wardrobe fronts');
assert(status.wardrobeRooms>=2);
assert(status.readingDesks===1);
assert(status.readingShelves===3);
assert(status.roomPolygonsCertified===undefined);
assert(status.bedroomRoomPolygonsCertified===false);
assert(status.walkInClosetGeometryInvented===false);
assert(status.maidProvisionalUntouched);
assert(status.addedPartitionWalls===0&&status.addedDoors===0);
assert(unit.colliders.length===1,'desk remains an obstacle, decorative lights do not');
assert(probes.some(x=>x[2]===0)&&probes.some(x=>x[2]===3.3));
for(const b of beds)assert(b.children.some(c=>c.name.startsWith('STAGE5_')));
unit.root.traverse(o=>{
 if(o.isMesh){
  assert(o.userData.stage5);
  assert.equal(o.userData.collidable,false);
  assert.equal(o.userData.architectCertified,false);
 }
});
let on=unit.update({floor:'ground',walking:false,furnitureVisible:true});
assert(status.originalIFCGeometryPreserved);
assert(unit.groups['G-BEDROOM'].visible);
assert(!unit.groups['F-READING'].visible);
on=unit.update({floor:'first',walking:false});
assert(!unit.groups['G-BEDROOM'].visible);
assert(unit.groups['F-READING'].visible);
on=unit.update({floor:'all',night:true,enabled:true,
 lightLayers:{accent:true,task:true}});
assert(unit.groups['G-BEDROOM'].visible);
assert(unit.groups['F-READING'].visible);
assert(unit.update({furnitureVisible:false}).originalIFCGeometryPreserved);
assert(!unit.root.visible);
unit.update({furnitureVisible:true,floor:'all'});
assert(unit.root.visible);
const production=activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
  sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceWorktopVerified:true,
  sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,
  baseCabinetPanels:6,appliancePieces:10})},
 livingDining:{status:()=>({productionIntegrated:true,previewActivationRequired:false,
  originalIFCGeometryPreserved:true,sourceIFCCollidersPreserved:true,
  diningChairsTotal:6,openPlanWallsCreated:0,interiorDoorsCreated:0})},
 bedroomsStudy:unit
});
assert.equal(production.stage5BedroomsStudyIntegrated,true);
assert.equal(production.stage5FinishedBeds,4);
assert(production.stage5WardrobeRooms>=2);
assert.equal(production.stage5StudyDesks,1);
assert.equal(production.finalClientSignoff,false);
const blocked=activateIntegratedHouseDesign.bind(null,{
 surfaces:{applyProposal:()=>({enhancedRooms:9,
  sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({sourceGeometryUnmodified:true,sourceCollidersUnmodified:true})},
 bedroomsStudy:{status:()=>({...status,addedPartitionWalls:1})}
});
assert.throws(blocked,/Stage 5/);
for(const r of baseline){
 assert(r.mesh.geometry===r.geo&&r.mesh.material===r.material);
 assert(r.mesh.position.equals(r.position)&&r.mesh.scale.equals(r.scale));
}
const initialBedChildren=beds.map(b=>b.children.length);
unit.dispose();
assert(!scene.children.includes(unit.root));
assert(beds.every(b=>b.children.length===0));
for(const r of baseline)assert(r.mesh.geometry===r.geo);
// Failed source-floor checks must withhold bed rug and desk rather than
// creating floating furniture, false walk-in closets or new walls.
const missing=createStage5BedroomsStudy({
 scene,origin,records:[],bedSystem:{group:new THREE.Group(),
 visualBeds:[],sources:[],collisionBoxes:[]},
 floorSampler:()=>null
});
const empty=missing.status();
assert.equal(empty.sourceSupportedBedsFinished,0);
assert.equal(empty.readingDesks,0);
assert.equal(empty.wardrobePanels,0);
assert(empty.walkInClosetGeometryInvented===false);
missing.dispose();
const js=fs.readFileSync('src/phase2/actual-house.js','utf8');
assert(js.includes('state.stage5BedroomsStudy=createStage5BedroomsStudy('));
assert(js.includes('state.solids.push(...state.stage5BedroomsStudy.colliders)'));
assert(js.includes('bedroomsStudy:state.stage5BedroomsStudy'));
const plan=JSON.parse(fs.readFileSync('architecture/stage5-bedrooms-study.json','utf8'));
assert.equal(plan.status,'source-anchored-production-design-not-client-approved');
assert.equal(plan.additionalPartitionWalls,0);
console.log('STAGE5_BEDROOMS_STUDY_PRODUCTION_VERIFIED',JSON.stringify({
 styledBeds:status.sourceSupportedBedsFinished,bedLights:status.headboardMoodLightStrips,
 bedsideShelves:status.integratedBedsideShelves,
 wardrobePanels:status.wardrobePanels,wardrobeRooms:status.wardrobeRooms,
 studyDesks:status.readingDesks,studyShelves:status.readingShelves,
 walkInClosetsInvented:false,sourceGeometryUntouched:true,productionAutoOn:true
}));
