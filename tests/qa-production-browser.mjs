import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {STAGE9_QA_POLICY,summarizeStage9Engineering} from '../src/phase2/stage9-quality-policy.js';

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
async function captureCanvasPng(){
 const data=await evaluate('window.__AutoMindsQA.captureStage9CanvasFrame()');
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))
  throw Error('Browser did not return PNG WebGL render');
 const buf=Buffer.from(data.slice('data:image/png;base64,'.length),'base64');
 if(buf.length<5000||buf.toString('ascii',1,4)!=='PNG')
  throw Error('Browser WebGL canvas capture invalid: '+buf.length);
 return buf;
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
 await cdp('Page.enable');
 let ready;
 for(let i=0;i<220;i++){
  ready=await evaluate("({loaded:window.__AutoMindsQA?.sceneStatus()?.loaded,expected:window.__AutoMindsQA?.summary()?.expected,loadedLayers:window.__AutoMindsQA?.summary()?.loaded})");
  if(ready?.loaded)break;
  await sleep(500);
 }
 if(!ready?.loaded||ready.loadedLayers!==ready.expected)throw Error('IFC not fully loaded (expected '+ready?.expected+', loaded '+ready?.loadedLayers+')');
 const audit=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.stage1RoomAudit())"));
 const auditUI=JSON.parse(await evaluate("JSON.stringify((()=>{\n  const panel=document.querySelector('#stage1AuditPanel');\n  const btn=document.querySelector('#stage1AuditBtn');\n  const initial=panel.classList.contains('hidden');\n  btn.click();\n  const opened=!panel.classList.contains('hidden')&&\n   btn.getAttribute('aria-expanded')==='true';\n  const rows=panel.querySelectorAll('.stage1Room').length;\n  const summary=panel.querySelector('#stage1AuditStatus')?.textContent||'';\n  btn.click();\n  const closed=panel.classList.contains('hidden')&&\n   btn.getAttribute('aria-expanded')==='false';\n  return {initial,opened,closed,rows,summary};\n})())"));
 if(!audit||audit.source.sourceIndexedElements!==2575||
    audit.source.sourceLayerCount!==76||audit.source.ifcSpaceCount!==0||
    audit.source.unavailableSourceBatchCount!==3||
    audit.plan.namedSpaceCount!==10||audit.plan.mainBedroomCount!==4||
    audit.plan.separateMaidRoomCount!==1||
    audit.plan.measuredRoomPolygons!==0||audit.plan.verifiedRoomIfcAssignments!==0||
    audit.plan.sumOfNamedRoomAreasNotTotalFloorArea.ground!==110||
    audit.plan.sumOfNamedRoomAreasNotTotalFloorArea.first!==92||
    audit.readiness.stage1SignedOff!==false||
    audit.plan.rooms.some(x=>x.roomPolygon!==null||
     x.verifiedRoomIfcGuids.length||x.clientApproved)||
    !auditUI.initial||!auditUI.opened||!auditUI.closed||auditUI.rows!==10||
    !auditUI.summary.includes('3 conversion exclusions'))
   throw Error('Stage 1 source/room audit browser regression: '+
    JSON.stringify({source:audit?.source,plan:audit?.plan,
     ready:audit?.readiness?.stage1SignedOff,ui:auditUI}));
 console.log('STAGE1_ARCHITECTURAL_AUDIT_PASSED',JSON.stringify({
  indexedElements:audit.source.sourceIndexedElements,
  layers:audit.source.sourceLayerCount,excluded:audit.source.unavailableSourceBatches,
  namedSpaces:audit.plan.namedSpaceCount,
  verifiedRoomPolygons:0,clientApprovedFinishes:false,
  panelAccessible:true,sourceUnmodified:audit.source.originalElementsUntouched
 }));
 const crosswalk=audit.plan.preliminarySourceCrosswalk;
 if(!crosswalk?.source?.visuallyReviewed||crosswalk.entries.length!==10||
    crosswalk.verifiedRoomPolygonCount!==0||
    crosswalk.entries.some(x=>x.polygonVerified||x.clientApproved)||
    !crosswalk.source.clientCompoundRevisionSupersedesOriginalGate||
    !crosswalk.entries.find(x=>x.id==='G-MAID'&&x.provisionalAreaDeltaPct< -15))
   throw Error('Stage 1 original S1 crosswalk unexpectedly treated draft as verified');
 const stage2Before=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2Finishes())"));
 if(!stage2Before||stage2Before.style!=='source'||
    stage2Before.visible||stage2Before.placedTiles!==0)
  throw Error('Stage 2 should not alter IFC before explicit sample selection');
 const stage2Dining=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.selectStage2RoomFinish('G-DINING','porcelain'))"));
 const stage2Family=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.selectStage2RoomFinish('F-FAMILY','ash'))"));
 const stage2Restored=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.selectStage2RoomFinish('G-DINING','source'))"));
 if(!stage2Dining?.sourceGeometryUnmodified||!stage2Dining?.sourceCollisionUnmodified||
    !stage2Dining?.visualComparisonOnly||stage2Dining?.clientFinishApproved||
    !stage2Family?.sourceGeometryUnmodified||
    !stage2Family?.sourceCollisionUnmodified||
    stage2Restored.style!=='source'||stage2Restored.placedTiles!==0||
    stage2Restored.visible)
   throw Error('Stage 2 floor samples must preserve IFC and reset: '+
     JSON.stringify({stage2Dining,stage2Family,stage2Restored}));
 console.log('STAGE2_SOURCE_FLOOR_BROWSER_PREVIEW',JSON.stringify({
  diningTiles:stage2Dining.placedTiles,familyTiles:stage2Family.placedTiles,
  reset:stage2Restored.style,sourceCollisionsUntouched:true}));
 const fullStatus0=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2SurfaceStatus())"));
 const integratedStart=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.productionDesignStatus())"));
 if(!fullStatus0||fullStatus0.mappedRooms!==10||fullStatus0.enhancedRooms!==9||
    fullStatus0.tiles<40||fullStatus0.finishedSourceWallParts<1||
    fullStatus0.finalPaletteApproved!==false||
    fullStatus0.roomPolygonsCertified!==false||
    !integratedStart?.active||integratedStart.visitorMustEnableStages||
    integratedStart.currentSurfaceRooms!==9||!integratedStart.currentKitchenEnabled)
  throw Error('PRODUCTION must load full-house room finishes and kitchen before the first view: '+
   JSON.stringify({fullStatus0,integratedStart}));
 console.log('PRODUCTION_INTERIORS_AUTOMATICALLY_VISIBLE',JSON.stringify({
  rooms:fullStatus0.enhancedRooms,tiles:fullStatus0.tiles,
  kitchenDefaultOn:integratedStart.currentKitchenEnabled,
  noStageEnableButtonsRequired:true,
  sourceGeometryProtected:fullStatus0.sourceGeometryUnmodified
 }));
 const stage4Initial=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage4LivingDiningStatus())"));
 if(!stage4Initial?.productionIntegrated||stage4Initial.previewActivationRequired||
    !stage4Initial.originalIFCGeometryPreserved||
    !stage4Initial.sourceIFCCollidersPreserved||
    stage4Initial.openPlanWallsCreated!==0||
    stage4Initial.interiorDoorsCreated!==0||
    stage4Initial.diningChairsTotal!==6||
    stage4Initial.pieces.diningTabletop!==1||
    stage4Initial.pieces.diningChairsImproved!==6||
    !stage4Initial.visibleRooms.includes('G-DINING')||
    !stage4Initial.visibleRooms.includes('G-SITTING')||
    !integratedStart.stage4LivingDiningIntegrated||
    !integratedStart.currentStage4Rooms.includes('F-FAMILY'))
  throw Error('Stage 4 must be a complete integrated default living/dining scene, no preview action: '+
   JSON.stringify({stage4Initial,integratedStart}));
 console.log('STAGE4_PRODUCTION_LIVING_DINING_AUTO_VISIBLE',JSON.stringify({
  rooms:stage4Initial.visibleRooms,
  sculptedDiningTable:stage4Initial.pieces.diningTabletop,
  sixUpholsteredDiningChairs:stage4Initial.pieces.diningChairsImproved,
  loungeCoffeeTables:stage4Initial.pieces.sittingCoffeeTable,
  existingIFCCoffeeTablesEnhanced:stage4Initial.pieces.existingSourceCoffeeTables,
  conditionalPlacementNotes:stage4Initial.skipped,
  accentLoungeChairs:stage4Initial.pieces.sittingChairs,
  rugs:stage4Initial.pieces.diningRug+
   stage4Initial.pieces.groundRug+stage4Initial.pieces.firstFloorRug,
  entranceMirror:stage4Initial.pieces.foyerMirror,
  sourceIFCUnchanged:true,stagesRequiredToEnable:0
 }));
 const stage5=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage5BedroomsStudyStatus())"));
 if(!stage5?.productionIntegrated||stage5.previewActivationRequired||
   !stage5.originalIFCGeometryPreserved||!stage5.sourceCollidersPreserved||
   stage5.addedPartitionWalls!==0||stage5.addedDoors!==0||
   stage5.walkInClosetGeometryInvented||!integratedStart.stage5BedroomsStudyIntegrated||
   stage5.sourceSupportedBedsFinished<1||stage5.headboardMoodLightStrips<1||
   stage5.integratedBedsideShelves<2||stage5.sourceFloorProbesPassed<1)
  throw Error('Stage 5 bedroom/reading furnishings must be source-backed and auto-on: '+
   JSON.stringify({stage5,integratedStart}));
 console.log('STAGE5_BEDROOMS_STUDY_PRODUCTION_AUTO_VISIBLE',JSON.stringify({
  sourceBeds:stage5.sourceBedCount,finishedBeds:stage5.sourceSupportedBedsFinished,
  headboardLights:stage5.headboardMoodLightStrips,
  bedsideTrays:stage5.integratedBedsideShelves,
  rugs:stage5.bedroomRugs,wardrobePanels:stage5.wardrobePanels,
  wardrobeRooms:stage5.wardrobeRooms,readingDesk:stage5.readingDesks,
  readingShelves:stage5.readingShelves,
  exclusions:stage5.skipped,
  clientApproved:false,noPhasePreviewClick:true,
  sourceIFCUnmodified:true
 }));
 const wetCandidates=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.auditWetFixtureCandidates())"));
 console.log('STAGE6_SOURCE_IFC_FURNISHING_AUDIT',JSON.stringify(
  wetCandidates.filter(x=>!['FU - 005','FU - 002'].includes(x.name)).slice(0,100)));
 console.log('STAGE6_FURNISHING_TYPE_COUNTS',JSON.stringify(
  wetCandidates.reduce((a,x)=>(a[x.name]=(a[x.name]||0)+1,a),{})));
 const stage6Initial=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage6WetAreasStatus())"));
 if(!stage6Initial?.productionIntegrated||stage6Initial.previewActivationRequired||
    !stage6Initial.sourceGeometryPreserved||
    !stage6Initial.sourceDoorCollidersPreserved||
    !stage6Initial.sourceWallCollidersPreserved||
    stage6Initial.addedInternalWalls!==0||stage6Initial.addedDoors!==0||
    stage6Initial.newShowerPartitionsCreated!==0||
    stage6Initial.newUnverifiedToiletsCreated!==0||
    stage6Initial.exactBathroomPolygonsCertified||
    !integratedStart.stage6WetAreasIntegrated||
    stage6Initial.activeSourceWetZones<2||
    stage6Initial.identifiedSourceProxyFittings<3)
  throw Error('Stage 6 bathrooms must be source supported and already in the production house: '+
   JSON.stringify({stage6Initial,integratedStart}));
 console.log('STAGE6_SOURCE_WET_AREA_PRODUCTION_AUTO_VISIBLE',JSON.stringify({
  activeServiceZones:stage6Initial.activeSourceWetZones,
  originalProxyAnchors:stage6Initial.identifiedSourceProxyFittings,
  porcelainTiles:stage6Initial.porcelainFloorTiles,
  sourceWallTiling:stage6Initial.sourceWallTilePanels,
  existingRaisedFittingsLit:stage6Initial.illuminatedServiceMirrors,
  existingLowerFittingsTrimmed:stage6Initial.lowerFittingsAccented,
  sourceZoneAudit:stage6Initial.sourceZoneAudit,
  verifiedPlumbingOrSanitaryFitouts:false,
  noInventedWetWallsOrDoors:true,
  zeroExtraStageClicks:true
 }));
 const stage7Initial=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage7StairsBalconiesLightingStatus())"));
 if(!stage7Initial?.productionIntegrated||stage7Initial.previewActivationRequired||
    !stage7Initial.sourceGeometryPreserved||!stage7Initial.sourceCollidersPreserved||
    !stage7Initial.originalBalconyGuardsPreserved||
    !stage7Initial.originalBalconyDoorsPreserved||
    !stage7Initial.originalOpenPlanPreserved||
    stage7Initial.addedStairFlights!==0||stage7Initial.addedSafetyGuards!==0||
    stage7Initial.addedPartitionWalls!==0||!integratedStart.stage7Integrated||
    stage7Initial.sourceTreadsEnhanced<14||stage7Initial.sourceStepLEDs<14||
    stage7Initial.sourceBalconiesFinished!==3||
    stage7Initial.balconyDeckPieces<45||
    stage7Initial.balconyRailLEDs<7||
    !stage7Initial.accentLEDsVisible)
  throw Error('Stage 7 source-based staircase, balcony decks and lighting must be auto-visible: '+
    JSON.stringify({stage7Initial,integratedStart}));
 console.log('STAGE7_STAIRS_BALCONIES_LIGHTING_AUTO_VISIBLE',JSON.stringify({
   sourceTreads:stage7Initial.sourceTreadsEnhanced,
   treadLEDs:stage7Initial.sourceStepLEDs,
   balconyDecks:stage7Initial.sourceBalconiesFinished,
   deckTiles:stage7Initial.balconyDeckPieces,
   underHandrailLEDs:stage7Initial.balconyRailLEDs,
   balconySeats:stage7Initial.balconyChairs,
   balconyPlants:stage7Initial.balconyPlants,
   originalGuardsRetained:true,sourceIFCUnmodified:true,
   userMustEnableStage:false
 }));
 const stage8Initial=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage8ExteriorLandscapeStatus())"));
 if(!stage8Initial?.productionIntegrated||stage8Initial.previewActivationRequired||
    !stage8Initial.sourceExteriorSitePreserved||
    !stage8Initial.sourceIFCGeometryPreserved||
    !stage8Initial.originalGateOnPalmSideFence||
    !stage8Initial.straightDrivewayToCourtPreserved||
    !stage8Initial.seamlessDrivewayEdgePreserved||
    stage8Initial.originalGateWidthMetres!==4||
    stage8Initial.originalMarkedParkingBays!==3||
    stage8Initial.preservedPalms!==3||
    stage8Initial.lawnPercentage<=50||
    stage8Initial.builtNewBoundaryWalls!==0||
    stage8Initial.movedOriginalGate||
    stage8Initial.addedParkingShadeCanopy||
    stage8Initial.addedSurfaceDrainagePipework||
    stage8Initial.shrubClusters<5||
    stage8Initial.pathwayBollards<3||
    stage8Initial.palmUplights!==3||
    stage8Initial.gatePillarLights!==2||
    stage8Initial.parkingMarkers!==3||
    stage8Initial.lightsCurrentlyOn<8||
    !integratedStart.stage8ExteriorIntegrated||
    integratedStart.currentStage8LandscapePlants<5||
    integratedStart.currentStage8Lights<8)
  throw Error('Stage 8 must preserve the corrected site and load outdoor landscape and lights by default: '+
   JSON.stringify({stage8Initial,integratedStart}));
 console.log('STAGE8_EXTERIOR_PRODUCTION_AUTO_VISIBLE',JSON.stringify({
  shrubClusters:stage8Initial.shrubClusters,
  shrubs:stage8Initial.shrubStems,
  landscapeBollards:stage8Initial.pathwayBollards,
  palmUplights:stage8Initial.palmUplights,
  originalGatePillarLamps:stage8Initial.gatePillarLights,
  flushBayMarkers:stage8Initial.parkingMarkers,
  decorativeGravelStrips:stage8Initial.decorativeGravelStrips,
  lawnPercentage:stage8Initial.lawnPercentage,
  pavedPercentage:stage8Initial.pavedPercentage,
  walkingObstacles:stage8Initial.addedWalkBlockers,
  approvedGateStillOnPalmSide:true,
  originalDrivewayStillStraight:true,
  zeroStageActivationClicks:true,
  sourceIFCUnchanged:true
 }));
 const stage2Controls=JSON.parse(await evaluate(
  "JSON.stringify((()=>({roomCount:document.querySelector('#stage2FullRoom').options.length,"+
  "hasFloor:!!document.querySelector('#stage2FullFloor'),"+
  "hasWall:!!document.querySelector('#stage2FullWall'),"+
  "hasCeiling:!!document.querySelector('#stage2FullCeiling'),"+
  "hasSkirting:!!document.querySelector('#stage2FullSkirting'),"+
  "hasRestore:!!document.querySelector('#stage2RestoreAll')}))())"));
 if(stage2Controls.roomCount!==10||!Object.values(stage2Controls).every(Boolean))
  throw Error('Stage 2 room floor/wall/ceiling/skirting UI incomplete: '+JSON.stringify(stage2Controls));
 const fullProposal=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2ApplyWholeHouse())"));
 if(!fullProposal||fullProposal.enhancedRooms!==9||
    fullProposal.tiles<40||!fullProposal.sourceGeometryUnmodified||
    !fullProposal.sourceColliderCountUnchanged||
    fullProposal.finalPaletteApproved!==false||
    fullProposal.roomSelections['G-MAID'].floor!=='source')
  throw Error('Stage 2 ten-room proposal missing source-only safety: '+JSON.stringify(fullProposal));
 console.log('STAGE2_COMPLETE_PROPOSAL_BROWSER_QA',JSON.stringify({
  mappedRooms:fullProposal.mappedRooms,proposedRooms:fullProposal.enhancedRooms,
  tiles:fullProposal.tiles,wallParts:fullProposal.finishedSourceWallParts,
  ceilingPanels:fullProposal.ceilingPanels,skirting:fullProposal.skirtingPieces,
  thresholdPieces:fullProposal.thresholds,maidUnchanged:true
 }));
 // Optional legacy image: the Stage 9 matrix supersedes this slow capture.
 if(process.env.QA_LEGACY_SCREENSHOTS==='1')try{
  const focus=JSON.parse(await evaluate(
   "JSON.stringify(window.__AutoMindsQA.inspectStage1Room('G-DINING'))"));
  if(!focus?.ok)throw Error('Cannot frame Stage 2 dining scene');
  await sleep(300);
  const png=await captureCanvasPng();
   fs.mkdirSync('analysis',{recursive:true});
   fs.writeFileSync('analysis/stage2-source-supported-dining-finishes.png',png);
 }catch(error){console.warn('STAGE2_VISUAL_SCREENSHOT_UNAVAILABLE',String(error))}
 const afterRoom=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2ApplyOneRoom('G-DINING',"+
   "{floor:'caramel',wall:'stone-accent',ceiling:'beamed',palette:'mint',skirting:true}))"));
 if(!afterRoom||afterRoom.enhancedRooms!==9||
    afterRoom.roomSelections['G-DINING'].floor!=='caramel'||
    afterRoom.roomSelections['G-DINING'].wall!=='stone-accent'||
    afterRoom.roomSelections['G-DINING'].ceiling!=='beamed')
  throw Error('Stage 2 room-specific customization failed');
 const fullRestored=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2RestoreWholeHouse())"));
 if(fullRestored.enhancedRooms!==0||fullRestored.tiles!==0||
    fullRestored.finishedSourceWallParts!==0||
    fullRestored.ceilingPanels!==0||fullRestored.skirtingPieces!==0||
    fullRestored.sourceWallMaterialsOverriddenReversibly!==0||
    !fullRestored.sourceGeometryUnmodified||!fullRestored.sourceColliderCountUnchanged)
  throw Error('Stage 2 original source restoration failed: '+JSON.stringify(fullRestored));
 console.log('STAGE2_FINISHES_FULL_RESTORATION_PASSED',JSON.stringify({
  rooms:fullRestored.mappedRooms,remainingFinishes:fullRestored.enhancedRooms,
  sharedSourceMaterialsRestored:true,clientApprovalStillPending:true
 }));
 // Restore the *finished* house after deliberately testing the developer-only
 // reverse/restore controls. Regular visitors never see the bare source house.
 const builtIn=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage2ApplyWholeHouse())"));
 if(!builtIn||builtIn.enhancedRooms!==9||builtIn.tiles<40)
  throw Error('Production room finishes did not return after QA restoration');
 const kitchenInitial=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage3KitchenStatus())"));
 if(!kitchenInitial||!kitchenInitial.enabled||!kitchenInitial.visible||
    !kitchenInitial.sourceWorktopVerified||
    kitchenInitial.baseCabinetPanels<2||kitchenInitial.sourceFloorProbesPassed<2)
  throw Error('Production kitchen must be shown automatically on the real house: '+
    JSON.stringify(kitchenInitial));
 // Assert the state WITHOUT clicking any button. The removed preview CTA is
 // never a prerequisite for a finished visitor-facing walkthrough.
 const kitchenPreview=kitchenInitial;
 if(!kitchenPreview.enabled||!kitchenPreview.visible||
    kitchenPreview.appliancePieces<5||!kitchenPreview.sourceGeometryUnmodified||
    !kitchenPreview.sourceCollidersUnmodified||
    !kitchenPreview.openConceptConnectionsUnchanged||
    kitchenPreview.pantryShelvesCreated!==0||
    kitchenPreview.clearanceMeasuredAndApproved||kitchenPreview.clientApproved)
  throw Error('Stage 3 kitchen preview must remain source-backed, removable and unapproved: '+
    JSON.stringify(kitchenPreview));
 const kitchenOptions=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage3KitchenOptions({appliances:false,lighting:false}))"));
 if(kitchenOptions.options.appliances||kitchenOptions.options.lighting)
  throw Error('Stage 3 appliance and task-light controls did not separate');
 const kitchenStorage=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.stage3KitchenStorage(true))"));
 if(!kitchenStorage.storageOpen)throw Error('Stage 3 interactive storage toggle failed');
 const kitchenRestored=JSON.parse(await evaluate(
  "JSON.stringify((()=>{document.querySelector('#stage3Restore').click();"+
  "return window.__AutoMindsQA.stage3KitchenStatus()})())"));
 if(kitchenRestored.enabled||kitchenRestored.visible||
    !kitchenRestored.sourceGeometryUnmodified||
    !kitchenRestored.sourceCollidersUnmodified)
  throw Error('Stage 3 original source kitchen restoration failed: '+
    JSON.stringify(kitchenRestored));
 // Return to production appearance after QA tests of optional internals.
 const kitchenProductionRestored=JSON.parse(await evaluate(
  "JSON.stringify((()=>{window.__AutoMindsQA.stage3KitchenOptions({"+
  "appliances:true,lighting:true,storage:true,cabinetry:true});"+
  "return window.__AutoMindsQA.stage3KitchenPreview()})())"));
 if(!kitchenProductionRestored.enabled||!kitchenProductionRestored.visible)
  throw Error('Kitchen did not resume the production integrated scene after QA');
 console.log('STAGE3_KITCHEN_REAL_BROWSER_QA',JSON.stringify({
  sourceGuid:kitchenInitial.sourceWorktopGuid,
  cabinetPanels:kitchenPreview.baseCabinetPanels,
  applianceParts:kitchenPreview.appliancePieces,
  pullOuts:kitchenPreview.storageFixtures,
  taskLEDs:kitchenPreview.ledStrips,
  pantryNotFabricated:true,sourceGeometryUnmodified:true,
  initialAutomaticallyActive:true,qaRestorationAvailable:true
 }));
 const stage1Focus=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.inspectStage1Room('G-DINING'))"));
 if(!stage1Focus?.ok||!stage1Focus.provisional||stage1Focus.verifiedRoomPolygon)
   throw Error('Stage 1 source-plan room inspection did not remain provisional');
 fs.mkdirSync('analysis',{recursive:true});
 // Optional legacy dining draft; final Stage 9 captures replace this.
 if(process.env.QA_LEGACY_SCREENSHOTS==='1')try{
  fs.writeFileSync('analysis/stage1-dining-draft.png',await captureCanvasPng());
 }catch(error){console.warn('STAGE1_SCREENSHOT_UNAVAILABLE',String(error))}
 const stage1Cleared=await evaluate("window.__AutoMindsQA.removeStage1DraftOutline()");
 if(!stage1Cleared)throw Error('Stage 1 provisional line could not be removed');
 await evaluate("document.querySelector('#floorButtons [data-floor=all]').click()");
 const stage1Camera=JSON.parse(await evaluate(
  "JSON.stringify(window.__AutoMindsQA.sceneStatus())"));
 if(stage1Camera.floor!=='all'||stage1Camera.section)
  throw Error('Stage 1 room inspection did not restore original building view');
 fs.writeFileSync('analysis/stage1-room-candidate-crosswalk.json',
  JSON.stringify({source:crosswalk.source,
   entries:crosswalk.entries.map(({id,level,reportedAreaM2,
    provisionalSketchedAreaM2,provisionalAreaDeltaPct,
    registrationConfidence,candidateIfcGuids})=>({
     id,level,reportedAreaM2,provisionalSketchedAreaM2,
     provisionalAreaDeltaPct,registrationConfidence,
     candidateIfcGuids:candidateIfcGuids.slice(0,25)
   })),signedOff:false},null,2));
 console.log('STAGE1_PLAN_ROOM_LOCATOR_BROWSER_PASSED',JSON.stringify({
  sourceHomeS1Reviewed:true,provisionalPolygons:10,
  certifiedPolygons:0,maidenRoomAreaConflictFlagged:true,
  nonDestructivePreview:true,siteRevisionProtected:true,
  roomCandidatesReported:crosswalk.entries.map(x=>({id:x.id,n:x.sourceCandidateCountTotal,
   detailListTruncated:x.candidateListTruncated}))
 }));
 const openGeometry=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.auditOpenConceptGeometry())"));
 fs.mkdirSync('analysis',{recursive:true});
 fs.writeFileSync('analysis/open-plan-live-geometry.json',JSON.stringify(openGeometry,null,2));
 console.log('OPEN_PLAN_LIVE_GEOMETRY',JSON.stringify(openGeometry.counts));
 const summary=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.summary())"));
 const nov21=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.auditNov21ClientAreas())"));
 console.log('NOV21_DOOR_LOCATIONS',JSON.stringify(nov21.doors.map(d=>({
  id:d.id,x:d.x,z:d.z,style:d.style,removed:d.removed,width:d.width
 }))));
 console.log('NOV21_SOURCE_GEOMETRY',JSON.stringify(nov21.source));
 console.log('NOV21_STAIR_GENERATED',JSON.stringify(nov21.stairGenerated.filter((x,i)=>i<75)));

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
 const cleared=summary.planCirculation?.clientStairKitchenCleanout;
 const entrance=summary.mainDoorEnclosure;
 const badStairPosts=nov21.source.filter(r=>
  ['3kAl0gHyX6ihgy9PBZMVtT','1xo0ba7TzEN8lQogEQUDNP'].includes(r.guid)&&r.visible);
 const badRibs=nov21.source.filter(r=>r.name==='CRE - 001'&&r.visible&&
  r.box.x[0]>112.34&&r.box.x[1]<112.45&&
  r.box.z[0]>-2.30&&r.box.z[1]<-.50&&r.dims[1]<1.1);
 if(cleared?.groundKitchenStairWallHidden!==1||
  cleared?.groundKitchenStairFacesHidden!==3||
  cleared?.oldStairRoomPostsHidden!==2||
  cleared?.kitchenRibColumnsHidden!==59||
  cleared?.upperFaceGroundClipped!==1||
  badStairPosts.length||badRibs.length||
  !nov21.doors.find(d=>d.id===21)?.removed||
  entrance?.mainDoubleDoorId!==27||
  entrance?.sideWallPanels!==2||
  !entrance?.overheadClosure||!entrance?.sourceWindowWD007Preserved)
   throw Error('Client stair-to-kitchen open-concept / main-door enclosure invalid: '+
    JSON.stringify({cleared,entrance,badStairPosts,badRibs:badRibs.length}));
 console.log('NOV21_STAIR_KITCHEN_ENTRANCE_ACCEPTED',JSON.stringify({
  cleared,entrance,oldStairColumnsVisible:badStairPosts.length,
  visibleKitchenRibColumns:badRibs.length,stairKitchenDoorRemoved:true
 }));
 const siteReview=summary.siteContext;
 if(!siteReview?.gateOnPalmTreeSideFence||
   !siteReview?.oldGateBoundaryRestored||
   !siteReview?.straightDrivewayToParking||
   !siteReview?.straightPavingOuterEdge||
   siteReview?.driveCourtRightEdgeOffsetMetres!==0||
   !siteReview?.continuousPavingGateToParking||
   siteReview?.gateDistanceFromForegroundCornerMetres>14||
   siteReview?.totalPavingOutdoorCoverage>=50||
   siteReview?.totalPavingOutdoorCoverage<30||
   siteReview?.lawnOutdoorCoverageApprox<=50||
   siteReview?.parkingOutdoorCoverage<25||
   siteReview?.parkingOutdoorCoverage>=45||
   siteReview?.palmTreesPreserved!==3)
   throw Error('Approved palm-side gate / direct drive / generous lawn regression: '+
    JSON.stringify(siteReview));
 console.log('APPROVED_GATE_DRIVEWAY_AND_LAWN_VERIFIED',JSON.stringify({
  gateOnPalmSide:true,
  gateCornerOffsetMetres:siteReview.gateDistanceFromForegroundCornerMetres,
  straightDriveway:true,
  straightPavingOuterEdge:true,
  parkingDriveEdgeOffsetMetres:siteReview.driveCourtRightEdgeOffsetMetres,
  pavedParkingCoveragePercent:siteReview.parkingOutdoorCoverage,
  totalPavedOutdoorCoveragePercent:siteReview.totalPavingOutdoorCoverage,
  lawnOutdoorCoverageApprox:siteReview.lawnOutdoorCoverageApprox,
  retainedLawnPalmTrees:siteReview.palmTreesPreserved
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
    !openPlan.disabledDoorIds.includes(21)||
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
 const briefBefore=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.designBriefStatus())"));
 const briefTest=JSON.parse(await evaluate("JSON.stringify((()=>{\n const panel=document.querySelector('#designStudioPanel');\n document.querySelector('#designStudioBtn').click();\n const panelVisible=!panel.classList.contains('hidden');\n const select=document.querySelector('#designScheme');\n const initial=window.__AutoMindsQA.designBriefStatus().scheme;\n select.value='mint';select.dispatchEvent(new Event('change',{bubbles:true}));\n const mint=window.__AutoMindsQA.designBriefStatus().scheme;\n select.value='powder';select.dispatchEvent(new Event('change',{bubbles:true}));\n const powder=window.__AutoMindsQA.designBriefStatus().scheme;\n select.value='source';select.dispatchEvent(new Event('change',{bubbles:true}));\n const restored=window.__AutoMindsQA.designBriefStatus().scheme;\n document.querySelector('#designTaskToggle').click();\n const taskOff=window.__AutoMindsQA.lightingStatus();\n document.querySelector('#designTaskToggle').click();\n const taskRestored=window.__AutoMindsQA.lightingStatus();\n document.querySelector('#designStudioBtn').click();\n return {panelVisible,initial,mint,powder,restored,taskOff,\n  taskRestored,panelClosed:panel.classList.contains('hidden')};\n})())"));
 if(briefBefore.scheme!=='source'||briefBefore.lighting?.briefFixtureCount!==5||
  briefBefore.lighting?.activeEmitters!==14||!briefTest.panelVisible||
  !briefTest.panelClosed||briefTest.initial!=='source'||briefTest.mint!=='mint'||
  briefTest.powder!=='powder'||briefTest.restored!=='source'||
  briefTest.taskOff.layers.task!==false||briefTest.taskOff.activeBriefEmitters!==3||
  briefTest.taskRestored.layers.task!==true||briefTest.taskRestored.activeBriefEmitters!==5)
  throw Error('Studio Anne material preview / lighting failed: '+
   JSON.stringify({briefBefore,briefTest}));
 console.log('STUDIO_ANNE_BRIEF_PREVIEW_PASSED',
  JSON.stringify({schemeRestored:briefTest.restored,
   taskLightsIndependentlyControlled:true,fixturePreviews:5}));
 const floorQA=JSON.parse(await evaluate("JSON.stringify((()=>{\n const f=document.querySelector('#designFloor');\n const initial=window.__AutoMindsQA.designBriefStatus().floor.style;\n f.value='ash';f.dispatchEvent(new Event('change',{bubbles:true}));\n const ash=window.__AutoMindsQA.designBriefStatus().floor.style;\n f.value='porcelain';f.dispatchEvent(new Event('change',{bubbles:true}));\n const porcelain=window.__AutoMindsQA.designBriefStatus().floor.style;\n f.value='caramel';f.dispatchEvent(new Event('change',{bubbles:true}));\n const caramel=window.__AutoMindsQA.designBriefStatus().floor.style;\n f.value='source';f.dispatchEvent(new Event('change',{bubbles:true}));\n const restored=window.__AutoMindsQA.designBriefStatus().floor.style;\n return {initial,ash,porcelain,caramel,restored};\n})())"));
 if(floorQA.initial!=='source'||floorQA.ash!=='ash'||
  floorQA.porcelain!=='porcelain'||floorQA.caramel!=='caramel'||
  floorQA.restored!=='source')
  throw Error('Studio Anne flooring comparisons did not reset: '+
   JSON.stringify(floorQA));
 console.log('STUDIO_ANNE_PAGE7_FLOORS_PASSED',JSON.stringify(floorQA));
 const ids=(process.env.QA_ALL_DOORS==='1'?Array.from({length:29},(_,i)=>i+1):[6,12,14,15,19,26,27,28,29]).filter(id=>id!==21&&id!==22&&id!==25);
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
 if(summary.doorCount!==29||summary.activeDoorCount!==26||summary.windows?.windowAssemblies<20)
  throw Error('Unexpected door/window model count');
 if(summary.openingRegistry?.verifiedDoorWallCutouts<26)
  throw Error('Not all IFC doorways have source-matched visual cutouts');
 if(summary.verifiedFacadeGlazing?.sourceAlignedPanels<2)
  throw Error('Source-verified first-floor glazing not active');
 if(scene.outsideRawMeshesVisible!==0||scene.originalWindowProxiesStillVisible!==0)
  throw Error('Source visibility regression');
 if(exceptions.length)throw Error('Uncaught browser errors: '+exceptions.join('; '));
 if(obstructed.length)throw Error('Open doorway crossing failures: '+obstructed.map(x=>x.id).join(','));
 if(blockedWhenClosed.length)throw Error('Closed door crossings should not be permitted: '+blockedWhenClosed.join(','));
 if(circulation&&circulation.passed!==circulation.total)throw Error('Continuous architectural routes incomplete: '+circulation.passed+'/'+circulation.total);
 // Stage 9 engineering evidence: six real Chrome PNGs for human review.
 // A screenshot passing capture checks does NOT certify aesthetics or sources.
 const visualDir=path.resolve('analysis/stage9-visuals');
 fs.mkdirSync(visualDir,{recursive:true});
 let screenshots=[];
 let mobilePerf=null,mobileNav=null;
 const rawMetrics=()=>evaluate("JSON.stringify(window.__AutoMindsQA.stage9PerformanceStatus())");
 const phase10=JSON.parse(await evaluate("JSON.stringify(window.__AutoMindsQA.phase10PerformanceAudit())"));
 if(!phase10?.visibilityRestored||!phase10.batching.originalMeshesRetained||
    phase10.batching.extraBytes>phase10.batching.maxExtraBytes||
    phase10.baseline.drawCalls<=phase10.optimized.drawCalls||
    phase10.reductionPercent<20)
  throw Error('Phase 10 needs measurable same-camera draw reduction: '+JSON.stringify(phase10));
 // Batches preserve all triangles, but a merged bounding volume may admit
 // a few formerly culled triangles. Record rather than claim exact draw parity.
 console.log('PHASE10_SAME_CAMERA_PERFORMANCE',JSON.stringify(phase10));
 report.phase10=phase10;
 const desktopPerf=JSON.parse(await rawMetrics());
 if(!desktopPerf.webglResponsive||!Number.isFinite(desktopPerf.drawCalls)||
    !Number.isFinite(desktopPerf.triangles)||desktopPerf.drawCalls<1||
    desktopPerf.drawCalls>15000||desktopPerf.triangles>15000000||
    desktopPerf.rendererDpr>STAGE9_QA_POLICY.maximumDesktopDpr+.01)
  throw Error('Stage 9 desktop WebGL invalid: '+JSON.stringify(desktopPerf));
 if(process.env.QA_ALL_DOORS==='1'){
  // The preceding fast walkthrough already captured all six rendered views
  // in this very workflow job. Reuse its image files to avoid redrawing the
  // software-rendered GLB house six more times during exhaustive route QA.
  const prior=JSON.parse(fs.readFileSync(outputFile,'utf8'));
  if(prior.status!=='complete'||prior.stage9?.screenshots?.length!==
     STAGE9_QA_POLICY.screenshotScenes.length)
   throw Error('Stage 9 exhaustive QA requires successful visual evidence from the first browser pass');
  screenshots=prior.stage9.screenshots;
  for(const shot of screenshots){
   if(!fs.existsSync(shot.path)||fs.statSync(shot.path).size<5000)
    throw Error('Stage 9 visual artifact missing for full QA: '+shot.path);
  }
  mobilePerf=prior.stage9.mobilePerformance;
  mobileNav=prior.stage9.mobileNavigation;
  if(!mobilePerf||!mobileNav?.open)throw Error('Stage 9 mobile evidence not retained');
 }else{
 await evaluate("document.documentElement.classList.add('production-design')");
 await evaluate("document.querySelector('#floorButtons button[data-floor=\"all\"]').click()");
 await sleep(550);
 async function captureVisual(name,widthExpected){
  if(!STAGE9_QA_POLICY.screenshotScenes.includes(name))
   throw Error('Unexpected Stage 9 scene: '+name);
  const png=await captureCanvasPng();
  if(png.length<5000||png.toString('ascii',1,4)!=='PNG')
   throw Error('Invalid Stage 9 screenshot '+name+' bytes='+png.length);
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  if(width!==widthExpected)
   throw Error('Stage 9 incorrect screenshot viewport '+name+': '+width);
  const rel='analysis/stage9-visuals/'+name+'.png';
  fs.writeFileSync(rel,png);
  screenshots.push({id:name,path:rel,width,height,bytes:png.length});
 }
 await captureVisual('desktop-whole-house-day',1280);
 await evaluate("document.querySelector('#lightBtn').click()");
 await sleep(480);
 await captureVisual('desktop-whole-house-night',1280);
 await evaluate("document.querySelector('#lightBtn').click()");
 await evaluate("document.querySelector('#floorButtons button[data-floor=\"ground\"]').click()");
 await sleep(420);
 await captureVisual('desktop-ground-floor',1280);
 await evaluate("document.querySelector('#floorButtons button[data-floor=\"first\"]').click()");
 await sleep(420);
 await captureVisual('desktop-first-floor',1280);
 await evaluate("document.querySelector('#floorButtons button[data-floor=\"all\"]').click()");
 await cdp('Emulation.setDeviceMetricsOverride',{
  // Keep desktop viewport mechanics while shrinking CSS to a 390px
  // compact-screen width. Chrome mobile:true under software WebGL can
  // preserve a 1280px layout viewport and expand height to 2700px.
  width:390,height:844,deviceScaleFactor:2,mobile:false,
  screenWidth:390,screenHeight:844
 });
 await sleep(900);
 mobilePerf=JSON.parse(await rawMetrics());
 if(mobilePerf.cssWidth!==390||mobilePerf.rendererDpr>1.01||
    mobilePerf.canvasWidth>390||!mobilePerf.webglResponsive)
  throw Error('Stage 9 mobile rendering budget invalid: '+JSON.stringify(mobilePerf));
 await captureVisual('mobile-house-day',390);
 mobileNav=JSON.parse(await evaluate("JSON.stringify((()=>{const b=document.querySelector('#mobileExploreBtn');b.click();return {expanded:b.getAttribute('aria-expanded'),open:document.querySelector('#exploreSidebar').classList.contains('mobileExpanded'),scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};})())"));
 if(mobileNav.expanded!=='true'||!mobileNav.open)
  throw Error('Stage 9 mobile navigation does not open: '+JSON.stringify(mobileNav));
 await sleep(340);
 await captureVisual('mobile-navigation-open',390);
 await evaluate("document.querySelector('#mobileExploreBtn').click()");
 await cdp('Emulation.clearDeviceMetricsOverride');
 await sleep(250);
 }
 const engineering=summarizeStage9Engineering({
  loadedLayers:ready.loadedLayers,activeDoors:summary.activeDoorCount,
  routesPassed:circulation?.passed??null,balconies:balcony.restored,
  sourcePreserved:stage8Initial.sourceIFCGeometryPreserved&&
   stage8Initial.sourceExteriorSitePreserved,
  stagesAutoVisible:integratedStart.active&&
   integratedStart.stage4LivingDiningIntegrated&&
   integratedStart.stage5BedroomsStudyIntegrated&&
   integratedStart.stage6WetAreasIntegrated&&
   integratedStart.stage7Integrated&&integratedStart.stage8ExteriorIntegrated,
  screenshotCount:screenshots.length,
  mobileCapture:mobilePerf.cssWidth===390,browserExceptions:exceptions.length
 });
 if(process.env.QA_ALL_DOORS==='1'&&!engineering.readyForClientReview)
  throw Error('Stage 9 final engineering QA not complete: '+JSON.stringify(engineering));
 report.stage9={engineering,desktopPerformance:desktopPerf,mobilePerformance:mobilePerf,
  screenshots,mobileNavigation:mobileNav,clientApproved:false,
  architectApproved:false,visualHumanReviewPending:true};
 console.log('STAGE9_VISUAL_PERFORMANCE_AUDIT',JSON.stringify({
  screenshots:screenshots.length,
  desktop:{drawCalls:desktopPerf.drawCalls,triangles:desktopPerf.triangles,
   geometries:desktopPerf.geometries,textures:desktopPerf.textures,
   glbRequests:desktopPerf.glbRequests,dpr:desktopPerf.rendererDpr},
  mobile:{width:mobilePerf.cssWidth,dpr:mobilePerf.rendererDpr,
   canvasWidth:mobilePerf.canvasWidth,menuOpens:true},
  fullDoorAndRouteTest:process.env.QA_ALL_DOORS==='1',
  engineering:engineering.engineeringStatus,
  clientAcceptance:'pending',architectApproval:'pending'
 }));
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
