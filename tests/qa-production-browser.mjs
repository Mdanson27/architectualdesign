import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';

const root=path.resolve('dist');
const port=5188,debugPort=9267;
const contentTypes={'.html':'text/html','.js':'application/javascript','.json':'application/json',
 '.css':'text/css','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
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
const url='http://127.0.0.1:'+port+'/architectualdesign/actual-house.html?preview&qa';
const chrome=spawn(process.env.CHROME_BIN||'/usr/bin/google-chrome',[
 '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run',
 '--disable-background-networking','--disable-extensions','--disable-background-timer-throttling',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--window-size=1280,800','--remote-debugging-port='+debugPort,
 '--user-data-dir=/tmp/autominds-chrome-'+process.pid,url
],{stdio:['ignore','ignore','pipe']});
const stderr=[];chrome.stderr.on('data',data=>{if(stderr.length<18)stderr.push(String(data).slice(0,1200));});
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
const outputFile='architecture-browser-qa.json';
let report={url,status:'started',exceptions};
try{
 let target;
 for(let i=0;i<80;i++){
  try{
   const list=await (await fetch('http://127.0.0.1:'+debugPort+'/json/list',{signal:AbortSignal.timeout(2000)})).json();
   target=list.find(x=>x.type==='page'&&x.url.includes('actual-house'));
   if(target)break;
  }catch{}
  await sleep(350);
 }
 if(!target)throw Error('Headless Chrome target unavailable: '+stderr.join('|'));
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{
  try{
   const msg=JSON.parse(e.data);
   if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
   if(msg.method==='Runtime.exceptionThrown')
    exceptions.push(msg.params?.exceptionDetails?.text||'uncaught browser error');
  }catch{}
 };
 await cdp('Runtime.enable');
 let ready;
 for(let i=0;i<220;i++){
  ready=await evaluate("({loaded:window.__AutoMindsQA?.sceneStatus()?.loaded,expected:window.__AutoMindsQA?.summary()?.expected,loadedLayers:window.__AutoMindsQA?.summary()?.loaded})");
  if(ready?.loaded)break;
  await sleep(500);
 }
 if(!ready?.loaded||ready.loadedLayers!==ready.expected)throw Error('IFC not fully loaded (expected '+ready?.expected+', loaded '+ready?.loadedLayers+')');
 const summary=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.summary())"));
 const scene=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.sceneStatus())"));
 const balcony=summary.balconies;
 console.log('PHASE7_SOURCE_OPENINGS',JSON.stringify(summary.planCirculation));
 if(summary.planCirculation?.sourceConfirmedOpenings!==3||
   summary.openingRegistry?.planConfirmedCirculationOpenings!==3)
   throw Error('S1 ground-floor circulation opening corrections absent');
 if(!balcony||balcony.restored!==3)
  throw Error('Phase 7 source-supported balcony restoration missing: '+JSON.stringify(balcony));
 const lightBefore=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.lightingStatus())"));
 const lightsOff=JSON.parse(await evaluate("(()=>{document.querySelector('#houseLightsBtn').click();return JSON.stringify(window.__AutoMindsQA.lightingStatus());})()"));
 const nightOff=JSON.parse(await evaluate("(()=>{document.querySelector('#lightBtn').click();return JSON.stringify(window.__AutoMindsQA.lightingStatus());})()"));
 const nightOn=JSON.parse(await evaluate("(()=>{document.querySelector('#houseLightsBtn').click();return JSON.stringify(window.__AutoMindsQA.lightingStatus());})()"));
 const restoredLights=JSON.parse(await evaluate("(()=>{document.querySelector('#lightBtn').click();return JSON.stringify(window.__AutoMindsQA.lightingStatus());})()"));
 if(lightBefore.activeEmitters!==14 || lightsOff.activeEmitters!==0 ||
   nightOff.night!==true||nightOff.activeEmitters!==0 ||
   nightOn.activeEmitters!==14||restoredLights.night!==false||
   restoredLights.activeEmitters!==14)
   throw Error('Independent night and house-light controls failed');
 console.log('PHASE7_BALCONY_LIGHTS',JSON.stringify({restored:balcony.restored,concealed:balcony.concealedOpaqueEdgeMeshes,
  lights:lightBefore.activeEmitters,nightIndependent:true}));
 const ids=process.env.QA_ALL_DOORS==='1'?Array.from({length:29},(_,i)=>i+1):[6,12,14,15,21,25,26,27,28,29];
 const crossings=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.doorCrossings("+JSON.stringify(ids)+",true))"));
 const obstructed=crossings.filter(x=>!x.openFront?.ok||!x.openBack?.ok).map(x=>({
  id:x.id,level:x.level,sourceGuids:x.sourceGuids,front:x.openFront,back:x.openBack
 }));
 const blockedWhenClosed=crossings.filter(x=>x.closedFront?.ok||x.closedBack?.ok).map(x=>x.id);
 let circulation=null;
 if(process.env.QA_ALL_DOORS==='1'){
   circulation=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.checkPlanCirculation())"));
   const openingProbes=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.diagnoseS1Openings())"));
   console.log('PHASE7_OPENING_PROBES',JSON.stringify(openingProbes));
   console.log('PHASE7_CIRCULATION_ROUTES',JSON.stringify({
    passed:circulation.passed,total:circulation.total,
    routes:circulation.routes?.map(x=>({id:x.id,ok:x.ok,reason:x.reason,
      visited:x.visited,closestDistanceMetres:x.closestDistanceMetres,
      pathLengthMetres:x.distanceMetres}))
   }));
 }
 report={status:'complete',ready,summary,scene,crossings,obstructed,blockedWhenClosed,circulation,exceptions};
 console.log('BROWSER_QA_SUMMARY',JSON.stringify({
  sourceLayers:ready.loadedLayers,doors:summary.doorCount,windows:summary.windows?.windowAssemblies,
  facade:summary.verifiedFacadeGlazing,
  bedAdjustments:summary.bedCirculationAdjustments,
  bedReviews:summary.bedCirculationReviews,
  doorCuts:summary.openingRegistry?.verifiedDoorWallCutouts,
  windowCuts:summary.openingRegistry?.verifiedWindowWallCutouts,
  outsideRawVisible:scene.outsideRawMeshesVisible,rawWindowProxiesVisible:scene.originalWindowProxiesStillVisible,
  testedDoorIds:ids,obstructed,closedDoorUnexpectedPass:blockedWhenClosed,
  browserExceptions:exceptions}));
 if(summary.doorCount!==29||summary.windows?.windowAssemblies<20)
  throw Error('Unexpected door/window model count');
 if(summary.openingRegistry?.verifiedDoorWallCutouts<29)
  throw Error('Not all IFC doorways have source-matched visual cutouts');
 if(summary.verifiedFacadeGlazing?.sourceAlignedPanels<2)
  throw Error('Source-verified first-floor glazing not active');
 if(scene.outsideRawMeshesVisible!==0||scene.originalWindowProxiesStillVisible!==0)
  throw Error('Source visibility regression');
 if(exceptions.length)throw Error('Uncaught browser errors: '+exceptions.join('; '));
 if(obstructed.length)throw Error('Open doorway crossing failures: '+obstructed.map(x=>x.id).join(','));
 if(blockedWhenClosed.length)throw Error('Closed door crossings should not be permitted: '+blockedWhenClosed.join(','));
 console.log('BROWSER_QA_PASSED');
}catch(e){
 report={...report,status:'failed',failure:String(e)};
 console.error('BROWSER_QA_FAILED',String(e));
 process.exitCode=1;
}finally{
 fs.writeFileSync(outputFile,JSON.stringify(report,null,2));
 try{ws?.close();}catch{}
 try{chrome.kill('SIGKILL');}catch{}
 server.close();
}
