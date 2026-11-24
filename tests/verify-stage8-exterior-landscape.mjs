import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createCuratedSiteContext} from '../src/phase2/site-context.js';
import {createSiteWalkSupport} from '../src/phase2/site-walk-support.js';
import {STAGE8_BRIEF,createStage8ExteriorLandscape}
 from '../src/phase2/stage8-exterior-landscape.js';
import {activateIntegratedHouseDesign}
 from '../src/phase2/production-design.js';

globalThis.document={createElement:()=>({
 width:0,height:0,getContext:()=>({
  fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){}
 })
})};
const origin=new THREE.Vector3(90,0,-12),scene=new THREE.Scene();
const site=createCuratedSiteContext(scene,origin);
const gatePosition=site.gate.position.clone(),siteTransform=site.root.position.clone();
const access=JSON.stringify(site.access);
const mainLayout={...site.summary};
const source=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),
 new THREE.MeshStandardMaterial({color:0xaaa990}));
source.position.set(25,.7,3);source.userData.ifc={name:'IFC sample',guid:'SOURCE-1'};
const records=[{mesh:source,box:new THREE.Box3().setFromObject(source),
 category:'walls',layer:{level:'ground'}}];
const sourceGeometry=source.geometry,sourcePosition=source.position.clone();
const stage8=createStage8ExteriorLandscape({scene,site,origin,records});
const data=stage8.status();
assert.equal(STAGE8_BRIEF.landscapeLightKelvin,2900);
assert.equal(STAGE8_BRIEF.gateWidthMetres,4);
assert.equal(STAGE8_BRIEF.minBayWidthMetres,2.5);
assert.equal(STAGE8_BRIEF.minBayLengthMetres,5);
assert(data.productionIntegrated&&!data.previewActivationRequired);
assert(data.sourceExteriorSitePreserved&&data.sourceIFCGeometryPreserved);
assert.equal(data.originalGateWidthMetres,4);
assert.equal(data.originalMarkedParkingBays,3);
assert(data.originalGateOnPalmSideFence);
assert(data.straightDrivewayToCourtPreserved&&data.seamlessDrivewayEdgePreserved);
assert(data.lawnPercentage>50&&data.pavedPercentage<50);
assert.equal(data.preservedPalms,3);
assert(data.mownLawnBands>=7,'the front lawn must remain green with subtle tonal texture');
assert.equal(data.decorativeGravelStrips,2);
assert.equal(data.parkingMarkers,3);
assert(data.shrubClusters>=5);
assert(data.shrubStems>=25);
assert(data.pathwayBollards>=3);
assert.equal(data.palmUplights,3);
assert.equal(data.gatePillarLights,2);
assert.equal(data.lightSources,
 data.pathwayBollards+data.palmUplights+data.gatePillarLights);
assert.equal(data.addedWalkBlockers,data.shrubClusters+data.pathwayBollards);
assert(data.lightsCurrentlyOn===data.lightSources);
assert(data.lightSources>=8&&data.lightSources<=11);
assert(data.builtNewBoundaryWalls===0&&!data.movedOriginalGate);
assert(!data.addedParkingShadeCanopy&&!data.addedSurfaceDrainagePipework);
assert(!data.engineeredSiteFalls&&!data.drainageApproved);
assert(!data.siteSurveyApproved&&!data.electricalApproved&&!data.clientApproved);
assert(site.root.children.includes(stage8.root));
assert.equal(stage8.root.parent,site.root);
assert(site.root.position.equals(siteTransform));
assert(site.gate.position.equals(gatePosition));
assert.equal(JSON.stringify(site.access),access);
assert.equal(site.summary.totalPavingOutdoorCoverage,mainLayout.totalPavingOutdoorCoverage);
assert(source.geometry===sourceGeometry&&source.position.equals(sourcePosition));
const oldSiteParts=site.root.children.filter(x=>x!==stage8.root);
assert.equal(oldSiteParts.filter(x=>x.name==='PLAN_LANDSCAPE_TREE').length,3);
assert.equal(oldSiteParts.filter(x=>x.name==='S1_STRAIGHT_GATE_DRIVEWAY').length,1);
assert.equal(oldSiteParts.filter(x=>x.name==='S1_PAVED_PARKING_COURT').length,1);
assert.equal(oldSiteParts.filter(x=>x.name==='PLAN_SLIDING_GATE_4M').length,1);
assert.equal(oldSiteParts.filter(x=>x.name==='PARKING_BAY_SEPARATOR').length,2);
stage8.root.traverse(o=>{
 if(o.isMesh){
  assert.equal(o.userData.stage8,true);
  assert.equal(o.userData.sourceGeometryUnmodified,true);
  assert.equal(o.userData.clientApproved,false);
 }
});
const walk=createSiteWalkSupport(site,origin);
assert(walk.summary.blockerCount>=data.addedWalkBlockers+3);
for(const o of stage8.obstacles){
 assert(walk.blockAt(o.x-origin.x,o.z-origin.z,walk.summary.siteY),
  'the physically built garden bollards / shrubs need walking collision');
}
const gx=site.access.gateCenter[0],
 a=site.access.driveway,b=site.access.parking;
