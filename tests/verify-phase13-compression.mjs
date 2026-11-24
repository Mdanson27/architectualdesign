import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeMeshoptPacket} from '../src/phase2/phase13-meshopt-packet.js';
import {createCompressedAssetLoader} from '../src/phase2/phase13-compressed-assets.js';
const source=JSON.parse(await fs.readFile('public/ifc/house/manifest.json','utf8'));
const output=JSON.parse(await fs.readFile('dist/ifc/house/manifest.json','utf8'));
assert.equal(source.layers.length,76);assert.equal(output.layers.length,76);
assert(output.phase13.lossless&&output.phase13.savingsPercent>=20);
let count=0,orig=0,packed=0,first,meshoptFirst,meshoptCount=0,preferred=0;
for(let i=0;i<source.layers.length;i++){
 const layer=source.layers[i],out=output.layers[i],{phase13Compression:meta,phase13Meshopt:alt,...untouched}=out;
 assert.deepEqual(untouched,layer);
 const original=await fs.readFile(path.join('public',layer.glb.slice(1)));
 const fallback=await fs.readFile(path.join('dist',layer.glb.slice(1)));
 assert(original.equals(fallback));orig+=original.length;
 if(alt){const compressed=await fs.readFile(path.join('dist',alt.path.slice(1)));
  assert.equal(compressed.length,alt.compressedBytes);assert(alt.compressedBytes<(meta?.compressedBytes??original.length));
  const decoded=await decodeMeshoptPacket(gunzipSync(compressed),original.length);assert(Buffer.from(decoded).equals(original));
  assert.equal(alt.sha256,createHash('sha256').update(original).digest('hex'));meshoptCount++;preferred+=compressed.length;
  meshoptFirst??={layer:out,compressed,original};
 }else preferred+=meta?.compressedBytes??original.length;
 if(!meta){packed+=original.length;continue;}
 const compressed=await fs.readFile(path.join('dist',meta.path.slice(1)));
 assert(gunzipSync(compressed).equals(original));
 assert.equal(meta.sha256,createHash('sha256').update(original).digest('hex'));
 assert.equal(meta.originalBytes,original.length);assert.equal(meta.compressedBytes,compressed.length);
 assert(meta.path.endsWith('.'+meta.sha256.slice(0,16)+'.gz'));packed+=compressed.length;count++;
 first??={layer:{...out,phase13Meshopt:undefined},compressed,original};
}
assert.equal(count,output.phase13.compressedLayers);assert.equal(orig,output.phase13.originalBytes);assert.equal(packed,output.phase13.compressedBytes);
let parseCalls=0,originalCalls=0;
const loader={parseAsync:async b=>{parseCalls++;assert(Buffer.from(b).equals(first.original));return 'compressed';},
 loadAsync:async()=>{originalCalls++;return 'original';}};
const mk=fetcher=>createCompressedAssetLoader({loader,assetURL:p=>p,fetcher});
const good=mk(async()=>new Response(first.compressed));
assert.equal(await good.load(first.layer),'compressed');assert.equal(good.status().compressedLayers,1);
const autoDecoded=mk(async()=>new Response(first.original));
assert.equal(await autoDecoded.load(first.layer),'compressed');
const broken=mk(async()=>new Response(new Uint8Array([1,2,3])));
assert.equal(await broken.load(first.layer),'original');assert.equal(broken.status().fallbacks,1);
const invalid=mk(async()=>{throw Error('network unavailable');});
assert.equal(await invalid.load(first.layer),'original');assert.equal(invalid.status().fallbacks,1);
const unsupported=createCompressedAssetLoader({loader,assetURL:p=>p,Decompress:null,fetcher:()=>{throw Error('must not fetch');}});
assert.equal(await unsupported.load(first.layer),'original');assert.equal(unsupported.status().fallbacks,0);
assert.equal(parseCalls,2);assert.equal(originalCalls,3);
assert.equal(meshoptCount,output.phase13.meshoptLayers);assert(meshoptCount>0);assert.equal(preferred,output.phase13.preferredBytes);assert(preferred<packed);
const altLoader={parseAsync:async b=>{assert(Buffer.from(b).equals(meshoptFirst.original));return 'meshopt';},loadAsync:async()=>{throw Error('unexpected original fallback');}};
const alt=createCompressedAssetLoader({loader:altLoader,assetURL:p=>p,fetcher:async()=>new Response(meshoptFirst.compressed)});
assert.equal(await alt.load(meshoptFirst.layer),'meshopt');assert.equal(alt.status().meshoptLayers,1);
const fallbackAlt=createCompressedAssetLoader({loader:altLoader,assetURL:p=>p,fetcher:async p=>p.endsWith('.meshopt.gz')?new Response(new Uint8Array([1,2,3])):new Response(await fs.readFile(path.join('dist',meshoptFirst.layer.phase13Compression.path.slice(1))))});
assert.equal(await fallbackAlt.load(meshoptFirst.layer),'meshopt');assert.equal(fallbackAlt.status().meshoptFallbacks,1);assert.equal(fallbackAlt.status().meshoptLayers,0);
console.log('PHASE13_MESHOPT_EXACT_PARITY',JSON.stringify({meshoptCount,preferred,packed,meshoptAdditionalBytesSaved:packed-preferred}));
console.log('PHASE13_EXACT_ROUNDTRIP_AND_FALLBACK',JSON.stringify({count,orig,packed,savingsPercent:output.phase13.savingsPercent,parseCalls,originalCalls}));

