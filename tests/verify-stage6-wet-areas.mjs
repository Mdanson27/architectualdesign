import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {STAGE6_BRIEF,STAGE6_SOURCE_S1_ZONES,
 auditStage6S1WetAnchors,createStage6WetAreas}
 from '../src/phase2/stage6-wet-areas.js';
import {activateIntegratedHouseDesign}
 from '../src/phase2/production-design.js';

const scene=new THREE.Scene(),records=[],origin=new THREE.Vector3(0,0,0);
function source(name,level,category,x,y,z,w,h,d){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
  new THREE.MeshStandardMaterial({color:0xdddbd5}));
 mesh.userData.ifc={name,guid:'IFC-'+records.length};
 mesh.position.set(x,y,z);mesh.updateWorldMatrix(true,false);scene.add(mesh);
 const r={mesh,box:new THREE.Box3().setFromObject(mesh),category,layer:{level}};
 records.push(r);return r;
}
const sourceFixtures=[
 source('FU - 011','ground','proxies',107.798,2.1,-9.835,.251,1.2,.346),
 source('FU - 012','ground','proxies',107.821,1.2,-8.78,.387,.686,.145),
 source('FU - 011','ground','proxies',109.11,2.1,-11.476,.251,1.2,.346),
 source('FU - 012','ground','proxies',109.011,1.2,-10.28,.387,.686,.145),
 source('FU - 012','ground','proxies',112.5,1.2,-12.454,.145,.686,.387),
 source('FU - 011','first','proxies',107.473,5.4,-1.207,.346,1.2,.251),
 source('FU - 012','first','proxies',106.398,4.5,-1.246,.145,.686,.387),
 // First-floor staircase source trim is NOT a bathroom!
 source('FU - 011','first','proxies',107.431,6.155,-9.835,.251,1.2,.346),
 // A kitchen source fitting must not be treated as a bathroom.
 source('FU - 011','ground','furniture',109.735,1.476,-4.586,.60,.285,.045),
];
const walls=[
 source('SW - powder','ground','walls',107.45,1.65,-9.70,.20,3.30,1.12),
 source('SW - maid','ground','walls',108.80,1.65,-11.15,.20,3.30,1.06),
 source('SW - bedroom','ground','walls',112.30,1.65,-12.25,.20,3.30,1.08),
 source('SW - upstairs','first','walls',107.02,4.95,-1.15,.20,3.30,1.10)
];
const saved=records.map(r=>({mesh:r.mesh,geo:r.mesh.geometry,mat:r.mesh.material,
 pos:r.mesh.position.clone(),scale:r.mesh.scale.clone()}));
const audit=auditStage6S1WetAnchors(records,origin);
assert.equal(STAGE6_SOURCE_S1_ZONES.length,4);
assert.equal(STAGE6_BRIEF.blackFittingsAllowed,false);
assert.equal(STAGE6_BRIEF.architectCertifiedBathroomPolygons,false);
assert.equal(audit.length,4);
assert.equal(audit.filter(x=>x.sourceSupported).length,4);
assert.equal(audit.reduce((n,x)=>n+x.entries.length,0),7);
assert(!audit.some(x=>x.entries.some(e=>e.record===sourceFixtures[7])));
assert(!audit.some(x=>x.entries.some(e=>e.record===sourceFixtures[8])));
const probe=[];
const system=createStage6WetAreas({
 scene,origin,records,doors:[],
 floorSampler:(x,z,level)=>{probe.push([x,z,level]);return {y:level}}
});
const info=system.status();
assert(info.productionIntegrated);
assert(!info.previewActivationRequired);
assert(info.activeSourceWetZones===4);
assert(info.identifiedSourceProxyFittings===7);
assert(info.porcelainFloorTiles>0);
assert(info.sourceFloorProbesPassed>0);
assert(info.sourceUpperFittingsTrimmed===3);
assert(info.lowerFittingsAccented===4);
assert(info.illuminatedServiceMirrors===3);
assert(info.sourceWallTilePanels>=1);
assert.equal(info.addedInternalWalls,0);
assert.equal(info.addedDoors,0);
assert.equal(info.newUnverifiedToiletsCreated,0);
assert.equal(info.newShowerPartitionsCreated,0);
assert.equal(info.exactBathroomPolygonsCertified,false);
assert.equal(info.wetAreaWaterproofingCertified,false);
assert.equal(info.bidetDrainageCertified,false);
assert.equal(info.sourceGeometryPreserved,true);
assert.equal(info.sourceDoorCollidersPreserved,true);
assert.equal(info.clientApproved,false);
system.root.traverse(o=>{if(o.isMesh){
 assert(o.userData.stage6);
 assert.equal(o.userData.collidable,false);
 assert.equal(o.userData.clientApproved,false);
}});
for(const p of saved){
 assert(p.mesh.geometry===p.geo);
 assert(p.mesh.material===p.mat);
 assert(p.mesh.position.equals(p.pos));
 assert(p.mesh.scale.equals(p.scale));
}
system.update({floor:'first',walking:false,enabled:true,night:true,
 lightLayers:{task:true}});
