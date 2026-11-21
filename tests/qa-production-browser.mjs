import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {spawn} from 'node:child_process';

const root=path.resolve('dist');
const port=5188,debugPort=22000+(process.pid%15000);
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
 const openGeometry=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.auditOpenConceptGeometry())"));
 fs.mkdirSync('analysis',{recursive:true});
 fs.writeFileSync('analysis/open-plan-live-geometry.json',JSON.stringify(openGeometry,null,2));
 console.log('OPEN_PLAN_LIVE_GEOMETRY',JSON.stringify(openGeometry.counts));
 const summary=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.summary())"));
 const unwantedStairGlass=openGeometry.entries.filter(e=>
   e.zone.includes('stair_sitting')&&
   e.grandparent==='IFC_GLASS_PANES_AND_ALUMINIUM_FRAMES' &&
   e.box[0][0]<112.55&&e.box[1][0]>112.12 &&
   [-7.852,-6.222].some(z=>Math.abs((e.box[0][2]+e.box[1][2])/2-z)<.55));
 const unwantedDividerIds=new Set([
   '1u1fK$zsPDMxAPstkxZ1sp','0$U3BhYYLFWRl7EzZZ9tud',
   '2Quhv0cYjC68LUGFv3TDMx'
 ]);
 const unwantedDivider=openGeometry.entries.filter(e=>unwantedDividerIds.has(e.name));
 const unwantedPartitionWalls=openGeometry.entries.filter(e=>{
  if(e.category!=='walls'||e.level!=='ground')return false;
  if(e.sourceName==='SW - 019'&&e.box[0][0]>112.15&&e.box[1][0]<112.45)return true;
  if(e.sourceName==='SW - 003'&&e.box[0][0]>112.16&&e.box[1][0]<112.45&&
     e.box[1][2]-e.box[0][2]>4)return true;
  return e.sourceName==='SW - 023'&&e.box[0][2]>-4.52&&e.box[1][2]<-4.25&&
   e.box[0][0]>=112.35&&e.box[1][0]<=117.72;
 });
 const approvedFullRemoval=summary.planCirculation?.completeInteriorPartitionsRemoved;
 const exteriorEnclosure=openGeometry.entries.filter(e=>e.category==='walls'&&
  e.level==='ground'&&e.sourceName==='SW - 018'&&e.box[0][2]>.54&&
  e.box[1][2]<.8);
 if(unwantedPartitionWalls.length||approvedFullRemoval?.totalRemoved!==5||
    exteriorEnclosure.length<1)
  throw Error('Complete open-plan partition removal regression: '+
   JSON.stringify({stillVisible:unwantedPartitionWalls,
    removed:approvedFullRemoval?.totalRemoved,exteriorWallsVisible:exteriorEnclosure.length}));
 console.log('COMPLETE_OPEN_PLAN_WALL_REMOVAL_VERIFIED',
  JSON.stringify({removed:approvedFullRemoval.totalRemoved,
   visibleInternalPartitions:0,exteriorEnclosureIntact:true}));
 if(unwantedStairGlass.length||unwantedDivider.length||
    summary.windows?.stairSittingOpenGlassAssembliesRemoved!==2||
    summary.openingRegistry?.untargetedExteriorWallsUnmodified!==true)
   throw Error('Client open-plan glazing/divider/front facade regression: '+
    JSON.stringify({stairGlass:unwantedStairGlass.length,divider:unwantedDivider.length,
     removedGlass:summary.windows?.stairSittingOpenGlassAssembliesRemoved,
     facadeRetained:summary.openingRegistry?.untargetedExteriorWallsUnmodified}));
 console.log('OPEN_PLAN_VISUAL_CLEARANCE_CONFIRMED',JSON.stringify({
   erroneousGlazingHidden:2,obsoleteDividerSlabsHidden:3,realFacadePreserved:true
 }));
 const scene=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.sceneStatus())"));
 const balcony=summary.balconies;
 const openPlan=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.checkOpenPlanAccess())"));
 const outside=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.checkOutdoorWalking())"));
 const stairCorrection=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.checkStairWindowAndOpening())"));
 console.log('STAIR_WINDOW_AND_OPEN_SITTING_CORRECTION',JSON.stringify(stairCorrection));
 if(!stairCorrection.ready||stairCorrection.removedWallParts!==3||
   !stairCorrection.allThreeWallPiecesInvisible||
   !stairCorrection.groundWindowSourceHidden||
   !stairCorrection.glazingSourceWD008||
   Math.abs(stairCorrection.glazingLowestY-1.76)>.02||
   Math.abs(stairCorrection.glazingTopY-5.78)>.03||
   stairCorrection.apertureLowestY<1.70||
   !stairCorrection.lowerStairExteriorWallVisible||
   !stairCorrection.guardsRetained||!stairCorrection.sourceIFCPreserved)
   throw Error('Ground-level stair window or open stair-to-sitting wall not corrected: '+JSON.stringify(stairCorrection));
 if(!openPlan.ready||!openPlan.openConcept||openPlan.internalPlanDoors!==0||
    openPlan.planBays.length!==3||openPlan.planBays.some(p=>!p.verified||p.sourceWallMeshes<1)||
    !openPlan.disabledDoorIds.includes(22)||!openPlan.disabledDoorIds.includes(25)||
    !openPlan.maidInteriorDoorRemoved||!openPlan.sittingDiningDoorRemoved||
    !openPlan.maidExteriorDoorPreserved||!openPlan.maidWallCollision||
    !openPlan.maidSealCrossesTestSegment||!openPlan.originalIFCUnmodified)
   throw Error('Open-plan interconnection or maid exterior-only rule failed: '+JSON.stringify(openPlan));
 console.log('OPEN_CONCEPT_MAID_ACCESS',JSON.stringify(openPlan));
 if(!outside.ready||!outside.hasSpawn||outside.groundHeight===null||
    !outside.firstPersonGroundMatchesCompound||!outside.interiorNotFabricated||
    !outside.boundaryBlocks||!outside.outsideGroundRejected||!outside.stepAroundCompound)
   throw Error('Compound first-person walk, house cut-out or plot boundary invalid: '+JSON.stringify(outside));
 console.log('OPEN_CONCEPT_AND_OUTDOOR_WALK',JSON.stringify({openPlan, outside}));
 console.log('PHASE7_SOURCE_OPENINGS',JSON.stringify(summary.planCirculation));
 if(summary.planCirculation?.sourceConfirmedOpenings!==3||
   summary.openingRegistry?.planConfirmedCirculationOpenings!==3)
   throw Error('S1 ground-floor circulation opening corrections absent');
 if(!balcony||balcony.restored!==3)
  throw Error('Phase 7 source-supported balcony restoration missing: '+JSON.stringify(balcony));
 // Focused regression: the family balcony must wrap around the right edge
 // without its full-height SW-024 and the whole sofa grouping must remain
 // inside the first-floor Family Room, not on the outer balcony.
 const familyBalcony=balcony.balconies.find(b=>b.id==='front-family');
 const furniture=summary.sittingRoomFurniture;
 const sofa=furniture?.familyRoomSofa;
 const table=furniture?.familyRoomCoffeeTable;
 if(!familyBalcony?.verified ||
   familyBalcony.concealedOpaqueEdgeWallGuids?.length<2 ||
   familyBalcony.guardPanels<9)
   throw Error('Family balcony wraparound wall or continuous side guard not repaired');
 if(furniture?.roomArrangementValid!==true || !sofa?.insideRoom ||
   !table?.insideRoom || furniture.coffeeTableGapMetres<.3)
   throw Error('Family room sofa/coffee table are not arranged entirely inside');
 console.log('BALCONY_WRAP_AND_SOFA',JSON.stringify({
   concealedFamilyWallParts:familyBalcony.concealedOpaqueEdgeWallGuids.length,
   guardedPanels:familyBalcony.guardPanels,
   sofaInside:sofa.insideRoom,coffeeTableInside:table.insideRoom,
   tableGapMetres:furniture.coffeeTableGapMetres
 }));
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
 const ids=(process.env.QA_ALL_DOORS==='1'?Array.from({length:29},(_,i)=>i+1):[6,12,14,15,19,21,26,27,28,29]).filter(id=>id!==22&&id!==25);
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
   if(circulation.passed!==circulation.total){
     const grid=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.diagnoseRouteGridPassages())"));
     console.log('PHASE7_ROUTE_GRID_DIAGNOSTICS',JSON.stringify(grid));
     console.log('PHASE7_FAILED_ROUTE_PARTIAL_PATHS',JSON.stringify(circulation.routes?.filter(r=>!r.ok).map(r=>({
       id:r.id,resolvedStart:r.resolvedStart,resolvedEnd:r.resolvedEnd,
       partialPath:r.partialPath,closest:r.closestToDestination
     }))));
   }
   console.log('PHASE7_CIRCULATION_ROUTES',JSON.stringify({
    passed:circulation.passed,total:circulation.total,
    routes:circulation.routes?.map(x=>({id:x.id,ok:x.ok,reason:x.reason,
      visited:x.visited,blockedEdges:x.blockedEdges,levelEdges:x.levelEdges,
      nearestWalkable:x.closestToDestination,
      closestDistanceMetres:x.closestDistanceMetres,
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
 if(summary.doorCount!==29||summary.activeDoorCount!==27||summary.windows?.windowAssemblies<20)
  throw Error('Unexpected door/window model count');
 if(summary.openingRegistry?.verifiedDoorWallCutouts<27)
  throw Error('Not all IFC doorways have source-matched visual cutouts');
 if(summary.verifiedFacadeGlazing?.sourceAlignedPanels<2)
  throw Error('Source-verified first-floor glazing not active');
 if(scene.outsideRawMeshesVisible!==0||scene.originalWindowProxiesStillVisible!==0)
  throw Error('Source visibility regression');
 if(exceptions.length)throw Error('Uncaught browser errors: '+exceptions.join('; '));
 if(obstructed.length)throw Error('Open doorway crossing failures: '+obstructed.map(x=>x.id).join(','));
 if(blockedWhenClosed.length)throw Error('Closed door crossings should not be permitted: '+blockedWhenClosed.join(','));
 if(circulation&&circulation.passed!==circulation.total)throw Error('Continuous architectural routes incomplete: '+circulation.passed+'/'+circulation.total);
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
