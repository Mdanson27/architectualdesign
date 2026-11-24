import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadingConcurrency,loadLayersInOrder,createPhase11Residency,PHASE11_POLICY} from '../src/phase2/phase11-residency.js';
assert.equal(loadingConcurrency(4),1);assert.equal(loadingConcurrency(8),2);
let active=0,peak=0;const attached=[],errors=[];
const result=await loadLayersInOrder([0,1,2,3,4],{concurrency:2,
 load:async n=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,n===0?12:1));active--;if(n===2)throw Error('expected');return n;},
 attach:async(n,v)=>{assert.equal(n,v);attached.push(n);},onError:n=>errors.push(n)});
assert.deepEqual(attached,[0,1,3,4]);assert.deepEqual(errors,[2]);assert.equal(peak,2);
assert.deepEqual(result,{loaded:4,failed:1,peak:2,concurrency:2});
let time=0,disposed=0;const system=createPhase11Residency({now:()=>time});
const camera=new THREE.PerspectiveCamera(60,1,.1,100),renderer={shadowMap:{enabled:false}};
const geometry=new THREE.BoxGeometry(1,1,1);geometry.computeBoundingBox();
geometry.addEventListener('dispose',()=>disposed++);
const mesh=new THREE.Mesh(geometry);mesh.position.set(0,0,-10);mesh.updateMatrixWorld(true);
const step=(owned=true,active=true)=>{system.begin(camera,renderer);system.observe(mesh,{owned,active,bytes:100});};
step();assert.equal(system.status().resident,1);
camera.lookAt(0,0,10);time=1000;step();assert.equal(disposed,0);
time=PHASE11_POLICY.retentionMs+1000;step();assert.equal(disposed,1);assert.equal(system.status().resident,0);
assert.equal(geometry.attributes.position.count,24);
step();assert.equal(disposed,1);
camera.lookAt(0,0,-10);step();assert.equal(system.status().reentries,1);assert.equal(system.status().resident,1);
camera.position.set(0,0,-8);camera.lookAt(0,0,0);time+=30000;step();assert.equal(disposed,1);
camera.position.set(0,0,0);camera.lookAt(0,0,10);time+=30000;step(false);assert.equal(disposed,1);
renderer.shadowMap.enabled=true;step();assert.equal(disposed,1);
console.log('PHASE11_ORDERED_LOADING_AND_RESIDENCY',JSON.stringify({result,peak,residency:system.status(),sourceArraysPreserved:true}));
