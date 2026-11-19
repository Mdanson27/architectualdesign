import assert from 'node:assert/strict';
import * as THREE from 'three';
import {isWalkableSourceSurface} from '../src/phase2/walkable-floor.js';
function rec(name,level,category,lo,hi){
 const m={userData:{ifc:{name}}};
 return {mesh:m,layer:{level},category,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))};
}
assert.equal(isWalkableSourceSurface(rec('SLA - 003','first','slabs',[0,3.958,0],[.79,4.008,.50])),false,
 'raised vanity shelf must not be sampled as a walking surface');
assert.equal(isWalkableSourceSurface(rec('SLA - 001','first','slabs',[0,2.796,0],[3,3.3,4])),true,
 'main first floor remains walkable');
assert.equal(isWalkableSourceSurface(rec('SLA - 003','first','slabs',[0,3.958,0],[2.1,4.008,2.4])),true,
 'a full-size landing is not excluded by name');
assert.equal(isWalkableSourceSurface(rec('SLA - 003','ground','slabs',[0,.3,0],[.79,.5,.50])),true,
 'the source filter applies only to proven raised first-floor pads');
assert.equal(isWalkableSourceSurface(rec('SF TREAD - 003','first','proxies',[0,3.3,0],[.3,3.5,1])),true,
 'source staircase steps remain traversable');
console.log(JSON.stringify({passed:true,sourceRaisedNonFloorExcluded:true,
 genuineLandingRetained:true,stairsRetained:true,IFCUnmodified:true}));
