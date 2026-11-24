import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {drawStudioTexture,STUDIO_TEXTURE_NAMES} from '../src/phase2/phase13-studio-textures.js';
import {read as readKTX} from 'three/addons/libs/ktx-parse.module.js';

const root=process.argv[2]||'dist',required=process.env.PHASE13_REQUIRE_KTX2==='1';
const ktx=process.env.KTX_BIN||'ktx';
const chrome=process.env.CHROME_BIN||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'google-chrome');
try{execFileSync(ktx,['--version'],{stdio:'pipe'});execFileSync(chrome,['--version'],{stdio:'pipe'});}
catch(error){if(required)throw error;console.log('Phase 13 KTX2 tools unavailable; canvas fallback remains enabled');process.exit(0);}
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'autominds-phase13-'));
try{
 const page=path.join(temp,'bake.html');
 // Match CanvasTexture.flipY=true by flipping source rows before KTX2 encoding.
 const html='<!doctype html><meta charset="utf-8"><pre id="baked"></pre><script>'+drawStudioTexture.toString()+
  ';const names='+JSON.stringify(STUDIO_TEXTURE_NAMES)+';const result={};for(const name of names){const src=drawStudioTexture(name);const out=document.createElement("canvas");out.width=src.width;out.height=src.height;const c=out.getContext("2d");c.translate(0,out.height);c.scale(1,-1);c.drawImage(src,0,0);result[name]=out.toDataURL("image/png").split(",")[1];}document.getElementById("baked").textContent=JSON.stringify(result);</script>';
 await fs.writeFile(page,html);
 const dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-extensions','--no-first-run','--user-data-dir='+path.join(temp,'chrome'),'--dump-dom',pathToFileURL(page).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:60000,stdio:['ignore','pipe','pipe']});
 const match=dom.match(/<pre id="baked">([^<]+)<\/pre>/);
 if(!match)throw Error('Texture bake output unavailable');
 const pngs=JSON.parse(match[1]);
 const dir=path.join(root,'phase13-textures');await fs.mkdir(dir,{recursive:true});
 const records=[];
 for(const name of STUDIO_TEXTURE_NAMES){
  if(!pngs[name])throw Error('Missing source texture '+name);
  const input=path.join(temp,name+'.png'),output=path.join(temp,name+'.ktx2');
  await fs.writeFile(input,Buffer.from(pngs[name],'base64'));
  execFileSync(ktx,['create','--format','R8G8B8A8_SRGB','--assign-tf','srgb','--assign-primaries','bt709','--generate-mipmap','--encode','uastc','--uastc-quality','3','--zstd','18',input,output],{stdio:'inherit',timeout:120000});
  execFileSync(ktx,['validate',output],{stdio:'inherit'});
  const bytes=await fs.readFile(output),container=readKTX(bytes);
  if(container.pixelWidth!==512||container.pixelHeight!==512||container.levels.length!==10||container.vkFormat!==0)throw Error('Unexpected KTX2 texture metadata '+name);
  const hash=createHash('sha256').update(bytes).digest('hex'),file=name+'.'+hash.slice(0,16)+'.ktx2';
  await fs.writeFile(path.join(dir,file),bytes);
  records.push({name,path:'/phase13-textures/'+file,bytes:bytes.length,sha256:hash,width:512,height:512,mipLevels:10,source:'procedural-canvas',encoding:'UASTC-Zstd',colorSpace:'srgb',orientation:'canvas-flipY-baked'});
 }
 const basis=path.join('node_modules','three','examples','jsm','libs','basis');
 await fs.mkdir(path.join(dir,'basis'),{recursive:true});
 for(const name of ['basis_transcoder.js','basis_transcoder.wasm'])await fs.copyFile(path.join(basis,name),path.join(dir,'basis',name));
 const mp=path.join(root,'ifc/house/manifest.json'),manifest=JSON.parse(await fs.readFile(mp,'utf8'));
 manifest.phase13Textures={schema:'autominds.studio-textures.v1',textures:records,encodedBytes:records.reduce((n,t)=>n+t.bytes,0),canvasFallback:true};
 await fs.writeFile(mp,JSON.stringify(manifest,null,2)+'\n');
 console.log('PHASE13_KTX2_BAKE',JSON.stringify(manifest.phase13Textures));
}finally{await fs.rm(temp,{recursive:true,force:true});}
