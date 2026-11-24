import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createCompressedAssetLoader} from '../src/phase2/phase13-compressed-assets.js';
const source=JSON.parse(await fs.readFile('public/ifc/house/manifest.json','utf8'));
const output=JSON.parse(await fs.readFile('dist/ifc/house/manifest.json','utf8'));
assert.equal(source.layers.length,76);assert.equal(output.layers.length,76);
assert(output.phase13.lossless&&output.phase13.savingsPercent>=20);
let count=0,orig=0,packed=0,first;
for(let i=0;i<source.layers.length;i++){
 const layer=source.layers[i],out=output.layers[i],{phase13Compression:meta,...untouched}=out;
 assert.deepEqual(untouched,layer);
 const original=await fs.readFile(path.join('public',layer.glb.slice(1)));
 const fallback=await fs.readFile(path.join('dist',layer.glb.slice(1)));
 assert(original.equals(fallback));orig+=original.length;
 if(!meta){packed+=original.length;continue;}
 const compressed=await fs.readFile(path.join('dist',meta.path.slice(1)));
 assert(gunzipSync(compressed).equals(original));
 assert.equal(meta.sha256,createHash('sha256').update(original).digest('hex'));
 assert.equal(meta.originalBytes,original.length);assert.equal(meta.compressedBytes,compressed.length);
 assert(meta.path.endsWith('.'+meta.sha256.slice(0,16)+'.gz'));packed+=compressed.length;count++;
 first??={layer:out,compressed,original};
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
console.log('PHASE13_EXACT_ROUNDTRIP_AND_FALLBACK',JSON.stringify({count,orig,packed,savingsPercent:output.phase13.savingsPercent,parseCalls,originalCalls}));
