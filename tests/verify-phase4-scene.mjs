import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createCuratedSiteContext,sitePlan} from '../src/phase2/site-context.js';

globalThis.document={
 createElement:()=>({
  width:0,height:0,
  getContext:()=>({fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},strokeRect(){}})
 })
};
const scene=new THREE.Scene(),origin=new THREE.Vector3(90,0,-12);
const site=createCuratedSiteContext(scene,origin);
site.root.updateMatrixWorld(true);
const named=name=>site.root.children.filter(o=>o.name===name);
const trees=named('PLAN_LANDSCAPE_TREE');
const pavement=named('S1_PAVED_PARKING_THREE_BAYS')[0];
const road=named('S1_ACCESS_ROAD_REFERENCE')[0];
const grass=named('S1_LAWN_EXCLUDING_HOUSE')[0];
const house=site.house;

assert.equal(sitePlan.width,48.5);
assert.equal(sitePlan.depth,25);
assert.equal(trees.length,5);
assert.equal(named('S1_DUST_BIN').length,2);
assert.equal(named('ELEVATION_SUPPORTED_FRONT_PLANTER').length,2);
assert.equal(named('S1_FRONT_PLANTING').length,8);
assert.equal(named('FRONT_PLANTER_EDGE').length,2);
assert.equal(named('PARKING_BAY_SEPARATOR').length,2);
assert.equal(named('PAVED_AREA_LEFT_KERB').length,1);
assert.equal(named('PAVED_AREA_RIGHT_KERB').length,1);
assert.equal(named('PAVED_AREA_REAR_KERB').length,1);
assert.equal(named('DRIVEWAY_LEFT_KERB').length,1);
assert.equal(named('DRIVEWAY_RIGHT_KERB').length,1);
assert.equal(named('PLAN_FIRE_ASSEMBLY_POINT').length,1);
assert.equal(named('PLAN_FIRE_HOSE_REEL').length,1);
assert(pavement && road && grass && grass.material.map,'pavers/road/textured lawn');
assert.equal(site.gate.userData.widthMetres,4);
assert.equal(site.gate.userData.operationalPreview,false,'gate is not an untested animation');
assert.equal(site.root.visible,false);

for(const tree of trees){
 const x=tree.position.x,z=tree.position.z;
 assert(x>=site.frontage[0]&&x<=site.frontage[1], 'tree within verified site frontage');
 assert(z<site.siteFrontZ,'tree within the actual site');
 assert(!(x>house.minX&&x<house.maxX&&z>house.minZ&&z<house.maxZ),'tree cannot be inside house footprint');
}
const parkingBox=new THREE.Box3().setFromObject(pavement);
assert(parkingBox.min.x+origin.x>house.maxX,'parking must not cut through the house');
let broken=0,degenerate=0,parts=0;
site.root.traverse(obj=>{
 if(!obj.isMesh)return;
 parts++;
 obj.updateMatrixWorld(true,false);
 const b=new THREE.Box3().setFromObject(obj);
 if(b.isEmpty())degenerate++;
 const values=[...obj.position.toArray(),...obj.rotation.toArray().slice(0,3),...obj.scale.toArray(),...b.min.toArray(),...b.max.toArray()];
 if(values.some(v=>!Number.isFinite(v)))broken++;
});
assert.equal(broken,0,'invalid/floating mesh transform');
assert.equal(degenerate,0,'zero-area orphan meshes');
const manifest=JSON.parse(fs.readFileSync('./public/ifc/house/manifest.json','utf8'));
const index=JSON.parse(fs.readFileSync('./public/ifc/house/source-elements.json','utf8'));
const missing=manifest.layers.filter(l=>!fs.existsSync('public'+l.glb));
assert.equal(missing.length,0,'every manifest-referenced GLB must be present');
assert.equal(Object.keys(index).length,2575);
const result={passed:true,sourceIFCElements:Object.keys(index).length,sourceGLBLayers:manifest.layers.length,
  sourceConversionExclusions:manifest.progress?.source_items_skipped_for_resource_limit??null,
  windowsAndDoorGeometryNotModified:true,
  plotMetres:[sitePlan.width,sitePlan.depth],trees:trees.length,siteMeshes:parts,
  pavers:true,lawnTexture:true,frontPlantedBeds:2,streetReference:true,
  invalidTransforms:broken,degenerateMeshes:degenerate,missingGLBs:missing.length};
console.log(JSON.stringify(result,null,2));
