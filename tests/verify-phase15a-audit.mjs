import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {STAGE1_PLAN_SKETCHES} from '../src/phase2/stage1-plan-crosswalk.js';
import {createFurnitureAsset,fitFurnitureEnvelope} from '../src/phase2/phase14-furniture-library.js';
import {faceTarget,facingDot} from '../src/phase2/phase14abc-integration.js';
import {DINING_TABLE_WORLD} from '../src/phase2/dining-furnishings.js';

const audit=JSON.parse(fs.readFileSync('architecture/phase15a-living-dining-audit.json','utf8'));
const tolerance=.0011;
const approximately=(actual,expected,context)=>assert(Math.abs(actual-expected)<=tolerance,context+': '+actual+' != '+expected);
const source=JSON.parse(fs.readFileSync('public/ifc/house/source-elements.json','utf8'));
const files=new Map();
function glb(layer){
 if(!files.has(layer)){
  const data=fs.readFileSync('public/ifc/house/'+layer+'.glb');
  assert.equal(data.readUInt32LE(0),0x46546c67);
  files.set(layer,JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8')));
 }
 return files.get(layer);
}
const entries=[...audit.exactSourceRegister,...audit.protectedSource];
assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
for(const e of entries){
 const doc=glb(e.layer),nodes=doc.nodes.filter(n=>n.name===e.id);
 assert.equal(nodes.length,1,'Exact IFC identity '+e.id);
 const n=nodes[0],a=doc.accessors[doc.meshes[n.mesh].primitives[0].attributes.POSITION];
 assert.equal(source[e.id].name,e.name);
 const matrix=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(
  new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));
 const b=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max)).applyMatrix4(matrix);
 for(let k=0;k<3;k++){approximately(b.min.getComponent(k),e.min[k],e.id+' min '+k);approximately(b.max.getComponent(k),e.max[k],e.id+' max '+k);}
}
for(const room of audit.rooms){
 const v=STAGE1_PLAN_SKETCHES[room.id].vertices;
 const x=v.map(p=>p[0]),z=v.map(p=>p[1]);
 const limits=[Math.min(...x),Math.max(...x),Math.min(...z),Math.max(...z)];
 assert.deepEqual(limits,room.provisionalPlanBoundsXZ);
 assert.equal(room.certified,false);
}
assert.deepEqual([...DINING_TABLE_WORLD],audit.generatedFurniture.tableCentre);
const parent=new THREE.Group();
const tested=[];
const centre=(o)=>new THREE.Box3().setFromObject(o,true).getCenter(new THREE.Vector3());
// Test actual backrest and seat geometry, not merely the nominal yaw.
// This is an audit of the existing library assets, not acceptance of new furniture.
function pose(id,detail,position,target,yaw){
 const root=createFurnitureAsset(id,{detail});
 const dining=id==='curved-dining-chair';
 const back=root.getObjectByName(dining?'upholstered-back-pad':'olive-loose-back-cushion');
 const seat=root.getObjectByName(dining?'shaped-seat-upholstery':'deep-single-seat');
 assert(back&&seat,id+' actual geometry landmarks');
 fitFurnitureEnvelope(root,new THREE.Vector3(...(dining?[-.26,0,-.255]:[-.40,0,-.36])),new THREE.Vector3(...(dining?[.26,.99,.2575]:[.40,.94,.38])));
 parent.add(root);root.position.set(position[0],0,position[1]);root.rotation.y=yaw;parent.updateMatrixWorld(true);
 const physical=centre(seat).sub(centre(back));physical.y=0;
 assert(physical.length()>.01,id+' measurable back/front distinction');physical.normalize();
 const desired=new THREE.Vector3(target[0]-position[0],0,target[1]-position[1]).normalize();
 const canonical=new THREE.Vector3(0,0,-1).transformDirection(root.matrixWorld);
 const result={physicalDot:physical.dot(desired),canonicalDot:canonical.dot(desired),determinant:root.matrixWorld.determinant()};
 assert(result.determinant>0,'Reflected seat transform rejected');
 assert(physical.dot(canonical)>.999,'Actual geometry disagrees with canonical forward axis');
 parent.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return result;
}
for(const detail of ['high','low']){
 for(const c of audit.generatedFurniture.chairs){
  const [x,z]=c.localXZ,[tx,tz]=c.assignedTableTargetLocalXZ;
  assert(facingDot(c.yaw,x,z,tx,tz)>.999);
  const p=pose('curved-dining-chair',detail,[x,z],[tx,tz],c.yaw);
  assert(p.physicalDot>.999);
  assert(pose('curved-dining-chair',detail,[x,z],[tx,tz],c.yaw+Math.PI).physicalDot<-.999,'180-degree reversal must be detectable');
  tested.push({kind:'dining',detail,id:c.id,physicalDot:p.physicalDot});
 }
 const c=audit.generatedFurniture.sittingAccentCandidates,target=c.sourceCoffeeTableCentre;
 for(const [x,z] of [...c.south,...c.north]){
  const previous=pose('sculptural-accent-chair',detail,[x,z],target,c.currentYaw);
  assert(previous.physicalDot<0,'Baseline fixed yaw faces away from original conversation centre');
  const yaw=faceTarget(x,z,...target),corrected=pose('sculptural-accent-chair',detail,[x,z],target,yaw);
  assert(corrected.physicalDot>.999);
  assert(pose('sculptural-accent-chair',detail,[x,z],target,yaw+Math.PI).physicalDot<-.999);
  tested.push({kind:'accent-candidate',detail,position:[x,z],oldDot:previous.physicalDot,proposedYaw:yaw,correctedDot:corrected.physicalDot});
 }
}
const coffee=audit.exactSourceRegister.find(e=>e.name==='FU - 008');
const sofa=audit.exactSourceRegister.find(e=>e.id==='2xEu3ohP52EhzvosO6BHlM');
const aabb=e=>new THREE.Box3(new THREE.Vector3(...e.min),new THREE.Vector3(...e.max));
assert(aabb(coffee).intersectsBox(aabb(sofa)),'Conservative baseline overlap must be recorded');
const dining=audit.rooms.find(r=>r.id==='G-DINING'),positiveZ=audit.generatedFurniture.chairs.filter(c=>c.localXZ[1]>.5);
assert.equal(positiveZ.length,2);
for(const chair of positiveZ)assert(chair.worldXZ[1]+.2575>dining.provisionalPlanBoundsXZ[3],'Provisional footprint boundary finding');
assert.equal(audit.releaseGates.visualAndFloorSupportPending,true);
assert.equal(audit.releaseGates.measuredClearancePending,true);
console.log('PHASE15A_SOURCE_AUDIT',JSON.stringify({exactSourceRecords:entries.length,rooms:audit.rooms.map(r=>({id:r.id,area:r.derivedRectangularAreaM2})),sourceLayersRead:files.size,diningPoseTests:tested.filter(t=>t.kind==='dining').length,accentCandidatePoseTests:tested.filter(t=>t.kind==='accent-candidate').length,negativeControls:tested.length,findings:audit.findings.map(f=>f.id),livePlacementApproved:false,tests:tested}));
