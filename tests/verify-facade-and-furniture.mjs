import assert from 'node:assert/strict';
import * as THREE from 'three';
import {isVerifiedFirstFloorGlassInfill,auditFacadeInfills} from '../src/phase2/facade-infills.js';
import {createPlanDiningFurniture} from '../src/phase2/dining-furnishings.js';
import {buildBedroomDecorations} from '../src/phase2/house-enhancements.js';
import {buildSourceApertures} from '../src/phase2/door-apertures.js';

const scene=new THREE.Scene(),origin=new THREE.Vector3(101,0,-12);
function record(name,level,category,bounds){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,ifcType:category,guid:'GUID-'+name+'-'+records.length};
 const box=new THREE.Box3(new THREE.Vector3(...bounds[0]),new THREE.Vector3(...bounds[1]))
   .translate(new THREE.Vector3(-origin.x,0,-origin.z));
 const r={mesh,box,layer:{level},category};records.push(r);return r;
}
const records=[];
record('SLA - 012','first','slabs',[[112.72,3.69,-4.31],[114.22,5.79,-4.28]]);
record('SLA - 012','first','slabs',[[114.89,3.69,-4.31],[116.39,5.79,-4.28]]);
record('SLA - 012','first','slabs',[[114.94,4.04,-4.59],[117.46,5.37,-4.55]]);
record('SLA - 014','first','slabs',[[112.72,3.30,-2.2],[117.5,3.5,-1.7]]);
record('SW - 023','first','walls',[[112.45,3.3,-4.49],[117.6,6.6,-4.29]]);
record('FU - 010','first','furniture',[[115.01,3.3,-7],[117.81,4.2,-5]]);
record('FU - 005','ground','furniture',[[112.20,.87,-.62],[112.4,2.5,-.41]]);
const originalMaterials=records.map(r=>r.mesh.material);
const infill=auditFacadeInfills(records,()=>true,origin);
assert.equal(infill.sourceAlignedPanels,3);
assert.equal(infill.panels.length,3);
assert(infill.panels.every(p=>p.source.mesh.material.transparent));
assert(records[3].mesh.material===originalMaterials[3],'non-matching horizontal slab is untouched');
assert(records[4].mesh.material===originalMaterials[4],'structural wall retains material');
assert(isVerifiedFirstFloorGlassInfill({name:'SLA - 012'},records[0].box,'first',origin));
const panel=infill.panels[0];
const a=panel.position.clone().add(new THREE.Vector3(0,0,-1)),b=panel.position.clone().add(new THREE.Vector3(0,0,.01));
assert(infill.blocksTraversal(a,b,3.3),'fixed transparent panels remain a barrier');
const fakeWindow={
 windows:[],
};
const reg=buildSourceApertures({doors:[]},records,()=>true,fakeWindow,infill);
assert.equal(reg.windowCutCount,3,'verified glass should create corresponding wall apertures');
const furnished=createPlanDiningFurniture(scene,origin,records);
assert.equal(furnished.chairs,6);
assert.equal(furnished.root.children.filter(x=>/^DINING_CHAIR_/.test(x.name)).length,6);
assert.equal(furnished.collisionBoxes.length,7);
assert(Math.abs(furnished.root.position.x-(115.05-origin.x))<.001,
 'six-seat dining group must be shifted east to clear kitchen entrance');
assert(furnished.sourceSet.size>=1,'stray isolated source furnishing replaced');
const [table,...chairs]=furnished.collisionBoxes;
assert(chairs.every(chair=>!chair.intersectsBox(table)),'six chairs must not overlap table');
const bedrooms=buildBedroomDecorations(records,scene);
assert.equal(bedrooms.visualBeds.length,1);
const footprint=bedrooms.visualBeds[0].userData.footprint_m;
assert(footprint[0]<=1.68&&footprint[1]<=2.06,'oversized bed constrained');
assert(bedrooms.collisionBoxes[0].getSize(new THREE.Vector3()).x<2.8,'bed collision follows resized model');
assert.deepEqual(records.map(r=>r.mesh.geometry.attributes.position.count),
 records.map(r=>r.mesh.geometry.attributes.position.count),'original vertices untouched');
console.log(JSON.stringify({passed:true,firstFloorGlazedPanels:infill.sourceAlignedPanels,
 balconyGlazingWallOpenings:reg.windowCutCount,chairs:furnished.chairs,
 sourceFurnitureConcealed:furnished.sourceSet.size,resizedBedFootprint:footprint,
 sourceIFCMeshesPreserved:true}));
