import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {spawn} from 'node:child_process';


const root=path.resolve('dist');
const port=5189,debugPort=22000+(process.pid%15000);
const contentTypes={'.html':'text/html','.js':'application/javascript','.json':'application/json',
 '.css':'text/css','.ktx2':'image/ktx2','.wasm':'application/wasm','.gz':'application/gzip','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=http.createServer((req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  pathname=pathname.replace(/^\/architectualdesign\/?/,'/');
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(fs.statSync(file).isDirectory())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':contentTypes[path.extname(file)]??'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const url='http://127.0.0.1:'+port+'/architectualdesign/phase14-review.html';
const chromeBin=process.env.CHROME_BIN || (process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'/usr/bin/google-chrome');
const chrome=spawn(chromeBin,[
 '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run',
 '--disable-background-networking','--disable-extensions','--disable-background-timer-throttling',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--window-size=1280,800','--remote-debugging-port='+debugPort,
 '--user-data-dir='+path.join(os.tmpdir(),'autominds-chrome-'+process.pid),url
],{stdio:['ignore','ignore','pipe']});
const stderr=[];
chrome.on('error',error=>stderr.push(String(error)));
chrome.stderr.on('data',data=>{if(stderr.length<18)stderr.push(String(data).slice(0,1200));});
let ws;
const pending=new Map();let idCounter=0;const exceptions=[];
function cdp(method,params={},timeout=90000){
 return new Promise((resolve,reject)=>{
  const id=++idCounter;
  const t=setTimeout(()=>{pending.delete(id);reject(Error('Chrome DevTools timeout: '+method));},timeout);
  pending.set(id,msg=>{clearTimeout(t);resolve(msg);});
  ws.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expr){
 const msg=await cdp('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
 if(msg.result?.exceptionDetails)throw Error('Browser evaluation: '+msg.result.exceptionDetails.text);
 return msg.result?.result?.value;
}
async function captureCanvasPng(){
 const data=await evaluate('window.__AutoMindsQA.captureStage9CanvasFrame()');
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))
  throw Error('Browser did not return PNG WebGL render');
 const buf=Buffer.from(data.slice('data:image/png;base64,'.length),'base64');
 if(buf.length<5000||buf.toString('ascii',1,4)!=='PNG')
  throw Error('Browser WebGL canvas capture invalid: '+buf.length);
 return buf;
}

try{
 let target;
 for(let i=0;i<80;i++){try{target=(await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(x=>x.type==='page'&&x.url.includes('phase14-review'));if(target)break;}catch{}await sleep(350);}
 if(!target)throw Error('Furniture review browser unavailable');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.text??'exception');};
 await cdp('Runtime.enable');
 let ids;for(let i=0;i<80;i++){ids=await evaluate('window.__FurnitureQA?.ids');if(ids)break;await sleep(250);}
 if(ids?.length!==35)throw Error('Incomplete furniture catalogue '+JSON.stringify(ids));
 const dir=path.resolve('analysis/phase14-visuals');fs.mkdirSync(dir,{recursive:true});
 const result=[];
 for(const id of ids){for(const detail of ['high','low']){const data=await evaluate('window.__FurnitureQA.render('+JSON.stringify(id)+','+JSON.stringify(detail)+')');if(!data?.png?.startsWith('data:image/png;base64,')||data.triangles<1||data.foregroundPixels<500)throw Error('Blank/invalid rendered asset '+id+' '+detail);const png=Buffer.from(data.png.split(',')[1],'base64');fs.writeFileSync(path.join(dir,id+'-'+detail+'.png'),png);delete data.png;result.push(data);}}
 if(exceptions.length)throw Error('Furniture browser exceptions '+exceptions.join(';'));
 fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify(result,null,2));
 console.log('PHASE14_ACTUAL_GLB_RENDERS',JSON.stringify({models:ids.length,variants:result.length,nonblank:true}));
}finally{ws?.close();chrome.kill();server.close();}
