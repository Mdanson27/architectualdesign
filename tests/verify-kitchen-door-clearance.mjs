import assert from 'node:assert/strict';
import * as THREE from 'three';
import {repairKitchenDoorCounterIntrusion,S1_GROUND_OPENINGS}
 from '../src/phase2/plan-circulation.js';
const plan=S1_GROUND_OPENINGS.find(x=>x.id==='kitchen-dining-open');
assert(plan&&plan.width>=5.4);
function rec(name,lo,hi,id,level='ground'){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,guid:id};
 return {mesh,category:'slabs',layer:{level},box:new THREE.Box3(
  new THREE.Vector3(...lo),new THREE.Vector3(...hi))};
}
const affected=[
 rec('SLA - 002',[111.94,-.03,-2.23],[111.97,.84,.51],'open-counter-vertical'),
 rec('SLA - 002',[111.97,-.03,-2.36],[112.46,.84,-2.13],'open-counter-end'),
 rec('SLA - 002',[111.97,.77,-2.26],[112.46,.84,.55],'open-counter-return')];
const unaffected=[
 rec('SLA - 002',[107.85,.81,-1.49],[111.94,.84,.52],'far-counter'),
 rec('SLA - 001',[112.0,-.03,-2.36],[112.4,.84,-2.13],'main-floor'),
 rec('SLA - 002',[111.97,3.27,-2.36],[112.46,4.04,-2.13],'upper-level','first')
];
const records=[...affected,...unaffected],
 original=records.map(r=>({material:r.mesh.material,geometry:r.mesh.geometry,
   positions:[...r.mesh.geometry.attributes.position.array]}));
const result=repairKitchenDoorCounterIntrusion(records,new THREE.Vector3(),plan);
assert.equal(result.summary.matchedSourceSlabs,3);
for(const r of affected){
 assert.notStrictEqual(r.mesh.material,original[records.indexOf(r)].material);
 assert.equal(r.mesh.visible,false,'no ribbed source divider may remain visible');
 assert.equal(r.mesh.userData.clientKitchenDiningDividerRemoved,true);
}
for(const r of unaffected)assert.equal(r.mesh.visible,true,'real kitchen counters and floor must remain visible');
for(const r of unaffected)assert.strictEqual(r.mesh.material,original[records.indexOf(r)].material);
assert(result.pointInCut(new THREE.Vector3(112.3,.45,-2.35)));
assert(!result.pointInCut(new THREE.Vector3(113.1,.45,-2.35)));
result.setEnabled(false);
affected.forEach(r=>assert.strictEqual(r.mesh.material,original[records.indexOf(r)].material));
result.setEnabled(true);
records.forEach((r,i)=>{
 assert.strictEqual(r.mesh.geometry,original[i].geometry);
 assert.deepEqual([...r.mesh.geometry.attributes.position.array],original[i].positions);
});
console.log(JSON.stringify({passed:true,kitchenOpenWidth:plan.width,
 oldDoorLeafNotCreated:true,lowCounterIntrusionClipped:3,
 originalSourceMeshesPreserved:true}));
