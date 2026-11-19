import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFunctionalKitchenDoor,S1_GROUND_OPENINGS,createPlanCirculationCorrections} from '../src/phase2/plan-circulation.js';
import {createCuratedSiteContext} from '../src/phase2/site-context.js';
import {createSiteWalkSupport} from '../src/phase2/site-walk-support.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({
 fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){}})})};
const origin=new THREE.Vector3(90,0,-12);
const scene=new THREE.Scene();
const plan=S1_GROUND_OPENINGS.find(p=>p.id==='kitchen-dining-door');
const door=createFunctionalKitchenDoor(plan,origin);
scene.add(door.root);
assert.equal(door.status().width,.93);
assert.equal(door.status().open,false);
assert(!door.root.getObjectByName('KITCHEN_DINING_OPEN_LEAF_PLAN_VISUAL'));
assert(door.root.getObjectByName('S1_KITCHEN_DINING_PROPER_HINGED_WOOD_DOOR'));
const x=plan.center[0]-origin.x,z=plan.center[1]-origin.z;
const from=new THREE.Vector3(x-.55,1,z);
const to=new THREE.Vector3(x+.55,1,z);
assert.equal(door.blocksTraversal(from,to,0,.32),true,'closed kitchen door must block crossing');
assert.equal(door.near(new THREE.Vector3(x-.75,1.65,z),0),true);
const opening=door.toggle(new THREE.Vector3(x-1.1,1.64,z),0);
assert(opening.ok&&opening.open);
for(let i=0;i<70;i++)door.update(.05);
assert(door.current>.85,'leaf must visibly swing fully open');
assert.equal(door.blocksTraversal(from,to,0,.32),false,'open door permits movement');
const pivot=door.root.getObjectByName('HINGED_KITCHEN_LEAF_PIVOT');
assert(Math.abs(pivot.rotation.y)>1.25);
assert.equal(door.toggle(new THREE.Vector3(x,1.64,z),0).ok,false,
 'must not close door on the person at the threshold');
assert.equal(door.toggle(new THREE.Vector3(x-1.1,1.64,z),0).ok,true);
for(let i=0;i<70;i++)door.update(.05);
assert(door.current<.15,'door must close');
assert.equal(door.blocksTraversal(from,to,0,.32),true);
const site=createCuratedSiteContext(scene,origin);
const walk=createSiteWalkSupport(site,origin);
const spawn=walk.outdoorSpawn();
assert(spawn,'must have safe outdoor compound entry');
assert(site.house.maxZ<spawn.z+origin.z);
const ground=walk.sample(spawn.x,spawn.z,0,.4,.7);
assert(ground&&ground.source==='S1-curated-compound');
assert(ground.y<0&&ground.y>-.4,'compound walk y must match actual S1 grass and pavers');
assert.equal(walk.sample(114.75-origin.x,0-origin.z,0,.4,.7),null,
 'walkable compound MUST NOT create a fake floor inside the house');
assert.equal(walk.sample(site.bounds.max.x+1,site.bounds.max.z+1,0,.4,.7),null,
 'no walking outside the plot');
assert(walk.blocksTraversal(spawn.x,spawn.z,site.bounds.max.x+2,site.bounds.max.z+2,ground.y),
 'plot boundary remains solid');
assert(!walk.blocksTraversal(spawn.x,spawn.z,spawn.x+.2,spawn.z,ground.y),
 'person can move within the open compound');
assert(!walk.sample(spawn.x,spawn.z,3.3,.4,.7),
 'no fake first floor hovering over the lawn');
assert.equal(walk.summary.preservesIFC,true);
console.log(JSON.stringify({passed:true,kitchenDoorFunctional:true,
 kitchenClosedBlocks:true,kitchenOpenWalks:true,doorAnimated:true,
 outsideSpawn:spawn.toArray(),compoundWalkable:true,boundarySolid:true,
 interiorSourceFloorPreserved:true}));
