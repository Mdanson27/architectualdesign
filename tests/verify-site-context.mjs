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
assert.equal(site.root.children.filter(x=>x.name==='PLAN_LANDSCAPE_TREE').length,5);
assert.equal(site.root.children.filter(x=>x.name==='S1_DUST_BIN').length,2);
assert.equal(site.gate.userData.widthMetres,4);
assert(scene.children.includes(site.root));
site.root.updateMatrixWorld(true);
const gatePosition=site.gate.getWorldPosition(new THREE.Vector3());
assert(Math.abs(gatePosition.x-site.gateWorld.x)<.001);
assert(Math.abs(gatePosition.z-site.gateWorld.z)<.001);
const access=site.access;
assert(site.summary.gateRoadFacingLongBoundary);
assert(site.summary.continuousPavingGateToParking);
assert(access.gateCenter[0]>site.frontage[0]+sitePlan.width*.78,
 'client-requested gate must be toward the foreground end of the long frontage');
assert(Math.abs(access.gateCenter[1]-site.siteFrontZ)<.00001,
 'gate must face the road, not a short side of the fence');
assert(access.gateCenter[0]+sitePlan.gateWidth/2<site.frontage[1]-4.2,
 'gate must fit within the straight frontage before the chamfer');
const pavement=site.root.children.find(x=>x.name==='S1_PAVED_LONG_FRONTAGE_DRIVE');
const turning=site.root.children.find(x=>x.name==='S1_PAVED_PARKING_TURN');
const parking=site.root.children.find(x=>x.name==='S1_PAVED_PARKING_THREE_BAYS');
assert(pavement&&turning&&parking,'continuous gate-to-parking pavers are required');
assert(access.driveway.x0<access.turn.x1&&access.turn.x0<access.driveway.x1);
assert(access.driveway.z0<access.turn.z1&&access.turn.z0<access.driveway.z1);
assert(access.turn.x0<access.parking.x1&&access.parking.x0<access.turn.x1);
assert(access.turn.z0<access.parking.z1&&access.parking.z0<access.turn.z1);
assert.equal(site.root.children.filter(x=>x.name.startsWith('S1_STREET_EDGE_')).length,2,
 'the kerb must be interrupted at the four-metre gate');
assert(access.approachPalms.every(([x,z])=>
 x>access.driveway.x0&&z<access.driveway.z0-.55),
 'both approach palms must be on the lawn side, not in the driveway');
const frontWalls=site.root.children.filter(x=>x.name==='APPROVED_BOUNDARY_WALL');
const openGateZone=new THREE.Box3(
 new THREE.Vector3(access.gateCenter[0]-origin.x-1.7,-.5,access.gateCenter[1]-origin.z-.1),
 new THREE.Vector3(access.gateCenter[0]-origin.x+1.7,2.2,access.gateCenter[1]-origin.z+.1)
);
assert(frontWalls.every(w=>!new THREE.Box3().setFromObject(w).intersectsBox(openGateZone)),
 'no perimeter wall may occupy the gate opening');
const paverRay=new THREE.Raycaster();
const px=(access.driveway.x0+access.driveway.x1)/2;
const pz=(access.driveway.z0+access.driveway.z1)/2;
paverRay.set(new THREE.Vector3(px-origin.x,2,pz-origin.z),new THREE.Vector3(0,-1,0));
assert(paverRay.intersectObject(pavement,false).length>0,
 'the long entrance route must have actual paved surface geometry');
const walk=createSiteWalkSupport(site,origin),siteY=walk.summary.siteY;
const route=[
 [access.gateCenter[0]-1,access.gateCenter[1]-.85],
 [px,pz],
 [access.turn.x1-1,access.turn.z0+.52],
 [access.parking.x1-.75,access.parking.z1-.75]
];
for(let s=1;s<route.length;s++){
 const a=route[s-1],b=route[s],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.4);
 for(let i=1;i<=steps;i++){
  const t=i/steps,gx=a[0]+(b[0]-a[0])*t,gz=a[1]+(b[1]-a[1])*t;
  const priorT=(i-1)/steps,ox=a[0]+(b[0]-a[0])*priorT,
   oz=a[1]+(b[1]-a[1])*priorT;
  const x=gx-origin.x,z=gz-origin.z;
  assert(walk.sample(x,z,0,.4,.7),'gate-to-parking route must have walking ground');
  assert(!walk.blocksTraversal(ox-origin.x,oz-origin.z,x,z,siteY),
   'gate-to-parking route cannot collide with tree or site obstacles');
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
 trees:5,meshCount:site.root.children.length,
 turfHouseCutout:true,lawnCoverage:true,gateAligned:true,
 gateFrontageX:access.gateCenter[0],
 pavedLongDrive:true,parkingTurnConnected:true,approachPalmsOffPaving:true,audit
};
console.log(JSON.stringify(result,null,2));
