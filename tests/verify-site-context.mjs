import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCuratedSiteContext,sitePlan,auditSourceContext} from '../src/phase2/site-context.js';
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
 turfHouseCutout:true,lawnCoverage:true,gateAligned:true,audit
};
console.log(JSON.stringify(result,null,2));
