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
assert(site.summary.gateOnPalmTreeSideFence,
 'new gate must be on the palm-tree-side fence, not the previous frontage');
assert(site.summary.oldGateBoundaryRestored,
 'previous gate opening must be closed with the continuous boundary');
assert.equal(access.gateBoundary,'palm-tree-side long fence (z=top)');
assert(Math.abs(access.gateCenter[1]-(site.bounds.min.z+origin.z))<.01,
 'new gate lies in the long palm-tree-side boundary');
assert(site.siteFrontZ-access.gateCenter[1]>24,
 'new gate must be on the OPPOSITE wall, not relocated along the same fence');
assert(site.summary.gateDistanceFromForegroundCornerMetres>8&&
 site.summary.gateDistanceFromForegroundCornerMetres<14,
 'gate is toward lower/foreground corner, not near the house');
assert(site.summary.drivewayWidthMetres>=4.5);
assert(site.summary.straightDrivewayToParking);
assert(site.summary.continuousPavingGateToParking);
assert(site.summary.parkingOutdoorCoverage>25&&
 site.summary.parkingOutdoorCoverage<45,
 'parking must be substantial but not overwhelm the compound');
assert(site.summary.totalPavingOutdoorCoverage>30&&
 site.summary.totalPavingOutdoorCoverage<50,
 'all paving, including the driveway, must occupy less than half the outdoor area');
assert(site.summary.lawnOutdoorCoverageApprox>50,
 'the majority of the outdoor compound should remain lawn');
assert.equal(site.summary.removedOldGatePalmTrees,2);
assert.equal(site.summary.palmTreesPreserved,3);
assert.equal(site.root.children.filter(x=>x.name==='PLAN_LANDSCAPE_TREE').length,3);
const court=site.root.children.find(x=>x.name==='S1_PAVED_PARKING_COURT');
const driveway=site.root.children.find(x=>x.name==='S1_STRAIGHT_GATE_DRIVEWAY');
const parking=site.root.children.find(x=>x.name==='S1_PAVED_PARKING_THREE_BAYS');
assert(court&&driveway&&parking,
 'parking court, straight driveway and three designated bays must all exist');
assert(access.driveway.x0<access.gateCenter[0]&&
 access.driveway.x1>access.gateCenter[0]&&
 access.parking.x0<access.gateCenter[0]&&
 access.parking.x1>access.gateCenter[0],
 'the gate, driveway and parking court must be on the same straight drive line');
assert(access.driveway.z0>=access.gateCenter[1]&&
 access.driveway.z0<access.gateCenter[1]+.20&&
 access.driveway.z1>access.parking.z0+.30,
 'the driveway must directly overlap the parking court');
assert(access.parking.x0>site.house.maxX,
 'parking must not intrude into the main house');
assert.equal(site.summary.straightPavingOuterEdge,true);
assert.equal(site.summary.driveCourtRightEdgeOffsetMetres,0,
 'parking edge must be perfectly flush with the straight driveway');
assert(Math.abs(access.parking.x1-access.driveway.x1)<1e-6,
 'driveway must not kink where it meets the parking');
const outerKerb=site.root.children.filter(m=>m.name==='PAVED_AND_DRIVE_RIGHT_KERB');
assert.equal(outerKerb.length,1,
 'exactly one uninterrupted kerb should run alongside driveway and parking');
assert.equal(site.root.children.filter(m=>m.name==='DRIVEWAY_LAWN_KERB_RIGHT').length,0,
 'old overlapping driveway kerb must not reintroduce a jog');
const kerbBounds=new THREE.Box3().setFromObject(outerKerb[0]);
assert(Math.abs(kerbBounds.min.x+origin.x-access.driveway.x1)<.06,
 'straight kerb follows the same outer x coordinate along its full run');
assert(kerbBounds.min.z+origin.z<access.driveway.z0+.45 &&
 kerbBounds.max.z+origin.z>access.parking.z1-.45,
 'straight outer kerb extends continuously from the gate to parking');
assert(access.palms.every(([x,z])=>x>access.parking.x1+1.0),
 'all three foreground palms must be in the lawn, not on parking or driveway');
