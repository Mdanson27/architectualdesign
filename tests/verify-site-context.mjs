import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCuratedSiteContext,sitePlan,auditSourceContext} from '../src/phase2/site-context.js';
import {createSiteWalkSupport} from '../src/phase2/site-walk-support.js';
globalThis.document={
 createElement:()=>({
  width:0,height:0,
  getContext:()=>({fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){}})
 })
};
const scene=new THREE.Scene(),origin=new THREE.Vector3(90,0,-12);
const site=createCuratedSiteContext(scene,origin);
assert.equal(sitePlan.width,48.5);assert.equal(sitePlan.depth,25);assert.equal(sitePlan.parkingCount,3);
assert(Math.abs(site.bounds.max.x-site.bounds.min.x-48.5)<1e-5);
assert(Math.abs(site.bounds.max.z-site.bounds.min.z-25)<1e-5);
assert.equal(site.root.visible,false);
assert.equal(site.root.children.filter(x=>x.name==='PARKING_BAY_SEPARATOR').length,2);
assert.equal(site.root.children.filter(x=>x.name==='PLAN_LANDSCAPE_TREE').length,3);
assert.equal(site.root.children.filter(x=>x.name==='S1_DUST_BIN').length,2);
assert.equal(site.gate.userData.widthMetres,4);
assert(scene.children.includes(site.root));
site.root.updateMatrixWorld(true);
const gatePosition=site.gate.getWorldPosition(new THREE.Vector3());
assert(Math.abs(gatePosition.x-site.gateWorld.x)<.001);
assert(Math.abs(gatePosition.z-site.gateWorld.z)<.001);
const access=site.access;
assert.equal(site.summary.gateRoadFacingLongBoundary,true);
assert.equal(site.summary.continuousPavingGateToParking,true);
assert(access.gateCenter[0]-site.frontage[0]>5 &&
 access.gateCenter[0]-site.frontage[0]<11,
 'gate must be at the OPPOSITE end of the access-road frontage');
assert(Math.abs(access.gateCenter[1]-site.siteFrontZ)<.01);
assert(site.summary.parkingOutdoorCoverage>=50,
 'parking court must cover at least half of the outdoor compound');
assert.equal(site.summary.removedOldGatePalmTrees,2);
assert.equal(site.summary.palmTreesPreserved,3);
const court=site.root.children.find(x=>x.name==='S1_EXPANDED_PAVED_PARKING_COURT');
const driveway=site.root.children.find(x=>x.name==='S1_OPPOSITE_GATE_DRIVEWAY');
const parking=site.root.children.find(x=>x.name==='S1_PAVED_PARKING_THREE_BAYS');
assert(court&&driveway&&parking,'expanded court + paved gate approach + three bays');
assert(access.driveway.x1>access.parking.x0,
 'gate lane must overlap the larger paved court');
assert(access.driveway.z0<access.parking.z1,
 'paved gate lane must meet the parking court');
assert(access.palms.every(([x,z])=>z<access.parking.z0-1.4),
 'remaining three palm trees must not stand within parking');
assert.equal(site.root.children.filter(x=>x.name.startsWith('S1_STREET_EDGE_')).length,2);
site.root.updateMatrixWorld(true);
const gateVoid=new THREE.Box3(
 new THREE.Vector3(access.gateCenter[0]-origin.x-1.7,-.5,access.gateCenter[1]-origin.z-.13),
 new THREE.Vector3(access.gateCenter[0]-origin.x+1.7,2.2,access.gateCenter[1]-origin.z+.13)
);
assert(site.root.children.filter(x=>x.name==='APPROVED_BOUNDARY_WALL')
 .every(w=>!new THREE.Box3().setFromObject(w).intersectsBox(gateVoid)),
 'no perimeter fence crosses the new gate opening');
const parkingRay=new THREE.Raycaster();
const px=(access.parking.x0+access.parking.x1)/2,
 pz=(access.parking.z0+access.parking.z1)/2;
parkingRay.set(new THREE.Vector3(px-origin.x,2,pz-origin.z),new THREE.Vector3(0,-1,0));
assert(parkingRay.intersectObject(court,false).length>0,
 'expanded parking surface must be real geometry');
const walk=createSiteWalkSupport(site,origin);
const route=[
 [access.gateCenter[0],site.siteFrontZ-.65],
 [access.gateCenter[0],site.siteFrontZ-2.1],
 [access.parking.x0+1.0,site.siteFrontZ-2.1],
 [access.parking.x0+2.0,access.parking.z1-2.2],
 [access.parking.x0+8.0,access.parking.z1-6.0],
 [access.parking.x0+12.0,access.parking.z0+3.7]
];
for(let k=1;k<route.length;k++){
 const [x0,z0]=route[k-1], [x1,z1]=route[k];
 const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/.45);
 for(let i=1;i<=n;i++){
  const t=i/n,prev=(i-1)/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
  const ox=x0+(x1-x0)*prev,oz=z0+(z1-z0)*prev;
  assert(walk.sample(x-origin.x,z-origin.z,0,.4,.7),
   'a continuous site walking surface must support the gate-to-parking route');
  assert.equal(walk.blocksTraversal(ox-origin.x,oz-origin.z,
   x-origin.x,z-origin.z,walk.summary.siteY),false,
   'gate to expanded parking cannot be obstructed by palm, bins, fence or planter');
 }
}
const grass=site.root.children.find(x=>x.name==='S1_LAWN_EXCLUDING_HOUSE');
assert(grass);
const ray=new THREE.Raycaster();
function hits(x,z){
 ray.set(new THREE.Vector3(x-origin.x,5,z-origin.z),new THREE.Vector3(0,-1,0));
 return ray.intersectObject(grass,false).length;
}
assert.equal(hits(112,-8),0,'House interior should have no lawn');
assert.equal(hits(142,-7),1,'Main lawn should exist beside driveway');
const audit=auditSourceContext([{category:'walls'},{category:'proxies'},{category:'furniture'},{category:'slabs'}],x=>x.category==='furniture');
assert.equal(audit.insideResidence,1);
assert.equal(audit.replacedSiteCandidates,2);
assert.equal(audit.rejectedClutter,1);
assert.equal(audit.suppressedSurroundings,3);
const result={
 status:'passed',layout:'S1',width:sitePlan.width,depth:sitePlan.depth,
 parkingBays:sitePlan.parkingCount,gateWidth:site.gate.userData.widthMetres,
 trees:3,meshCount:site.root.children.length,
 parkingOutdoorCoverage:site.summary.parkingOutdoorCoverage,oppositeGate:true,
 turfHouseCutout:true,lawnCoverage:true,gateAligned:true,
 gateFrontageX:access.gateCenter[0],
 pavedLongDrive:true,parkingTurnConnected:true,approachPalmsOffPaving:true,audit
};
console.log(JSON.stringify(result,null,2));
