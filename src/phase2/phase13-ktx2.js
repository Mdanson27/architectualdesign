import * as THREE from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {STUDIO_TEXTURE_NAMES} from './phase13-studio-textures.js';

export async function loadStudioKTX2({renderer,assetURL,manifest,maps,materials,qaPage=false}){
 const report={available:false,decoded:0,applied:0,fallbacks:0,textures:[]};
 if(!manifest?.textures?.length)return report;
 report.available=true;
 const loader=new KTX2Loader().setTranscoderPath(assetURL('/phase13-textures/basis/')).setWorkerLimit(1).detectSupport(renderer);
 try{
  for(const name of STUDIO_TEXTURE_NAMES){
   const entry=manifest.textures.find(e=>e.name===name);
   const old=maps[name];
   if(!entry||!/^\/phase13-textures\/[a-z]+\.[a-f0-9]{16}\.ktx2$/.test(entry.path)){report.fallbacks++;continue;}
   let tex;
   try{
    tex=await loader.loadAsync(assetURL(entry.path));
    const width=tex.image?.width,height=tex.image?.height,mipLevels=tex.mipmaps?.length??0;
    if(width!==512||height!==512||mipLevels!==10||tex.colorSpace!==THREE.SRGBColorSpace)
     throw Error('Unexpected KTX2 dimensions, mipmaps or color space');
    tex.wrapS=old.wrapS;tex.wrapT=old.wrapT;tex.repeat.copy(old.repeat);tex.offset.copy(old.offset);
    tex.anisotropy=old.anisotropy;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    tex.flipY=false;tex.needsUpdate=true;
    report.decoded++;
    // RGBA software fallback is not a memory saving. Keep original exact
    // canvas map on devices that cannot upload compressed GPU blocks.
    const gpuCompressed=tex.isCompressedTexture&&tex.format!==THREE.RGBAFormat;
    if(gpuCompressed){for(const m of Object.values(materials))if(m.map===old){m.map=tex;m.needsUpdate=true;}
     maps[name]=tex;old.dispose();report.applied++;
    }else tex.dispose();
    report.textures.push({name,width,height,mipLevels,gpuCompressed,encodedBytes:entry.bytes});
   }catch(error){tex?.dispose();report.fallbacks++;console.warn('[Phase 13] Original procedural texture retained',name,error);}
  }
 }finally{loader.dispose();}
 return report;
}
