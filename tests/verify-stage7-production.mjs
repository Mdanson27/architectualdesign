import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createSourceStairSafety} from '../src/phase2/stair-safety.js';
import {createSourceBalconyRestoration} from '../src/phase2/balcony-restoration.js';
import {STAGE7_DESIGN_BRIEF,createStage7StairsBalconiesLighting}
 from '../src/phase2/stage7-stairs-balconies-lighting.js';
import {activateIntegratedHouseDesign} from '../src/phase2/production-design.js';

const scene=new THREE.Scene(),records=[];
function put(name,category,level,x0,y0,z0,x1,y1,z1,guid){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0xbaa9a1}));
 mesh.name=guid;mesh.userData.ifc={name,guid};
 mesh.updateWorldMatrix(true);
 const rec={mesh,category,layer:{level},
  box:new THREE.Box3(new THREE.Vector3(x0,y0,z0),new THREE.Vector3(x1,y1,z1))};
 records.push(rec);return rec;
}
for(let i=0;i<9;i++){
 const y=.15+i*.174,x=110.6-i*.272;
 put('SF TREAD - '+String(i+59).padStart(3,'0'),'proxies','ground',
  x,y,-6.83,x+.30,y+.025,-5.56,'lower'+i);
}
put('SL TREAD - 005','proxies','ground',107.25,1.71,-8.51,
 108.48,1.74,-5.56,'source-landing');
for(let i=0;i<9;i++){
 const y=1.89+i*.173,x=108.45+i*.272;
 put('SF TREAD - '+String(i+68).padStart(3,'0'),'proxies','first',
  x,y,-8.51,x+.30,y+.025,-7.24,'upper'+i);
}
put('SF TREAD - 076','proxies','first',31.1,3.27,-27,31.4,3.30,-25.6,'detached');
const balconySrc=[
 ['SLA - 005','proxies','first',107.64,2.8,.04,110.08,3.2,1.55,'west-slab'],
 ['DOO - 003','proxies','first',108.01,3.3,-.18,109.59,5.84,.06,'west-door'],
 ['SLA - 005','proxies','first',112.17,2.82,-2.66,119.14,3.2,1.4,'family-slab'],
 ['DOO - 003','proxies','first',113.64,3.3,-.17,116.22,5.84,.07,'family-door'],
 ['SW - 024','walls','first',112.17,3.17,1.18,119.18,6.6,1.4,'outer-wall-family'],
 ['SW - 021','walls','first',112.4,3.3,-.15,117.12,6.6,.05,'source-inner-wall'],
 ['SW - 024','walls','first',118.96,3.17,-1.79,119.18,6.6,1.4,'outer-wrap'],
 ['SW - 022','walls','first',116.92,3.3,-4.49,117.12,6.6,.05,'original-family-wall'],
 ['SLA - 005','proxies','first',119.93,2.8,-9.45,122.63,3.2,-5.51,'east-slab'],
 ['DOO - 002','proxies','first',119.71,3.3,-8.93,119.95,5.84,-5.86,'east-door'],
 ['SW - 024','walls','first',122.41,3.17,-9.26,122.63,6.6,-5.51,'east-outer-wall'],
 ['SW - 024','walls','first',119.93,3.17,-9.45,122.63,6.6,-9.23,'east-outer-end'],
 ['SW - 024','walls','first',119.73,3.17,-5.73,122.63,6.6,-5.51,'east-outer-other'],
 ['SW - 004','walls','first',119.72,3.3,-9.25,119.73,6.6,-4.49,'original-wall-door']
];
for(const item of balconySrc)put(...item);
const origin=new THREE.Vector3();
const existingStair=createSourceStairSafety(records,scene,r=>r.box.getCenter(new THREE.Vector3()).x>100);
const existingBalconies=createSourceBalconyRestoration(records,scene,origin,
 r=>r.box.getCenter(new THREE.Vector3()).x>100);
assert(existingStair.sourceVerified);
assert.equal(existingBalconies.summary.restored,3);
const originals=records.map(r=>({r,geo:r.mesh.geometry,
 position:r.mesh.position.clone(),scale:r.mesh.scale.clone(),box:r.box.clone()}));