const stops=[[gx,a.z0+.7],[gx,(a.z0+a.z1)/2],[gx,b.z0+1.4],
 [b.x0+7,b.z0+2.4],[b.x0+7,b.z1-2]];
for(let k=1;k<stops.length;k++){
 const [x0,z0]=stops[k-1],[x1,z1]=stops[k];
 const count=Math.ceil(Math.hypot(x1-x0,z1-z0)/.25);
 for(let i=1;i<=count;i++){
  const p=i/count,q=(i-1)/count,x=x0+(x1-x0)*p,z=z0+(z1-z0)*p;
  assert(walk.sample(x-origin.x,z-origin.z,0,.4,.7),
   'original vehicle path must still have walkable ground');
  assert(!walk.blocksTraversal(x0+(x1-x0)*q-origin.x,z0+(z1-z0)*q-origin.z,
   x-origin.x,z-origin.z,walk.summary.siteY),
   'landscape may not block the straight gate-to-court access route');
 }
}
stage8.update({night:true,enabled:true,lightLayers:{accent:true}});
assert(stage8.status().lightsCurrentlyOn===stage8.status().lightSources);
stage8.update({enabled:false});
assert.equal(stage8.status().lightsCurrentlyOn,0);
stage8.update({enabled:true,lightLayers:{accent:false}});
assert.equal(stage8.status().lightsCurrentlyOn,0);
stage8.update({lightLayers:{accent:true},night:false});
assert(stage8.status().lightsCurrentlyOn===stage8.status().lightSources);
stage8.update({showSurroundings:false,walking:false});
assert(!stage8.root.visible);
stage8.update({walking:true});
assert(stage8.root.visible);
stage8.update({showSurroundings:true,walking:false});
assert(stage8.root.visible);
const prod=activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,tiles:423,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:true,sourceWorktopVerified:true,
 sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,
 baseCabinetPanels:6,appliancePieces:10})},
 exteriorLandscape:stage8
});
assert(prod.stage8ExteriorIntegrated);
assert(prod.stage8GardenClusters>=5);
assert(prod.stage8ExteriorLights>=8);
assert.equal(prod.stage8ParkingMarkers,3);
assert(prod.stage8MajorityLawnPreserved);
assert.equal(prod.finalClientSignoff,false);
assert.throws(()=>activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:9,
 sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({sourceGeometryUnmodified:true,sourceCollidersUnmodified:true})},
 exteriorLandscape:{status:()=>({...data,lawnPercentage:42})}
}),/Stage 8/);
stage8.dispose();
assert(!site.root.children.includes(stage8.root));
assert.equal(JSON.stringify(site.access),access);
const original=fs.readFileSync('src/phase2/actual-house.js','utf8');
assert(original.includes('state.stage8ExteriorLandscape=createStage8ExteriorLandscape({'));
assert(original.indexOf('state.stage8ExteriorLandscape=createStage8ExteriorLandscape(')<
 original.indexOf('state.siteWalk=createSiteWalkSupport('));
assert(original.includes('exteriorLandscape:state.stage8ExteriorLandscape'));
const schedule=JSON.parse(fs.readFileSync('architecture/stage8-exterior-landscape.json','utf8'));
assert.equal(schedule.status,'production-integrated-exterior-visual-design-pending-survey-and-client-signoff');
assert.equal(schedule.movedApprovedGate,false);
assert.equal(schedule.addedBoundaryWalls,0);
console.log('STAGE8_PRODUCTION_LANDSCAPE_VERIFIED',JSON.stringify({
 shrubs:data.shrubClusters,palmLights:data.palmUplights,
 gatePillarLights:data.gatePillarLights,bollards:data.pathwayBollards,
 parkingBayMarkers:data.parkingMarkers,minorPavingDetails:data.decorativeGravelStrips,
 sourceGateRetained:true,drivewayUnchanged:true,majorityLawnRetained:true,
 walkBlockers:data.addedWalkBlockers,sourceGeometryUnchanged:true,
 productionAutoOn:true
}));
