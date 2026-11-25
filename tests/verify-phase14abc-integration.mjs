import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildClippedFloor} from '../src/phase2/phase14abc-flooring.js';
import {faceTarget,facingDot,installFittedAsset,auditFurniture} from '../src/phase2/phase14abc-integration.js';
const poly=[[0,0],[2.13,0],[2.13,.78],[.81,.78],[.81,1.91],[0,1.91]];
const full=buildClippedFloor({polygon:poly,datum:0,sample:()=>({y:0})});
assert(Math.abs(full.supportedArea-full.polygonArea)<1e-6,JSON.stringify(full));assert(full.cutFragments>0);
assert(full.geometry.attributes.normal.array.every(Number.isFinite));
const hole=buildClippedFloor({polygon:poly,datum:0,sample:(x,z)=>x>.95?null:{y:0}});
assert(hole.skippedArea>0&&hole.supportedArea<full.supportedArea);
assert(Math.abs(hole.supportedArea+hole.skippedArea-full.polygonArea)<1e-6);
for(const [x,z] of [[-1,0],[1,0],[0,-1],[0,1]])assert(facingDot(faceTarget(x,z,0,0),x,z,0,0)>.999);
const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.BoxGeometry(.52,.9,.51)));
const old=group.children[0],undo=installFittedAsset(group,'curved-dining-chair',[-.26,0,-.255],[.26,.9,.255]);
assert(!old.visible);assert.equal(auditFurniture({dining:group},[]).systems.dining.libraryInstances,1);
assert(group.children.filter(m=>m.visible).every(m=>m.userData.phase14Asset==='curved-dining-chair'));
undo();assert.equal(group.children.length,1);assert(old.visible);
console.log('PHASE14ABC_UNIT',JSON.stringify({fullArea:full.supportedArea,cutFragments:full.cutFragments,missingArea:hole.skippedArea,orientation:4,reversibleReplacement:true}));

import {createTailoredSectional,replaceSofaVisual} from '../src/phase2/phase14abc-sofas.js';
for(const chaise of ['left','right','none']){
 const g=createTailoredSectional({width:2.4,depth:1.65,height:.85,chaise});
 assert(g.children.filter(o=>o.name.includes('individual-deep-seat')).length>=3);
 assert.equal(g.children.some(o=>o.name.includes('long-chaise')),chaise!=='none');
 assert(g.children.every(o=>o.geometry.attributes.position.array.every(Number.isFinite)));
}
const sofaRoot=new THREE.Group(),oldSofa=new THREE.Mesh(new THREE.BoxGeometry(2.5,.85,1.65),new THREE.MeshStandardMaterial());
oldSofa.position.set(3,.425,4);oldSofa.userData={sourceRegion:'test',originalGUID:'test-guid'};sofaRoot.add(oldSofa);sofaRoot.updateMatrixWorld(true);
const oldGeo=oldSofa.geometry,oldWorld=oldSofa.matrixWorld.clone(),oldBounds=new THREE.Box3().setFromObject(oldSofa);
const fitted=replaceSofaVisual(oldSofa,oldBounds,new THREE.Vector3(3,0,6),sofaRoot);
assert(fitted?.oldMeshNotRendered&&fitted.collisionTransformPreserved&&fitted.visualWithinPriorBounds&&fitted.facingDot>.999);
assert.equal(oldSofa.geometry,oldGeo);assert(oldSofa.matrixWorld.elements.every((v,i)=>Math.abs(v-oldWorld.elements[i])<1e-6));assert(!oldSofa.material.visible);
assert.equal(sofaRoot.children.length,1);
console.log('PHASE14ABC_REAL_SOFA_REPLACEMENT',JSON.stringify({variants:3,oldSurfaceHidden:true,originalCollisionPreserved:true}));

import {replaceCoffeeTableVisual} from '../src/phase2/phase14abc-sofas.js';
const tableRoot=new THREE.Group(),sourceTable=new THREE.Mesh(new THREE.BoxGeometry(1.2,.5,.6),new THREE.MeshStandardMaterial());
sourceTable.position.set(0,.25,0);sourceTable.userData={sourceRegion:'family-coffee-table'};tableRoot.add(sourceTable);tableRoot.updateMatrixWorld(true);
const tableReplacement=replaceCoffeeTableVisual(sourceTable,new THREE.Box3().setFromObject(sourceTable),tableRoot);
assert(tableReplacement?.oldMeshNotRendered&&tableReplacement.collisionTransformPreserved&&tableReplacement.visualWithinPriorBounds);
assert.equal(tableRoot.children.length,1);assert.equal(sourceTable.material.visible,false);
const briefSofa=createTailoredSectional({width:2.4,depth:1.65,height:.85,chaise:'left'});
assert.equal(briefSofa.children.filter(o=>o.name.includes('individual-deep-seat')).length,3);
assert.equal(briefSofa.children.filter(o=>o.name.includes('walnut-side-wrap-trim')).length,2);
console.log('PHASE14ABC_BRIEF_SOFA_TABLE',JSON.stringify({mainSofaSeats:3,walnutTrim:true,familyCoffeeTableReplacement:true}));