assert(system.groups['F-BEDROOM-WC'].visible);
assert(!system.groups['G-POWDER-WC'].visible);
system.update({floor:'ground',walking:false});
assert(system.groups['G-POWDER-WC'].visible);
assert(!system.groups['F-BEDROOM-WC'].visible);
system.update({floor:'all',walking:false});
assert(Object.values(system.groups).every(x=>x.visible));
system.update({floor:'all',walking:false,furnitureVisible:false});
assert(!system.root.visible);
system.update({floor:'all',walking:true,furnitureVisible:true});
assert(system.root.visible);
const ready=activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceWorktopVerified:true,
 sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,
 baseCabinetPanels:6,appliancePieces:10})},
 wetAreas:system
});
assert(ready.stage6WetAreasIntegrated);
assert.equal(ready.stage6SourceSupportedWetZones,4);
assert.equal(ready.stage6SourceFixturesAccented,7);
const bad=activateIntegratedHouseDesign.bind(null,{
 surfaces:{applyProposal:()=>({enhancedRooms:9,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({sourceGeometryUnmodified:true,sourceCollidersUnmodified:true})},
 wetAreas:{status:()=>({...info,addedInternalWalls:1})}
});
assert.throws(bad,/Stage 6 wet areas/);
system.dispose();assert(!scene.children.includes(system.root));
const missing=createStage6WetAreas({
 scene:new THREE.Scene(),records:[],floorSampler:()=>null
});
assert.equal(missing.status().activeSourceWetZones,0);
assert.equal(missing.status().porcelainFloorTiles,0);
assert.equal(missing.status().identifiedSourceProxyFittings,0);
missing.dispose();
const dry=createStage6WetAreas({
 scene:new THREE.Scene(),records:sourceFixtures,
 floorSampler:()=>null
});
assert.equal(dry.status().porcelainFloorTiles,0);
dry.dispose();
const js=fs.readFileSync('src/phase2/actual-house.js','utf8');
assert(js.includes('state.stage6WetAreas=createStage6WetAreas({'));
assert(js.includes('wetAreas:state.stage6WetAreas'));
assert(!js.includes('state.solids.push(...state.stage6WetAreas.colliders)'));
const register=JSON.parse(fs.readFileSync('architecture/stage6-wet-areas.json','utf8'));
assert.equal(register.status,'production-visual-integration-pending-architect-sanitary-signoff');
assert.equal(register.addedArchitecturalBathroomWalls,0);
console.log('STAGE6_WET_AREAS_SOURCE_QA_PASSED',JSON.stringify({
 zones:info.activeSourceWetZones,fixtures:info.identifiedSourceProxyFittings,
 porcelainFloorTiles:info.porcelainFloorTiles,
 wallTilePanels:info.sourceWallTilePanels,
 litExistingRaisedFittings:info.illuminatedServiceMirrors,
 fakeBathroomEnclosures:0,
 sourceGeometryUnmodified:true,clientApproved:false
}));
