import assert from 'node:assert/strict';
import * as THREE from 'three';
import {repairKitchenDoorCounterIntrusion,S1_GROUND_OPENINGS,createPlanCirculationCorrections}
 from '../src/phase2/plan-circulation.js';
const plan=S1_GROUND_OPENINGS.find(p=>p.id==='kitchen-dining-door');
const origin=new THREE.Vector3();
function fixture(name,lo,hi,id,category='slabs',level='ground'){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,guid:id};
 return {mesh,category,layer:{level},box:new THREE.Box3(
  new THREE.Vector3(...lo),new THREE.Vector3(...hi))};
}
const impacted=[
 fixture('SLA - 002',[111.94,-.03,-2.23],[111.97,.84,.51],'counter-side-vertical'),
 fixture('SLA - 002',[111.97,-.03,-2.36],[112.46,.84,-2.13],'counter-low-end-plug'),
 fixture('SLA - 002',[111.97,.77,-2.26],[112.46,.84,.55],'counter-upper-return')
];
const unaffected=[
 fixture('SLA - 002',[107.85,.81,-1.49],[111.94,.84,.52],'countertop-away'),
 fixture('SLA - 002',[111.94,-.03,-5.56],[111.97,.84,-4.56],'other-counter'),
 fixture('SLA - 001',[112.0,-.03,-2.36],[112.4,.84,-2.13],'not-source-part'),
 fixture('SLA - 002',[111.97,3.27,-2.36],[112.46,4.04,-2.13],'upper-floor-part','slabs','first'),
 fixture('SLA - 002',[112.0,-.2,-2.36],[113,0,-1.9],'actual-ground-slab')
];
const arr=[...impacted,...unaffected];
const initial=arr.map(r=>({geometry:r.mesh.geometry,material:r.mesh.material,
 positions:[...r.mesh.geometry.attributes.position.array]}));
const repair=repairKitchenDoorCounterIntrusion(arr,origin,plan);
assert.equal(repair.summary.matchedSourceSlabs,3);
assert.equal(repair.selected.length,3);
assert.equal(repair.enabled,true);
for(const rec of impacted){
 assert(repair.selected.includes(rec));
 assert.notStrictEqual(rec.mesh.material,initial[arr.indexOf(rec)].material);
 assert(rec.mesh.userData.kitchenCounterDoorCut===true);
 const shader={
  uniforms:{},
  vertexShader:'#include <begin_vertex>\n void main(){}',
  fragmentShader:'#include <clipping_planes_fragment>\n void main(){}'
 };
 rec.mesh.material.onBeforeCompile(shader,{});
 assert(shader.vertexShader.includes('vKitchenCounterWorld'));
 assert(shader.fragmentShader.includes('uKitchenCounterCutXZ'));
 assert(shader.fragmentShader.includes('discard;'));
 assert(shader.uniforms.uKitchenCounterCutXZ);
}
for(const rec of unaffected)assert.strictEqual(rec.mesh.material,initial[arr.indexOf(rec)].material);
assert(repair.pointInCut(new THREE.Vector3(112.3,.6,-2.35)));
assert(!repair.pointInCut(new THREE.Vector3(112.3,.6,-1.15)));
assert(!repair.pointInCut(new THREE.Vector3(112.3,1.5,-2.35)));
assert(repair.permitsCounterHit({object:impacted[1].mesh,point:new THREE.Vector3(112.3,.5,-2.3)}));
assert(!repair.permitsCounterHit({object:unaffected[0].mesh,point:new THREE.Vector3(112.3,.5,-2.3)}));
repair.setEnabled(false);
assert(!repair.enabled);
for(const rec of impacted)assert.strictEqual(rec.mesh.material,initial[arr.indexOf(rec)].material);
repair.setEnabled(true);
assert(repair.enabled);
for(let i=0;i<arr.length;i++){
 assert.strictEqual(arr[i].mesh.geometry,initial[i].geometry);
 assert.deepEqual([...arr[i].mesh.geometry.attributes.position.array],initial[i].positions);
}
const wall=fixture('SW - 019',[112.2,0,-5.56],[112.4,3.3,.59],'kitchen-plan-wall','walls');
const wall2=fixture('SW - 017',[112.2,0,-7.54],[112.4,3.3,-6.53],'stair-one','walls');
const wall3=fixture('SW - 017',[112.2,0,-6.53],[112.4,3.3,-5.56],'stair-two','walls');
const model=createPlanCirculationCorrections([...arr,wall,wall2,wall3],new THREE.Scene(),origin);
assert.equal(model.summary.kitchenDoorFunctional,true);
assert.equal(model.summary.kitchenCounterClearance.matchedSourceSlabs,3);
assert.equal(model.apertures.length,3);
console.log(JSON.stringify({passed:true,kitchenSourcePiecesClipped:3,
 trueDoorOpening:true,originalSourceVerticesPreserved:true,
 neighboringCountertopIntact:true,upperSlabsIntact:true,reversible:true}));
