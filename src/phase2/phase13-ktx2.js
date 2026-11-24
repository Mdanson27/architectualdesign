import * as THREE from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {STUDIO_TEXTURE_NAMES} from './phase13-studio-textures.js';

// Compare both source and transcoded maps through the real renderer before
// releasing the QA build. Sampling a plane at full texture resolution also
// catches orientation/UV and sRGB mistakes, not just malformed KTX headers.
function compareTexturePixels(renderer,source,candidate){
 const size=256,target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:false,stencilBuffer:false});
 const previous=renderer.getRenderTarget(),scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,10);camera.position.z=2;
 const geometry=new THREE.PlaneGeometry(2,2),material=new THREE.MeshBasicMaterial({toneMapped:false});
 const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
 const a=new Uint8Array(size*size*4),b=new Uint8Array(a.length);
 const sample=(texture,pixels)=>{material.map=texture;material.needsUpdate=true;renderer.setRenderTarget(target);
  renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);};
 try{
  sample(source,a);sample(candidate,b);
  const hist=new Uint32Array(256);let sum=0,count=0,max=0;
  for(let i=0;i<a.length;i++){if(i%4===3)continue;const delta=Math.abs(a[i]-b[i]);hist[delta]++;sum+=delta;count++;max=Math.max(max,delta);}
  let n=0,p99=0;for(let i=0;i<hist.length;i++){n+=hist[i];if(n>=count*.99){p99=i;break;}}
  return {meanAbsoluteError:sum/count,p99AbsoluteError:p99,maxAbsoluteError:max,samplePixels:size*size};
 }finally{renderer.setRenderTarget(previous);target.dispose();geometry.dispose();material.dispose();}
}

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
    const visual=qaPage?compareTexturePixels(renderer,old,tex):null;
    if(visual&&(visual.meanAbsoluteError>5||visual.p99AbsoluteError>24))throw Error('KTX2 rendered color/orientation tolerance exceeded: '+JSON.stringify(visual));
    report.decoded++;
    // RGBA software fallback is not a memory saving. Keep original exact
    // canvas map on devices that cannot upload compressed GPU blocks.
    const gpuCompressed=tex.isCompressedTexture&&tex.format!==THREE.RGBAFormat;
    if(gpuCompressed){for(const m of Object.values(materials))if(m.map===old){m.map=tex;m.needsUpdate=true;}
     maps[name]=tex;old.dispose();report.applied++;
    }else tex.dispose();
    report.textures.push({name,width,height,mipLevels,gpuCompressed,encodedBytes:entry.bytes,visual});
   }catch(error){tex?.dispose();report.fallbacks++;console.warn('[Phase 13] Original procedural texture retained',name,error);}
  }
 }finally{loader.dispose();}
 return report;
}
