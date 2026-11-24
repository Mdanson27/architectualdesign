import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPhase10Renderer,createPhase10SpatialIndex,PHASE10_BUDGET}
 from '../src/phase2/phase10-render-optimizer.js';

const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
root.position.set(-12,0,3);
const material=new THREE.MeshStandardMaterial({color:0xb4a590});
const glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.4});
const objects=[];
function add(g,m,x,z){
 const o=new THREE.Mesh(g,m);o.position.set(x,.7,z);root.add(o);objects.push(o);return o;
}
const shared=new THREE.BoxGeometry(.5,1,.4);
for(let i=0;i<5;i++)add(shared,material,12+i*.55,-2);
const mergeA=add(new THREE.BoxGeometry(.3,.6,.3),material,12.4,-.7);
const mergeB=add(new THREE.BoxGeometry(.7,.6,.3),material,13.4,-.7);
const transparent=add(new THREE.BoxGeometry(.3,.6,.3),glass,14,-.7);
const invisible=add(shared,material,14,1);invisible.visible=false;
scene.updateMatrixWorld(true);
const saved=objects.map(o=>({geometry:o.geometry,material:o.material,
 matrix:o.matrixWorld.clone(),visible:o.visible}));
const system=createPhase10Renderer({scene,roots:[root]});
const initial=system.status();
assert(initial.instancedBatches>=1,JSON.stringify(initial));
assert(initial.mergedBatches>=1,JSON.stringify(initial));
assert(initial.extraBytes<=PHASE10_BUDGET.maxExtraBytes);
assert.equal(initial.generatedMeshes,7);
const frames=[];
const camera=new THREE.PerspectiveCamera();
const fake={render(s){
 const visible=[];s.traverseVisible(o=>{if(o.isMesh)visible.push(o)});
 frames.push(visible);
}};
system.render(fake,camera,{optimized:false});
assert.equal(frames.at(-1).length,8);
system.render(fake,camera);
assert.equal(frames.at(-1).length,3);
assert(frames.at(-1).includes(transparent));
assert(!frames.at(-1).includes(invisible));
assert.equal(system.status().lastSavedSubmissions,5);
for(let i=0;i<objects.length;i++){
 const o=objects[i],before=saved[i];
 assert.equal(o.geometry,before.geometry);assert.equal(o.material,before.material);
 assert(o.matrixWorld.equals(before.matrix));assert.equal(o.visible,before.visible);
}
// Existing raycasts and inspection still see original meshes, never proxy batches.
assert(root.children.filter(o=>o.userData.phase10RenderOnly).every(o=>!o.visible));
const sourceMatrix=objects[0].matrixWorld.clone();
objects[0].position.x+=.2;
system.render(fake,camera);
assert(frames.at(-1).includes(objects[0]),'changed transform must use original');
objects[0].position.x-=.2;
system.render(fake,camera);
assert(objects[0].matrixWorld.equals(sourceMatrix));
assert.equal(frames.at(-1).length,3);
mergeA.visible=false;
system.render(fake,camera);
assert(!frames.at(-1).includes(mergeA));
assert(frames.at(-1).includes(mergeB));
mergeA.visible=true;
const old=mergeB.material;
mergeB.material=new THREE.MeshStandardMaterial({color:0xff0000});
system.render(fake,camera);assert(frames.at(-1).includes(mergeB));
mergeB.material=old;
assert.throws(()=>system.render({render(){throw Error('render failure')}},camera),/render failure/);
assert(objects.filter(o=>o!==invisible).every(o=>o.visible));
assert(root.children.filter(o=>o.userData.phase10RenderOnly).every(o=>!o.visible));
system.dispose();
assert.equal(root.children.length,objects.length);
assert.equal(shared.attributes.position.count,24);

const records=[];
for(let x=-10;x<10;x++)for(let z=-10;z<10;z++){
 records.push({box:new THREE.Box3(new THREE.Vector3(x,0,z),
 new THREE.Vector3(x+.4,3,z+.8)),visible:(x+z)%3!==0});
}
records.push({box:new THREE.Box3(new THREE.Vector3(-50,-1,-50),
 new THREE.Vector3(50,0,50)),visible:true});
const index=createPhase10SpatialIndex(records,2);
const isVisible=r=>r.visible;
function oldNearby(x,y,z,dist){
 return records.filter(r=>r.visible&&x>=r.box.min.x-dist&&x<=r.box.max.x+dist&&
 z>=r.box.min.z-dist&&z<=r.box.max.z+dist&&y>=r.box.min.y-2&&y<=r.box.max.y+3);
}
for(let i=0;i<500;i++){
 const x=Math.sin(i)*13,z=Math.cos(i*1.37)*13,y=(i%7)-2,dist=[.15,.65,1.3,3][i%4];
 assert.deepEqual(index.query(x,y,z,dist,isVisible),oldNearby(x,y,z,dist));
}
records[0].visible=!records[0].visible;
assert.deepEqual(index.query(-10,1,-10,1,isVisible),oldNearby(-10,1,-10,1));
const spatial=index.status();
assert(spatial.examined<spatial.fullScanEquivalent*.2);
console.log('PHASE10_STATIC_BATCH_AND_SPATIAL_QA',JSON.stringify({
 instancedBatches:initial.instancedBatches,mergedBatches:initial.mergedBatches,
 syntheticOriginalDraws:8,syntheticOptimizedDraws:3,originalsPreserved:true,
 dynamicFallbackVerified:true,spatialQueries:spatial.queries,
 candidatesExamined:spatial.examined,fullScanEquivalent:spatial.fullScanEquivalent
}));
