import {deflateSync} from 'node:zlib';
const crc=(b)=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
function chunk(type,bytes){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(bytes.length);c.writeUInt32BE(crc(Buffer.concat([t,bytes])));return Buffer.concat([n,t,bytes,c]);}
function mapPng(kind){
 const n=128,rows=Buffer.alloc(n*(1+n*3));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n;
  const pattern=kind==='wood'? .50+.25*Math.sin(2*Math.PI*(u*10+.18*Math.sin(v*2*Math.PI)+.05*Math.sin(v*6*Math.PI)))+.15*Math.cos(2*Math.PI*u*31):
   kind==='stone'?.55+.22*Math.sin(2*Math.PI*(u*3+v*4+.20*Math.sin(v*2*Math.PI)))+.15*Math.cos(2*Math.PI*(u*7-v*3)):
   .55+.17*Math.sin(2*Math.PI*u*32)+.17*Math.cos(2*Math.PI*v*32);
  const value=Math.max(0,Math.min(255,Math.round(215+40*pattern))),p=y*(1+n*3)+1+x*3;rows.fill(value,p,p+3);
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
// Inject original authored neutral multiplier maps as standard embedded
// glTF images. Shared within a GLB; no external image requests.
export function attachFurnitureMaps(glb){
 const jsonLen=glb.readUInt32LE(12),j=JSON.parse(glb.subarray(20,20+jsonLen).toString()),start=28+jsonLen;
 let bin=glb.subarray(start,start+glb.readUInt32LE(start-8));
 const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]),parts=[pad(bin)];let offset=parts[0].length;
 j.images??=[];j.textures??=[];j.samplers??=[];j.bufferViews??=[];
 const sampler=j.samplers.length;j.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
 const mapped=new Map();
 for(const mat of j.materials??[]){
  const key=mat.name?.replace('PHASE14_',''),kind=['walnut','timber'].includes(key)?'wood':['cream','taupe','sage','ivory','textile'].includes(key)?'cloth':key==='stone'?'stone':null;
  if(!kind)continue;
  if(!mapped.has(kind)){
   const png=mapPng(kind),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:png.length});
   const image=j.images.length;j.images.push({name:'original-'+kind,bufferView:view,mimeType:'image/png'});
   const tex=j.textures.length;j.textures.push({sampler,source:image});mapped.set(kind,tex);const bytes=pad(png);parts.push(bytes);offset+=bytes.length;
  }
  mat.pbrMetallicRoughness??={};mat.pbrMetallicRoughness.baseColorTexture={index:mapped.get(kind)};
 }
 if(!mapped.size)return glb;
 bin=Buffer.concat(parts);j.buffers[0].byteLength=bin.length;
 let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(20),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([header,json,bh,bin]);
}