const stage7=createStage7StairsBalconiesLighting({
 scene,origin,records,stairSystem:existingStair,balconySystem:existingBalconies
});
const status=stage7.status();
assert(STAGE7_DESIGN_BRIEF.productionFirst);
assert(!STAGE7_DESIGN_BRIEF.guardHeightCertifiedByEngineer);
assert(status.productionIntegrated&&!status.previewActivationRequired);
assert.equal(status.sourceTreadsEnhanced,18);
assert.equal(status.sourceStepLEDs,18);
assert.equal(status.sourceBalconiesFinished,3);
assert(status.balconyDeckPieces>=35);
assert(status.balconyRailLEDs>=7);
assert(status.balconyChairs>=2);
assert(status.balconyPlants>=2);
assert(status.balconyTables>=1);
assert.equal(status.addedSafetyGuards,0);
assert.equal(status.addedStairFlights,0);
assert.equal(status.addedPartitionWalls,0);
assert(status.originalBalconyGuardsPreserved);
assert(status.originalBalconyDoorsPreserved);
assert(status.sourceGeometryPreserved);
assert.equal(status.guardEngineeringApproved,false);
assert.equal(status.electricalEngineeringApproved,false);
assert.equal(stage7.balconies.length,3);
assert.equal(stage7.colliders.length,status.balconyChairs+status.balconyTables+status.balconyPlants);
for(const rec of stage7.colliders){
 assert.equal(rec.category,'furniture');
 assert.equal(rec.layer.level,'first');
 assert(rec.box.max.y>=rec.box.min.y);
 assert(rec.mesh.visible);
}
stage7.root.traverse(o=>{
 if(o.isMesh){
  assert(o.userData.stage7===true);
  assert(o.userData.nonstructural===true);
  assert(o.userData.sourceIFCUnmodified===true);
 }
});
for(const old of originals){
 assert(old.r.box.equals(old.box));
 assert.equal(old.r.mesh.geometry,old.geo);
 assert(old.r.mesh.position.equals(old.position));
 assert(old.r.mesh.scale.equals(old.scale));
}
stage7.update({floor:'ground',walking:false,enabled:true,night:true,
 lightLayers:{accent:true},showDetails:true,showStairSafety:true,showBalconies:true});
assert(stage7.grounds===undefined,'module exposes only root and approved consumers');
assert(!stage7.balconyGroup.visible);
assert(stage7.stairGroup.visible);
stage7.update({floor:'first',walking:false,enabled:true,night:true});
assert(stage7.balconyGroup.visible);
assert(stage7.status().accentLEDsVisible);
stage7.update({enabled:false});
assert(!stage7.status().accentLEDsVisible);
stage7.update({enabled:true,lightLayers:{accent:false}});
assert(!stage7.status().accentLEDsVisible);
stage7.update({lightLayers:{accent:true},night:false,enabled:true});
assert(stage7.status().accentLEDsVisible);
stage7.update({floor:'all',showBalconies:false});
assert(!stage7.balconyGroup.visible);
stage7.update({showBalconies:true,showStairSafety:false});
assert(!stage7.stairGroup.visible);
stage7.update({showStairSafety:true,showDetails:true});
assert(stage7.stairGroup.visible);
const prod=activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceWorktopVerified:true,
 sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,
 baseCabinetPanels:6,appliancePieces:10})},
 stairsBalconiesLighting:stage7
});
assert(prod.stage7Integrated&&prod.stage7StairTreadsEnhanced===18);
assert.equal(prod.stage7SourceBalconiesFinished,3);
assert(prod.stage7SwitchableLEDs>=25);
assert.equal(prod.finalClientSignoff,false);
assert.throws(()=>activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({sourceGeometryUnmodified:true,sourceCollidersUnmodified:true})},
 stairsBalconiesLighting:{status:()=>({...status,addedStairFlights:1})}
}),/Stage 7/);
stage7.dispose();
assert(!scene.children.includes(stage7.root));
const missing=createStage7StairsBalconiesLighting({
 scene:new THREE.Scene(),records:[],origin,
 stairSystem:{sourceVerified:false,summary:{}},balconySystem:{summary:{balconies:[]}}
});
assert.equal(missing.status().sourceTreadsEnhanced,0);
assert.equal(missing.status().sourceBalconiesFinished,0);
assert.equal(missing.status().balconyChairs,0);
assert.equal(missing.colliders.length,0);
missing.dispose();
const source=fs.readFileSync('src/phase2/actual-house.js','utf8');
assert(source.includes('state.stage7StairsBalconiesLighting=createStage7StairsBalconiesLighting({'));
assert(source.includes('state.solids.push(...state.stage7StairsBalconiesLighting.colliders)'));
assert(source.includes('stairsBalconiesLighting:state.stage7StairsBalconiesLighting'));
const approval=JSON.parse(fs.readFileSync('architecture/stage7-stairs-balconies-lighting.json','utf8'));
assert.equal(approval.status,'production-integrated-visual-design-pending-client-and-engineer-approval');
assert.equal(approval.structuralGuardsAdded,0);
assert.equal(approval.additionalStairFlights,0);
console.log('STAGE7_PRODUCTION_SOURCE_QA_PASSED',JSON.stringify({
 sourceTreads:status.sourceTreadsEnhanced,
 stepLEDs:status.sourceStepLEDs,sourceBalconies:status.sourceBalconiesFinished,
 deckTiles:status.balconyDeckPieces,railLEDs:status.balconyRailLEDs,
 furnitureColliders:stage7.colliders.length,ifcUnchanged:true,
 doorAndRouteRegressionRequired:true,clientApprovalsStillPending:true
}));