import * as THREE from 'three';
import {createPhase10Renderer} from '../src/phase2/phase10-render-optimizer.js';
import {foliageLodChoice} from '../src/phase2/phase13-render-lod.js';
import {bakeClampedAtlas,atlasUV} from '../scripts/phase13-atlas.mjs';
assert.equal(foliageLodChoice(18,false),true);assert.equal(foliageLodChoice(16,true),true);
assert.equal(foliageLodChoice(14,true),false);assert.equal(foliageLodChoice(16,false),false);
const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
const material=new THREE.MeshStandardMaterial(),foliage=[];
for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.22,9,7),material);
 mesh.name='STAGE8_TROPICAL_FOLIAGE_GROUP';mesh.userData={stage8:true,visualConceptOnly:true};mesh.position.x=i*.2;root.add(mesh);foliage.push(mesh);}
const other=new THREE.Mesh(new THREE.SphereGeometry(.22,9,7),material);other.position.x=1;root.add(other);
const records=[{mesh:other,category:'proxies',layer:{level:'ground'}}];
const saved=foliage.map(o=>o.geometry),system=createPhase10Renderer({scene,roots:[root],sourceRecords:records});
const camera=new THREE.PerspectiveCamera();const frames=[];
const renderer={render(s){let tris=0;s.traverseVisible(o=>{if(o.isMesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});frames.push(tris);}};
camera.position.set(0,0,30);system.render(renderer,camera,{allowLod:false});const high=frames.at(-1);
system.render(renderer,camera);const low=frames.at(-1);assert(low<high);assert(system.status().lastLodBatches>0);
camera.position.set(0,0,2);system.render(renderer,camera);assert.equal(frames.at(-1),high);
assert(foliage.every((o,i)=>o.geometry===saved[i]&&o.visible));assert(other.visible);
system.dispose();assert.equal(root.children.length,4);
const chart=(id,r,g,b)=>{const rgba=new Uint8Array(32*32*4);for(let i=0;i<rgba.length;i+=4)rgba.set([r,g,b,255],i);return {id,width:32,height:32,rgba,wrapS:'clamp',wrapT:'clamp',colorSpace:'srgb'};};
const aChart=chart('ivory',236,229,214),bChart=chart('taupe',129,110,95);
const atlas=bakeClampedAtlas([aChart,bChart],{gutter:8,maxSize:256});
assert.equal(atlas.maxSafeMip,3);assert.equal(atlas.levels.length,4);
for(let m=0;m<atlas.levels.length;m++){const level=atlas.levels[m],f=2**m;
 for(let i=0;i<2;i++){const region=atlas.regions[i],p=((region.y/f-1)*level.width+region.x/f-1)*4;
  assert.deepEqual([...level.rgba.subarray(p,p+4)],[...(i===0?aChart:bChart).rgba.subarray(0,4)]);}
}
assert(atlasUV(atlas.regions[0],0,0).every((n,i)=>n===atlas.regions[0].offset[i]));
assert.throws(()=>atlasUV(atlas.regions[0],2,0),/repeating/);
assert.throws(()=>bakeClampedAtlas([{...aChart,wrapS:'repeat'}]),/rejects/);
console.log('PHASE13_DECORATIVE_LOD_AND_ATLAS',JSON.stringify({highTriangles:high,farTriangles:low,nearRestored:true,originalFoliagePreserved:true,atlas:{width:atlas.width,charts:atlas.regions.length,safeMipLevels:atlas.levels.length,repeatRejected:true}}));
