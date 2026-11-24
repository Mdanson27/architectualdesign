import encoder from './vendor/meshopt_encoder-v0.25.cjs';
import {decodeMeshoptPacket,MESHOPT_PACKET_MAGIC} from '../src/phase2/phase13-meshopt-packet.js';
const componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const typeSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
export async function packGLB(original){
 await encoder.ready;
 if(original.length<28||original.readUInt32LE(0)!==0x46546c67)return null;
 const jsonSize=original.readUInt32LE(12),binStart=20+jsonSize+8;
 if(binStart>original.length||original.readUInt32LE(16)!==0x4e4f534a||original.readUInt32LE(binStart-4)!==0x004e4942)return null;
 const binSize=original.readUInt32LE(binStart-8);
 if(binStart+binSize>original.length)return null;
 const json=JSON.parse(original.subarray(20,20+jsonSize).toString('utf8'));
 const views=json.bufferViews??[],accessors=json.accessors??[];
 const indexViews=new Set((json.meshes??[]).flatMap(m=>(m.primitives??[]).map(p=>accessors[p.indices]?.bufferView)).filter(i=>i!==undefined));
 const groups=new Map();
 accessors.forEach(a=>{if(a.bufferView===undefined)return;if(!groups.has(a.bufferView))groups.set(a.bufferView,[]);groups.get(a.bufferView).push(a);});
 const candidates=[];
 views.forEach((v,i)=>{
  if((v.buffer??0)!==0||!v.byteLength||v.byteLength<64||v.extensions)return;
  const entries=groups.get(i)??[];
  if(!entries.length||entries.some(a=>a.sparse))return;
  const a=entries[0],stride=v.byteStride??(componentBytes[a.componentType]*typeSize[a.type]);
  const mode=indexViews.has(i)&&entries.length===1&&a.type==='SCALAR'&&(stride===2||stride===4)?2:1;
  if(!Number.isInteger(stride)||stride<=0||v.byteLength%stride||stride>256||(mode===1&&stride%4))return;
  if(!v.byteStride&&entries.some(a=>componentBytes[a.componentType]*typeSize[a.type]!==stride))return;
  const start=binStart+(v.byteOffset??0),end=start+v.byteLength;
  if(start<binStart||end>binStart+binSize)return;
  candidates.push({start,end,stride,mode,count:v.byteLength/stride});
 });
 candidates.sort((a,b)=>a.start-b.start||a.end-b.end);
 const parts=[];let cursor=0,encodedViews=0;
 const raw=(a,b)=>{if(b>a)parts.push({mode:0,stride:1,count:b-a,bytes:original.subarray(a,b)});};
 for(const v of candidates){
  if(v.start<cursor)continue;
  const source=original.subarray(v.start,v.end);let encoded;
  try{encoded=encoder.encodeGltfBuffer(source,v.count,v.stride,v.mode===1?'ATTRIBUTES':'INDICES');}catch{continue;}
  if(encoded.byteLength+32>=source.byteLength)continue;
  raw(cursor,v.start);
  parts.push({...v,bytes:Buffer.from(encoded)});cursor=v.end;encodedViews++;
 }
 raw(cursor,original.length);
 if(!encodedViews)return null;
 const header=Buffer.alloc(12+parts.length*16);
 header.writeUInt32LE(MESHOPT_PACKET_MAGIC,0);header.writeUInt32LE(original.length,4);header.writeUInt32LE(parts.length,8);
 parts.forEach((p,i)=>{let o=12+16*i;header.writeUInt32LE(p.mode,o);header.writeUInt32LE(p.stride,o+4);header.writeUInt32LE(p.count,o+8);header.writeUInt32LE(p.bytes.length,o+12);});
 const packet=Buffer.concat([header,...parts.map(p=>p.bytes)]);
 const decoded=await decodeMeshoptPacket(packet,original.length);
 if(!Buffer.from(decoded).equals(original))throw Error('Meshopt exact byte parity failed');
 return {packet,encodedViews};
}
