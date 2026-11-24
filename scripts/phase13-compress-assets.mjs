import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {packGLB} from './phase13-meshopt-pack.mjs';
export async function buildCompressedAssets(root='dist'){
 const manifestPath=path.join(root,'ifc/house/manifest.json');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 let originalBytes=0,compressedBytes=0,compressedLayers=0,meshoptLayers=0,meshoptViews=0,preferredBytes=0;
 for(const layer of manifest.layers){
  if(!layer.glb)continue;
  if(!/^\/ifc\/house\/[A-Za-z0-9_.-]+\.glb$/.test(layer.glb))throw Error('Unsafe source path '+layer.glb);
  const original=await fs.readFile(path.join(root,layer.glb.slice(1)));
  const sha256=createHash('sha256').update(original).digest('hex');
  const compressed=gzipSync(original,{level:9});
  if(!gunzipSync(compressed).equals(original))throw Error('Lossless roundtrip failed: '+layer.name);
  delete layer.phase13Compression;
  originalBytes+=original.length;
  if(compressed.length<original.length){
   const sidecar=layer.glb+'.'+sha256.slice(0,16)+'.gz';
   await fs.writeFile(path.join(root,sidecar.slice(1)),compressed);
   layer.phase13Compression={encoding:'gzip',path:sidecar,originalBytes:original.length,compressedBytes:compressed.length,sha256};
   compressedLayers++;compressedBytes+=compressed.length;
  }else compressedBytes+=original.length;
  delete layer.phase13Meshopt;
  const packed=await packGLB(original);
  const gzipBytes=Math.min(original.length,compressed.length);
  if(packed){
   const encoded=gzipSync(packed.packet,{level:9});
   if(encoded.length<gzipBytes){
    const sidecar=layer.glb+'.'+sha256.slice(0,16)+'.meshopt.gz';
    await fs.writeFile(path.join(root,sidecar.slice(1)),encoded);
    layer.phase13Meshopt={encoding:'meshopt-gzip-v1',path:sidecar,originalBytes:original.length,
     compressedBytes:encoded.length,packetBytes:packed.packet.length,sha256,encodedViews:packed.encodedViews};
    meshoptLayers++;meshoptViews+=packed.encodedViews;preferredBytes+=encoded.length;continue;
   }
  }
  preferredBytes+=gzipBytes;
 }
 const report={layers:manifest.layers.length,compressedLayers,originalBytes,compressedBytes,
  savingsPercent:100*(1-compressedBytes/originalBytes),meshoptLayers,meshoptViews,preferredBytes,preferredSavingsPercent:100*(1-preferredBytes/originalBytes),lossless:true,originalFallbackRetained:true};
 if(!compressedLayers||report.savingsPercent<20||!meshoptLayers||!meshoptViews||preferredBytes>=compressedBytes)throw Error('Compression release gate failed: '+JSON.stringify(report));
 manifest.phase13={schema:'autominds.lossless-assets.v1',...report};
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(root,'ifc/house/phase13-compression-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PHASE13_LOSSLESS_ASSET_BUILD',JSON.stringify(report));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildCompressedAssets(process.argv[2]||'dist');