site.root.updateMatrixWorld(true);
const gateVoid=new THREE.Box3(
 new THREE.Vector3(access.gateCenter[0]-origin.x-1.7,-.5,
  access.gateCenter[1]-origin.z-.14),
 new THREE.Vector3(access.gateCenter[0]-origin.x+1.7,2.2,
  access.gateCenter[1]-origin.z+.14));
const walls=site.root.children.filter(x=>x.name==='APPROVED_BOUNDARY_WALL');
assert(walls.every(w=>!new THREE.Box3().setFromObject(w).intersectsBox(gateVoid)),
 'no source fence wall may obstruct the right-side new gate opening');
const oldGateX=site.frontage[0]+7.8,oldGateZ=site.siteFrontZ;
assert(walls.some(w=>new THREE.Box3().setFromObject(w).containsPoint(
 new THREE.Vector3(oldGateX-origin.x,.5,oldGateZ-origin.z))),
 'old wrong-side gate opening must now be closed with the matching wall');
const parkingRay=new THREE.Raycaster();
const parkingX=(access.parking.x0+access.parking.x1)/2;
const parkingZ=(access.parking.z0+access.parking.z1)/2;
parkingRay.set(new THREE.Vector3(parkingX-origin.x,2,parkingZ-origin.z),
 new THREE.Vector3(0,-1,0));
assert(parkingRay.intersectObject(court,false).length>0,
 'the actual paved parking mesh must cover the designated court');
parkingRay.set(new THREE.Vector3(access.gateCenter[0]-origin.x,2,
 (access.driveway.z0+access.driveway.z1)/2-origin.z),new THREE.Vector3(0,-1,0));
assert(parkingRay.intersectObject(driveway,false).length>0,
 'the straight driveway must have real paver geometry');
const walk=createSiteWalkSupport(site,origin);
const gx=access.gateCenter[0],zStart=access.gateCenter[1]+.67,
 zFinish=access.parking.z0+2;
const route=[[gx,zStart],[gx,(zStart+zFinish)/2],[gx,zFinish],
 [access.parking.x0+7,access.parking.z0+2.4],
 [access.parking.x0+7,access.parking.z1-2]];
for(let k=1;k<route.length;k++){
 const [x0,z0]=route[k-1],[x1,z1]=route[k];
 const steps=Math.ceil(Math.hypot(x1-x0,z1-z0)/.35);
 for(let i=1;i<=steps;i++){
  const t=i/steps,p=(i-1)/steps;
  const x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
  const ox=x0+(x1-x0)*p,oz=z0+(z1-z0)*p;
  assert(walk.sample(x-origin.x,z-origin.z,0,.4,.7),
   'gate-to-parking path must be supported by continuous ground');
  assert.equal(walk.blocksTraversal(ox-origin.x,oz-origin.z,
   x-origin.x,z-origin.z,walk.summary.siteY),false,
   'straight driveway / court must not collide with a tree, bin or wall');
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
assert.equal(hits(149,-4),1,'Large foreground lawn must remain exposed');
assert.equal(hits(128,-17),1,'Lawn must remain beyond the parking and driveway');
const audit=auditSourceContext([{category:'walls'},{category:'proxies'},{category:'furniture'},{category:'slabs'}],x=>x.category==='furniture');
assert.equal(audit.insideResidence,1);
assert.equal(audit.replacedSiteCandidates,2);
assert.equal(audit.rejectedClutter,1);
assert.equal(audit.suppressedSurroundings,3);
const result={
 status:'passed',layout:'S1',width:sitePlan.width,depth:sitePlan.depth,
 parkingBays:sitePlan.parkingCount,gateWidth:site.gate.userData.widthMetres,
 trees:3,meshCount:site.root.children.length,
 parkingOutdoorCoverage:site.summary.parkingOutdoorCoverage,
 totalPavingOutdoorCoverage:site.summary.totalPavingOutdoorCoverage,
 lawnOutdoorCoverageApprox:site.summary.lawnOutdoorCoverageApprox,
 palmTreeSideGate:true,oldGateClosed:true,
 turfHouseCutout:true,lawnCoverage:true,gateAligned:true,
 gateFrontageX:access.gateCenter[0],
 straightDriveway:true,parkingConnected:true,palmsPreservedOnLawn:true,audit
};
console.log(JSON.stringify(result,null,2));
