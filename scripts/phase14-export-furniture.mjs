import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {attachFurnitureMaps} from './phase14-furniture-maps.mjs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FURNITURE_CATALOG,createFurnitureAsset,furnitureStats} from '../src/phase2/phase14-furniture-library.js';
// GLTFExporter uses FileReader for the binary result. Node 22 supplies Blob.
globalThis.FileReader??=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>{this.error=error;this.onerror?.(error);});}
 readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();}).catch(error=>{this.error=error;this.onerror?.(error);});}
};
const root=process.argv[2]||'dist',dir=path.join(root,'furniture');await fs.mkdir(dir,{recursive:true});
const assets=[];
for(const [id,spec] of Object.entries(FURNITURE_CATALOG)){
 const variants={};
 for(const detail of ['high','low']){
  const asset=createFurnitureAsset(id,{detail});
  const stats=furnitureStats(asset);
  const glb=attachFurnitureMaps(Buffer.from(await new GLTFExporter().parseAsync(asset,{binary:true,onlyVisible:true})));
  if(glb.readUInt32LE(0)!==0x46546c67||glb.readUInt32LE(8)!==glb.length)throw Error('Invalid furniture GLB '+id);
  const sha256=createHash('sha256').update(glb).digest('hex'),file=id+'.'+detail+'.'+sha256.slice(0,16)+'.glb';
  await fs.writeFile(path.join(dir,file),glb);
  variants[detail]={path:'/furniture/'+file,bytes:glb.length,sha256,...stats};
  const materials=new Set();asset.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material);}});materials.forEach(m=>m.dispose());
 }
 if(variants.low.triangles>=variants.high.triangles)throw Error('Missing lower-detail variant '+id);
 assets.push({id,...spec,variants,license:'AutoMinds original procedural design; reference-inspired visual proposal',clientApproved:false});
}
const manifest={schema:'autominds.furniture.v1',units:'metres',assets,sourceIFCUnmodified:true};
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('PHASE14_FURNITURE_GLB_BUILD',JSON.stringify({assets:assets.length,variants:assets.length*2,highTriangles:assets.reduce((n,a)=>n+a.variants.high.triangles,0),lowTriangles:assets.reduce((n,a)=>n+a.variants.low.triangles,0),bytes:assets.reduce((n,a)=>n+a.variants.high.bytes+a.variants.low.bytes,0)}));
