import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SEATING15,createPhase15Seating,seatingStats} from '../src/phase2/phase15-seating.js';
import {faceTarget} from '../src/phase2/phase14abc-integration.js';
const results=[];
for(const id of Object.keys(SEATING15)){
 const pair=[];
 for(const detail of ['high','low']){
  const g=createPhase15Seating(id,{detail}),s=seatingStats(g);pair.push(s);
  assert(Math.abs(s.min[1])<1e-6,'ground anchor');
  const nominal=SEATING15[id];for(const [i,k] of ['width','height','depth'].entries())assert(Math.abs(s.dimensions[i]-nominal[k])<.16,id+' envelope '+k+' '+s.dimensions[i]);
  const names=g.children.map(m=>m.name);
  if(id==='main-sofa'){assert.equal(names.filter(n=>n.startsWith('individual-seat-cushion')).length,3);assert(names.includes('continuous-walnut-outer-wrap'));assert(names.includes('enveloping-upholstered-arms-and-back'));}
  if(id==='rest-sofa'){assert.equal(names.filter(n=>n==='single-rest-seat').length,1);for(const n of ['asymmetric-crescent-backrest','dark-contour-piping','draped-folded-throw'])assert(names.includes(n));}
  if(id==='accent-chair')assert(names.includes('vertically-ribbed-wraparound-shell'));
  const back=g.getObjectByName('backrest-landmark'),seat=g.getObjectByName(id==='main-sofa'?'individual-seat-cushion-2':id==='rest-sofa'?'single-rest-seat':'deep-seat-cushion');
  const center=o=>new THREE.Box3().setFromObject(o,true).getCenter(new THREE.Vector3());
  assert(center(back).z-center(seat).z>.15,'physical backrest behind seat');
  const parent=new THREE.Group();parent.add(g);
  for(const [x,z,tx,tz] of [[3,2,0,0],[-2,4,0,0],[0,-3,0,0],[3,0,0,0]]){
   g.position.set(x,0,z);g.rotation.y=faceTarget(x,z,tx,tz);parent.updateMatrixWorld(true);
   const target=new THREE.Vector3(tx-x,0,tz-z).normalize();
   const front=new THREE.Vector3(0,0,-1).transformDirection(g.matrixWorld);
   assert(front.dot(target)>.999);
   // Backrest/pillow for asymmetrical model may be laterally offset, but
   // must remain behind the seat along the actual world forward axis.
   assert(center(seat).sub(center(back)).dot(front)>.15);
   g.rotation.y+=Math.PI;parent.updateMatrixWorld(true);
   assert(new THREE.Vector3(0,0,-1).transformDirection(g.matrixWorld).dot(target)<-.999);
  }
  g.traverse(o=>{if(o.isMesh){for(const a of ['position','normal','uv'])assert(o.geometry.attributes[a]);assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  g.userData.dispose();
 }
 assert(pair[0].triangles>pair[1].triangles);
 assert(pair[0].triangles<100000,'high LOD budget');assert(pair[1].triangles<25000,'low LOD budget');
 results.push(...pair);
}
console.log('PHASE15B_SEATING_GEOMETRY',JSON.stringify(results));
