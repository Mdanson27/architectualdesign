import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {createSourceKitchenReplacement,kitchenSourceIds} from '../src/phase2/phase14d-source-replacement.js';
// Read actual source GLB metadata and transforms, not fabricated cabinet positions.
const meta=JSON.parse(fs.readFileSync('public/ifc/house/source-elements.json','utf8'));
const files=['ground-furniture-00','ground-furniture-01','ground-proxies-r055','ground-proxies-r070','ground-proxies-r077','ground-slabs-00'];
const records=[];
for(const file of files){
 const data=fs.readFileSync('public/ifc/house/'+file+'.glb'),len=data.readUInt32LE(12),j=JSON.parse(data.subarray(20,20+len).toString('utf8'));
 const category=file.includes('furniture')?'furniture':file.includes('proxies')?'proxies':'slabs';
 for(const n of j.nodes){if(n.mesh==null)continue;const p=j.meshes[n.mesh].primitives[0],a=j.accessors[p.attributes.POSITION];if(!a.min||!a.max)continue;
  const b=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max));
  if(n.matrix)b.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));
  else if(n.translation)b.translate(new THREE.Vector3(...n.translation));
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
  mesh.userData.ifc={guid:n.name,name:meta[n.name]?.name};
  records.push({mesh,box:b,category,layer:{level:'ground'}});
 }
}
const scene=new THREE.Scene(),system=createSourceKitchenReplacement({scene,origin:{x:0,z:0},records,floorSampler:()=>({y:.005}),requirements:{}});
assert(system,'actual IFC replacement must be selected');
const q=system.enable(true),p=q.phase14d;
assert(p.replacedCabinets>=30,'source kitchen cabinet replacement count');
assert(p.upperCabinets>=8);assert(p.baseCabinets>=10);
assert.equal(p.fridges,1);assert.equal(p.applianceTowers,1);
assert(p.floorPlanks>100);assert(q.sourceWorktopVerified);
for(const r of records){if(system.sourceSet.has(r))assert(!r.mesh.visible);else assert(r.mesh.visible);}
assert.equal([...system.sourceSet].filter(r=>r.category==='slabs').length,0);
assert.equal(p.worktopGuids.length,2);
const cook=system.root.getObjectByName('COOKTOP_ON_SOURCE_RUN');assert(cook);
assert(Math.abs(cook.position.x-108.16)<.001&&Math.abs(cook.position.z+3.77)<.001);
system.updateVisibility('ground',false,true);assert(system.root.visible);
system.updateVisibility('first',false,true);assert(!system.root.visible);
system.enable(false);for(const r of system.sourceSet)assert(r.mesh.visible);
console.log('PHASE14D_SOURCE_REPLACEMENT_METADATA_QA',JSON.stringify(p));
