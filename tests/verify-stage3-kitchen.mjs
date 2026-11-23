import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createStage3KitchenSystem,findSourceKitchenWorktop,STAGE3_KITCHEN_REQUIREMENTS}
 from '../src/phase2/stage3-kitchen-system.js';

const script=fs.readFileSync('src/phase2/actual-house.js','utf8');
const html=fs.readFileSync('actual-house.html','utf8');
const schedule=JSON.parse(fs.readFileSync('architecture/stage3-kitchen-cabinetry.json','utf8'));
assert.equal(schedule.schema,'autominds.stage3-kitchen-cabinetry.v1');
assert.equal(schedule.status,'source-anchored-visual-proposal-not-approved');
assert.equal(schedule.rendering.syntheticWalls,0);
assert.equal(schedule.preservation.kitchenDiningSittingOpen,true);
assert.equal(schedule.approvals.pantryRoomPolygon,false);
assert.deepEqual(STAGE3_KITCHEN_REQUIREMENTS.pages,[26,27,28,29,30,31,32,41]);
assert.equal(STAGE3_KITCHEN_REQUIREMENTS.pantryRoomCertified,false);
for(const id of ['stage3Preview','stage3Focus','stage3Restore','stage3OpenStorage',
 'stage3Cabinetry','stage3Appliances','stage3Storage','stage3TaskLighting','stage3Status'])
 assert(html.includes('id="'+id+'"'),'missing kitchen control '+id);
for(const anchor of ['createStage3KitchenSystem','stage3KitchenPreview',
 'stage3KitchenRestore','stage3KitchenOptions','stage3KitchenStorage'])
 assert(script.includes(anchor),'viewer missing integration '+anchor);

function sourceSlab(name,guid,lo,hi,visible=true){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0xe6dfd5}));
 mesh.visible=visible;mesh.userData.ifc={name,guid};
 return {mesh,box:new THREE.Box3(new THREE.Vector3(...lo),
  new THREE.Vector3(...hi)),category:'slabs',layer:{level:'ground'}};
}
const real=sourceSlab('SLA - 002','source-real-kitchen-counter',
 [107.85,.81,-1.49],[111.94,.84,.52]);
const obsolete=sourceSlab('SLA - 002','removed-kitchen-divider',
 [111.94,-.03,-2.23],[111.97,.84,.51],false);
obsolete.mesh.userData.clientKitchenDiningDividerRemoved=true;
const first=sourceSlab('SLA - 002','not-a-ground-counter',
 [107.85,3.5,-1.49],[111.94,3.54,.52]);
const geometry=real.mesh.geometry,material=real.mesh.material;
const position=[...geometry.attributes.position.array];
const records=[obsolete,real,first];
assert.equal(findSourceKitchenWorktop(records).record,real);
const scene=new THREE.Scene();
const floorProbes=[];
const system=createStage3KitchenSystem({
 scene,origin:new THREE.Vector3(),records,
 floorSampler:(x,z,level)=>{floorProbes.push([x,z,level]);return {y:0};}
});
assert(scene.children.includes(system.root));
const initial=system.status();
assert.equal(initial.enabled,false);
assert.equal(initial.visible,false);
assert(initial.sourceWorktopVerified);
assert.equal(initial.sourceWorktopGuid,'source-real-kitchen-counter');
assert(initial.baseCabinetPanels>=3);
assert(initial.appliancePieces>=5);
assert(initial.storageFixtures>=1);
assert(initial.ledStrips>=1);
assert.equal(initial.pantryShelvesCreated,0);
assert.equal(initial.separatePantryFootprintCertified,false);
assert.equal(initial.clearanceMeasuredAndApproved,false);
assert.equal(initial.workTriangleMeasuredAndApproved,false);
assert(initial.sourceGeometryUnmodified);
assert(floorProbes.length>=3);
let report=system.enable(true);
assert.equal(report.enabled,true);
assert.equal(report.visible,true);
assert(system.root.children.every(g=>g.children.every(o=>!o.userData?.collidable)));
system.root.traverse(o=>{
 if(o.isMesh){
  assert.equal(o.userData.collidable,false,'Stage 3 geometry must never block walking');
  assert.equal(o.userData.previewOnly,true);
 }
});
assert.deepEqual(position,[...geometry.attributes.position.array]);
assert.strictEqual(real.mesh.geometry,geometry);
assert.strictEqual(real.mesh.material,material);
assert.equal(real.mesh.visible,true);
assert.equal(obsolete.mesh.visible,false,'obsolete kitchen divider must stay hidden');
system.setOptions({appliances:false,storage:false,lighting:false});
assert.equal(system.groups.appliances.visible,false);
assert.equal(system.groups.storage.visible,false);
assert.equal(system.groups.lighting.visible,false);
assert.equal(system.groups.cabinetry.visible,true);
assert.throws(()=>system.setOptions({pantry:true}),/Invalid Stage 3/);
assert.throws(()=>system.setOptions({storage:'yes'}),/Invalid Stage 3/);
system.setOptions({appliances:true,storage:true,lighting:true});
const drawer=system.groups.storage.children.find(o=>o.name.startsWith('STAGE3_SOFT_CLOSE_PULL_OUT'));
assert(drawer,'source-backed storage drawer required');
const old=drawer.position.clone();
system.openStorage(true);system.update(.10);
assert(!drawer.position.equals(old),'drawers must visually slide');
assert.equal(system.status().storageOpen,true);
system.updateVisibility('first',false,true,true,true);
assert.equal(system.root.visible,false,'first floor must not show ground cabinets');
system.updateVisibility('ground',false,true,true,true);
assert.equal(system.root.visible,true);
system.updateVisibility('ground',false,false,true,true);
assert.equal(system.root.visible,false,'furniture visibility toggle must be respected');
system.updateVisibility('ground',false,true,false,false);
assert.equal(system.groups.lighting.userData.light.intensity,0,'independent task and house lights must be respected');
system.updateVisibility('ground',false,true,true,true);
assert(system.groups.lighting.userData.light.intensity>0);
system.openStorage(false);system.enable(false);
assert.equal(system.root.visible,false);
assert.equal(system.status().sourceGeometryUnmodified,true);
system.dispose();
assert(!scene.children.includes(system.root));
assert.strictEqual(real.mesh.material,material);
assert.strictEqual(real.mesh.geometry,geometry);

// Missing, hidden, or incorrectly elevated source MUST NOT create kitchens.
const unknown=createStage3KitchenSystem({scene:new THREE.Scene(),records:[],
 floorSampler:()=>({y:0})});
assert.equal(unknown.enable(true).enabled,false);
assert.equal(unknown.status().baseCabinetPanels,0);
assert.equal(unknown.status().appliancePieces,0);
unknown.dispose();
const noFloor=createStage3KitchenSystem({scene:new THREE.Scene(),records:[real],
 floorSampler:()=>null});
assert.equal(noFloor.enable(true).enabled,false);
assert.equal(noFloor.status().baseCabinetPanels,0);
noFloor.dispose();
assert.equal(findSourceKitchenWorktop([obsolete,first]),null);
console.log('STAGE3_KITCHEN_SOURCE_QA_PASSED',JSON.stringify({
 panels:initial.baseCabinetPanels,appliances:initial.appliancePieces,
 drawers:initial.storageFixtures,taskLEDs:initial.ledStrips,
 sourceUnmodified:true,openPlanPreserved:true,pantryInvented:false,
 preciseClearanceApproved:false
}));
