import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSourceBalconyRestoration,BALCONY_SPECS} from '../src/phase2/balcony-restoration.js';
import {createHouseLighting,LIGHTING_ZONES} from '../src/phase2/lighting-system.js';
import {findPhysicalRoute,PLAN_ROUTE_TARGETS} from '../src/phase2/circulation-routes.js';

const make=(name,category,level,bounds,guid)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,guid};
 return {mesh,category,layer:{level},box:new THREE.Box3(
  new THREE.Vector3(bounds[0],bounds[1],bounds[2]),
  new THREE.Vector3(bounds[3],bounds[4],bounds[5]))};
};
const src=[
 make('SLA - 005','proxies','first',[107.64,2.8,.04,110.08,3.2,1.55],'west-slab'),
 make('DOO - 003','proxies','first',[108.01,3.3,-.18,109.59,5.84,.06],'west-door'),
 make('SLA - 005','proxies','first',[112.17,2.82,-2.66,119.14,3.2,1.4],'family-slab'),
 make('DOO - 003','proxies','first',[113.64,3.3,-.17,116.22,5.84,.07],'family-door'),
 make('SW - 024','walls','first',[112.17,3.17,1.18,119.18,6.6,1.4],'wrong-outer-wall'),
 make('SW - 021','walls','first',[112.4,3.3,-.15,117.12,6.6,.05],'correct-inner-wall'),
 make('SLA - 005','proxies','first',[119.93,2.8,-9.45,122.63,3.2,-5.51],'east-slab'),
 make('DOO - 002','proxies','first',[119.71,3.3,-8.93,119.95,5.84,-5.86],'east-door'),
 make('SW - 024','walls','first',[122.41,3.17,-9.26,122.63,6.6,-5.51],'wrong-east-outer-wall'),
 make('SW - 024','walls','first',[119.93,3.17,-9.45,122.63,6.6,-9.23],'wrong-east-end-wall'),
 make('SW - 024','walls','first',[119.73,3.17,-5.73,122.63,6.6,-5.51],'wrong-east-side-wall'),
 make('SW - 004','walls','first',[119.72,3.3,-9.25,119.73,6.6,-4.49],'correct-door-wall')
];
const original=src.map(r=>({geometry:r.mesh.geometry,
  vertices:[...r.mesh.geometry.attributes.position.array],
  bounds:r.box.clone()}));
const scene=new THREE.Scene();
const restoration=createSourceBalconyRestoration(src,scene,new THREE.Vector3());
assert.equal(restoration.summary.restored,3);
assert.equal(restoration.summary.concealedOpaqueEdgeMeshes,4);
assert.equal(restoration.root.children.length,3);
assert.equal(restoration.summary.expected,BALCONY_SPECS.length);
assert(!restoration.concealed.has(src[5]),'valid inner structural wall must survive');
assert(!restoration.concealed.has(src[11]),'stair/room boundary must survive');
assert.equal(restoration.summary.balconies.every(x=>x.verified&&x.sourceSlabCount>0&&x.sourceEntranceGuids.length>0),true);
assert(restoration.root.children.every(x=>x.children.some(c=>c.name.startsWith('S2_GLAZED_BALCONY_GUARD_'))));
const barrier=restoration.blocksTraversal(new THREE.Vector3(115,3.2,.85),
 new THREE.Vector3(115,3.2,1.31),3.2,.28);
assert(barrier,'glass balcony guard must block approach to exposed edge');
for(let i=0;i<src.length;i++){
 assert(src[i].box.equals(original[i].bounds));
 assert.strictEqual(src[i].mesh.geometry,original[i].geometry);
 assert.deepEqual([...src[i].mesh.geometry.attributes.position.array],original[i].vertices);
}
const missing=createSourceBalconyRestoration(src.filter(r=>r.mesh.userData.ifc.guid!=='family-door'),
  new THREE.Scene(),new THREE.Vector3());
assert.equal(missing.summary.restored,2,'must not invent balconies if original door is missing');

const lighting=createHouseLighting(scene,new THREE.Vector3());
assert.equal(lighting.summary.fixtureConcepts,14);
assert.equal(LIGHTING_ZONES.length,14);
let status=lighting.update({night:true,enabled:true});
assert.equal(status.activeEmitters,14);
assert(status.fixtures.every(f=>f.intensity>0&&!f.shadowCasting));
status=lighting.update({enabled:false});
assert.equal(status.night,true);
assert.equal(status.activeEmitters,0,'house lighting switch is independent of night');
status=lighting.update({night:false});
assert.equal(status.activeEmitters,0,'day toggle cannot switch house lights back on');
status=lighting.update({enabled:true});
assert.equal(status.activeEmitters,14,'lighting can operate in daylight');

const grid=(x,z)=>Math.abs(z)>3.5?null:{y:0};
const barrierX=1.0;
const blocked=(x,z,nx,nz)=>(x<barrierX&&nx>=barrierX||x>=barrierX&&nx<barrierX)&&Math.abs(z)>.7;
const pass=findPhysicalRoute({start:[0,0],end:[2.5,0],level:0,ground:grid,blocked,gridStep:.5});
assert(pass.ok&&pass.points.length>=4,'uninterrupted route traverses only defined gap');
const impossible=findPhysicalRoute({start:[0,0],end:[2.5,0],level:0,ground:grid,
 blocked:(x,z,nx,nz)=>(x<barrierX&&nx>=barrierX)||(x>=barrierX&&nx<barrierX),gridStep:.5,
 maxVisited:100});
assert(!impossible.ok,'route tester must not permit passing through a solid wall');
assert.equal(PLAN_ROUTE_TARGETS.length,4);
console.log(JSON.stringify({passed:true,balconies:restoration.summary.restored,
 opaqueWallsSuppressed:restoration.concealed.size,sourceVerticesPreserved:true,
 guardedEdges:true,lightingFixtures:status.groupCount,
 togglesIndependent:true,routeGraphChecks:true}));
