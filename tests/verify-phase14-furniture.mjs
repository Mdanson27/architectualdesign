import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {FURNITURE_CATALOG,createFurnitureAsset,furnitureStats} from '../src/phase2/phase14-furniture-library.js';
const manifest=JSON.parse(await fs.readFile('dist/furniture/manifest.json','utf8'));
assert.equal(manifest.assets.length,Object.keys(FURNITURE_CATALOG).length);
const eps=1e-5;let high=0,low=0;
for(const a of manifest.assets){
 assert(FURNITURE_CATALOG[a.id]);assert.equal(a.clientApproved,false);
 for(const detail of ['high','low']){
  const v=a.variants[detail],model=createFurnitureAsset(a.id,{detail}),stats=furnitureStats(model);
  assert(stats.triangles>0&&stats.triangles<100000);
  assert(stats.dimensions.every((n,i)=>Math.abs(n-a.dimensions[i])<eps));assert(Math.abs(stats.min[1])<eps);
  model.traverse(o=>{if(o.isMesh){assert(o.material.isMeshStandardMaterial);assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  assert.equal(stats.triangles,v.triangles);
  const data=await fs.readFile(path.join('dist',v.path.slice(1)));
  assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(8),data.length);
  assert.equal(createHash('sha256').update(data).digest('hex'),v.sha256);
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  assert(json.meshes.length>0&&json.materials.length>0);
  for(const mat of json.materials.filter(m=>/^PHASE14_(cream|taupe|sage|ivory|textile|walnut|timber|stone)$/.test(m.name??''))){const texture=json.textures[mat.pbrMetallicRoughness.baseColorTexture.index];assert.equal(json.images[texture.source].mimeType,'image/png');}
  if(detail==='high')high+=stats.triangles;else low+=stats.triangles;
 }
 assert(a.variants.low.triangles<a.variants.high.triangles);
}
assert(low<high);
console.log('PHASE14_LIBRARY_QA',JSON.stringify({assets:manifest.assets.length,variants:manifest.assets.length*2,highTriangles:high,lowTriangles:low,allBoundsValid:true,allHashesValid:true}));

const referenceTags={ 'curved-sofa':['rounded-wrap-arm','separate-deep-seat-cushion'],'rest-chaise':['single-raised-side','folded-draped-throw'],'sculptural-accent-chair':['floor-hugging-vertically-ribbed-barrel-shell','concealed-plinth'],'curved-dining-chair':['continuous-curved-walnut-back-and-arm'],'sculptural-dining-table':['hourglass-fluted-timber-pedestal','oval-dark-timber-top'],'rounded-coffee-table':['low-round-drum-base','tall-round-drum-base'],'fluted-writing-desk':['vertical-fluted-writing-desk-support'],'balcony-chair':['slender-weather-resistant-frame','outdoor-seat-cushion','separate-light-back-cushion'],'upholstered-bed':['twin-upholstered-headboard-panel'],'layered-pendant':['tapered-ceramic-pendant-shade']};
for(const [id,tags] of Object.entries(referenceTags)){const model=createFurnitureAsset(id);const names=model.children.map(m=>m.name);for(const tag of tags)assert(names.includes(tag),id+' missing '+tag);if(id==='sculptural-accent-chair')assert(!names.includes('tapered-timber-foot'));}
console.log('PHASE14_REFERENCE_FEATURES',JSON.stringify({checked:Object.keys(referenceTags).length,features:Object.values(referenceTags).flat().length}));
