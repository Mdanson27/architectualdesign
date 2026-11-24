import {decodeMeshoptPacket,meshoptSupported} from './phase13-meshopt-packet.js';

// Explicit gzip sidecars work on static hosts without custom response headers.
// Original GLBs remain available for unsupported browsers, stale caches or
// malformed sidecars. No geometry is quantized, simplified or regenerated.
export function createCompressedAssetLoader({loader,assetURL,fetcher=globalThis.fetch,Decompress=globalThis.DecompressionStream}){
 const stats={compressedLayers:0,originalLayers:0,fallbacks:0,compressedBytes:0,originalEquivalentBytes:0,meshoptLayers:0,meshoptFallbacks:0};
 const safeMeshopt=/^\/ifc\/house\/[A-Za-z0-9_.-]+\.glb\.[a-f0-9]{16}\.meshopt\.gz$/;
 const safePath=/^\/ifc\/house\/[A-Za-z0-9_.-]+\.glb\.[a-f0-9]{16}\.gz$/;
 async function verifyHash(bytes,hash){
  if(globalThis.crypto?.subtle&&typeof hash==='string'){
   const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
   const hex=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   if(hex!==hash)throw Error('Source digest mismatch');
  }
 }
 async function unpack(raw,expected,max){
  if(raw[0]!==0x1f||raw[1]!==0x8b){
   if(raw.byteLength!==expected)throw Error('Unexpected decoded packet size');return raw;
  }
  const reader=new Blob([raw]).stream().pipeThrough(new Decompress('gzip')).getReader();
  const out=new Uint8Array(expected);let offset=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;
   if(offset+value.byteLength>max||offset+value.byteLength>expected){await reader.cancel();throw Error('Packet length exceeded');}
   out.set(value,offset);offset+=value.byteLength;
  }}finally{reader.releaseLock();}
  if(offset!==expected)throw Error('Packet length mismatch');return out;
 }
 async function load(layer){
  const alt=layer.phase13Meshopt;
  if(alt?.encoding==='meshopt-gzip-v1'&&meshoptSupported()&&typeof Decompress==='function'&&safeMeshopt.test(alt.path)&&
    Number.isSafeInteger(alt.packetBytes)&&alt.packetBytes>0&&alt.packetBytes<=20*1024*1024&&
    Number.isSafeInteger(alt.originalBytes)&&alt.originalBytes>=20&&alt.originalBytes<=20*1024*1024&&
    Number.isSafeInteger(alt.compressedBytes)&&alt.compressedBytes>0&&alt.compressedBytes<alt.originalBytes){
   try{
    const response=await fetcher(assetURL(alt.path),{cache:'force-cache'});
    if(!response.ok)throw Error('Meshopt asset HTTP '+response.status);
    const raw=new Uint8Array(await response.arrayBuffer());
    if(raw[0]===0x1f&&raw[1]===0x8b&&raw.byteLength!==alt.compressedBytes)throw Error('Meshopt encoded length mismatch');
    const packet=await unpack(raw,alt.packetBytes,20*1024*1024);
    const decoded=await decodeMeshoptPacket(packet,alt.originalBytes);
    await verifyHash(decoded,alt.sha256);
    const url=assetURL(layer.glb),base=url.slice(0,url.lastIndexOf('/')+1);
    const gltf=await loader.parseAsync(decoded.buffer,base);
    stats.meshoptLayers++;stats.compressedLayers++;stats.compressedBytes+=alt.compressedBytes;stats.originalEquivalentBytes+=alt.originalBytes;return gltf;
   }catch(error){stats.meshoptFallbacks++;console.warn('[Phase 13] Using gzip/original GLB',layer.name,error);}
  }
  const meta=layer.phase13Compression;
  if(meta?.encoding==='gzip'&&typeof Decompress==='function'&&safePath.test(meta.path)&&
     Number.isSafeInteger(meta.originalBytes)&&meta.originalBytes>=20&&meta.originalBytes<=20*1024*1024&&
     Number.isSafeInteger(meta.compressedBytes)&&meta.compressedBytes>0&&meta.compressedBytes<meta.originalBytes){
   try{
    const response=await fetcher(assetURL(meta.path),{cache:'force-cache'});
    if(!response.ok)throw Error('Compressed asset HTTP '+response.status);
    // A host may itself apply Content-Encoding; Fetch then exposes decoded
    // GLB bytes. Detect magic rather than decompressing a second time.
    const raw=new Uint8Array(await response.arrayBuffer());
    let decoded;
    if(raw[0]===0x1f&&raw[1]===0x8b){
     if(raw.byteLength!==meta.compressedBytes)throw Error('Compressed length mismatch');
     const stream=new Blob([raw]).stream().pipeThrough(new Decompress('gzip'));
     const reader=stream.getReader();
     decoded=new Uint8Array(meta.originalBytes);
     let offset=0;
     try{
      for(;;){const {done,value}=await reader.read();if(done)break;
       if(offset+value.byteLength>decoded.byteLength){await reader.cancel();throw Error('Decoded GLB exceeds source length');}
       decoded.set(value,offset);offset+=value.byteLength;
      }
     }finally{reader.releaseLock();}
     if(offset!==decoded.byteLength)throw Error('Decoded length mismatch');
    }else decoded=raw;
    if(decoded.byteLength!==meta.originalBytes||decoded[0]!==0x67||decoded[1]!==0x6c||decoded[2]!==0x54||decoded[3]!==0x46||
       new DataView(decoded.buffer,decoded.byteOffset,decoded.byteLength).getUint32(8,true)!==decoded.byteLength)
     throw Error('Invalid decoded GLB');
    // Verify exact source bytes when Web Crypto is available (HTTPS/localhost).
    if(globalThis.crypto?.subtle&&typeof meta.sha256==='string'){
     const digest=await globalThis.crypto.subtle.digest('SHA-256',decoded);
     const hex=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
     if(hex!==meta.sha256)throw Error('Source digest mismatch');
    }
    const url=assetURL(layer.glb),base=url.slice(0,url.lastIndexOf('/')+1);
    const gltf=await loader.parseAsync(decoded.buffer,base);
    stats.compressedLayers++;stats.compressedBytes+=meta.compressedBytes;stats.originalEquivalentBytes+=meta.originalBytes;
    return gltf;
   }catch(error){stats.fallbacks++;console.warn('[Phase 13] Using original GLB',layer.name,error);}
  }
  const gltf=await loader.loadAsync(assetURL(layer.glb));
  stats.originalLayers++;
  return gltf;
 }
 return {load,status:()=>({...stats,automatic:true,sourceLossless:true,
  savingsPercent:stats.originalEquivalentBytes?100*(1-stats.compressedBytes/stats.originalEquivalentBytes):0})};
}
