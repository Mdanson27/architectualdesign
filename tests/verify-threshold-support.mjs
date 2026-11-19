import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sourceSlabSeamSupport} from '../src/phase2/threshold-support.js';
const slab=(name,lo,hi,level='first')=>({
 mesh:{visible:true,userData:{ifc:{name}}},
 layer:{level},
 box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))
});
const a=slab('SLA - 005',[0,2.8,0],[1,3.2,3.8]);
const b=slab('SLA - 005',[1.02,2.8,0],[2,3.2,3.8]);
const balcony=[a,b];
const support=sourceSlabSeamSupport(balcony,1.01,1.5,3.3,.4,.7,r=>r.mesh.visible);
assert(support&&support.y===3.2,'2cm source slab seam should support walking');
assert.equal(sourceSlabSeamSupport(balcony,2.35,1.5,3.3,.4,.7,r=>r.mesh.visible),null,
 'do not extend floor beyond 11cm from source');
assert.equal(sourceSlabSeamSupport(balcony,1.01,1.5,0,.4,.7,r=>r.mesh.visible),null,
 'do not invent ground-floor ramps');
assert.equal(sourceSlabSeamSupport([slab('SLA - 005',[0,2.8,0],[11,3.2,11])],1,1,3.3),
 null,'overlarge slabs are not fallback floor patches');
a.mesh.visible=false;b.mesh.visible=false;
assert.equal(sourceSlabSeamSupport(balcony,1.01,1.5,3.3,.4,.7,r=>r.mesh.visible),null,
 'hidden source surfaces must not be walkable');
assert.equal(sourceSlabSeamSupport([slab('SLA - 005',[0,2.8,0],[1,3.2,3.8],'ground')],
 .5,1.5,3.3),null,'wrong level cannot support first floor');
console.log(JSON.stringify({passed:true,sourceSeamGapMetres:.02,maxAllowedMetres:.11,
 largeVoidsProtected:true,hiddenSurfaceProtected:true,sourceOnly:true}));
