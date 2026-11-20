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
const source=createPlanCirculationCorrections([],new THREE.Scene(),origin);
assert.equal(source.kitchenDoor,null);
assert.equal(source.summary.internalDoorCount,0);
assert.equal(source.root.children.length,0);
console.log(JSON.stringify({passed:true,kitchenDiningOpenNoDoor:true,
 pathWidth:plan.width,siteWalkingPreserved:true,sourceIFCUnchanged:true}));
