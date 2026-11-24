// Project-specific lossless packet, not an EXT_meshopt_compression GLB.
// Reconstructs the original source GLB exactly before GLTFLoader parses it.
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const MAGIC=0x314d5341,HEADER=12,SEGMENT=16,MAX_BYTES=20*1024*1024;
export async function decodeMeshoptPacket(packet,expectedBytes){
 const src=packet instanceof Uint8Array?packet:new Uint8Array(packet);
 if(src.length<HEADER||!Number.isSafeInteger(expectedBytes)||expectedBytes<20||expectedBytes>MAX_BYTES)throw Error('Invalid meshopt packet size');
 const dv=new DataView(src.buffer,src.byteOffset,src.byteLength);
 const total=dv.getUint32(4,true),segments=dv.getUint32(8,true);
 if(dv.getUint32(0,true)!==MAGIC||total!==expectedBytes||segments<1||segments>100000||HEADER+SEGMENT*segments>src.length)throw Error('Invalid meshopt packet header');
 await MeshoptDecoder.ready;
 if(!MeshoptDecoder.supported)throw Error('Meshopt decoder unsupported');
 const result=new Uint8Array(total);let input=HEADER+SEGMENT*segments,output=0;
 for(let i=0;i<segments;i++){
  const at=HEADER+i*SEGMENT,mode=dv.getUint32(at,true),stride=dv.getUint32(at+4,true),count=dv.getUint32(at+8,true),size=dv.getUint32(at+12,true);
  const length=count*stride;
  if(!count||!stride||!size||input+size>src.length||output+length>total||mode>2||
     (mode===0&&(stride!==1||size!==count))||
     (mode===1&&(stride%4!==0||stride>256))||(mode===2&&stride!==2&&stride!==4))
   throw Error('Invalid meshopt packet segment');
  const bytes=src.subarray(input,input+size),dest=result.subarray(output,output+length);
  if(mode===0)dest.set(bytes);
  else MeshoptDecoder.decodeGltfBuffer(dest,count,stride,bytes,mode===1?'ATTRIBUTES':'INDICES','NONE');
  input+=size;output+=length;
 }
 if(input!==src.length||output!==total)throw Error('Meshopt packet length mismatch');
 return result;
}
export const meshoptSupported=()=>MeshoptDecoder.supported;
export const MESHOPT_PACKET_MAGIC=MAGIC;
