import assert from 'node:assert/strict';
import * as THREE from 'three';
import {S1_GROUND_OPENINGS,createPlanCirculationCorrections}
 from '../src/phase2/plan-circulation.js';
import {createCuratedSiteContext} from '../src/phase2/site-context.js';
import {createSiteWalkSupport} from '../src/phase2/site-walk-support.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({
 fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){}})})};
const plan=S1_GROUND_OPENINGS.find(x=>x.id==='kitchen-dining-open');
assert(plan&&plan.width>5,'kitchen and dining require a wide open concept');
const origin=new THREE.Vector3(90,0,-12),scene=new THREE.Scene();
const site=createCuratedSiteContext(scene,origin);
const walk=createSiteWalkSupport(site,origin),spawn=walk.outdoorSpawn();
assert(spawn,'must retain outdoor walk start');
assert(walk.sample(spawn.x,spawn.z,0,.4,.7));
assert.equal(walk.sample(114.75-origin.x,-.05-origin.z,0,.4,.7),null,
 'no fabricated indoor ground');
assert.equal(walk.sample(site.bounds.max.x+5,site.bounds.max.z+5,0,.4,.7),null,
 'site boundaries remain solid');
assert(walk.blocksTraversal(spawn.x,spawn.z,site.bounds.max.x+3,site.bounds.max.z+3,-.255));
// Provide a real-shape S1 wall fixture; the correction must not silently
// fabricate its required three SW-017 source segments.
function wall(name,x0,z0,x1,z1,id){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
 mesh.userData.ifc={name,guid:id};
 const box=new THREE.Box3(new THREE.Vector3(x0-origin.x,0,z0-origin.z),
  new THREE.Vector3(x1-origin.x,3.3,z1-origin.z));
 return {mesh,box,category:'walls',layer:{level:'ground'}};
}
const fixture=[
 wall('SW - 017',112.2,-9.45,112.4,-7.54,'sw-1'),
 wall('SW - 017',112.2,-7.54,112.4,-6.53,'sw-2'),
 wall('SW - 017',112.2,-6.53,112.4,-5.56,'sw-3'),
 wall('SW - 023',112.4,-4.49,117.12,-4.29,'sitting-divider'),
 wall('SW - 019',112.2,-5.56,112.4,.59,'kitchen-divider')
];
const source=createPlanCirculationCorrections(fixture,new THREE.Scene(),origin);
assert.equal(source.openStairWall.count,3);
assert.equal(source.kitchenDoor,null);
assert.equal(source.summary.internalDoorCount,0);
assert.equal(source.root.children.length,0);
console.log(JSON.stringify({passed:true,kitchenDiningOpenNoDoor:true,
 pathWidth:plan.width,siteWalkingPreserved:true,sourceIFCUnchanged:true}));
