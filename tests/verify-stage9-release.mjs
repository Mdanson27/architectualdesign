import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
 STAGE9_QA_POLICY,productionPixelRatio,summarizeStage9Engineering
} from '../src/phase2/stage9-quality-policy.js';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=STAGE9_QA_POLICY;
const manifest=read('public/ifc/house/manifest.json');
const source=read('public/ifc/house/source-elements.json');
const acceptance=read('architecture/stage1-acceptance.json');
const stage5=read('architecture/stage5-bedrooms-study.json');
const stage6=read('architecture/stage6-wet-areas.json');
const stage7=read('architecture/stage7-stairs-balconies-lighting.json');
const stage8=read('architecture/stage8-exterior-landscape.json');
const stage9=read('architecture/stage9-final-acceptance.json');
assert.equal(policy.expectedIfcLayers,76);
assert.equal(manifest.layers.length,policy.expectedIfcLayers);
assert.equal(Object.keys(source).length,policy.expectedSourceElements);
assert.equal(manifest.missingOrFailed?.length,policy.knownIfcConversionExclusions);
assert.equal(acceptance.roomAcceptance.length,10);
assert(acceptance.roomAcceptance.every(x=>x.polygonVerified===false),
 'Unsurveyed S1 room outlines must not be shown as architect-approved');
assert(acceptance.approval.status==='pending');
assert(acceptance.approval.approver===null);
assert(stage5.pending.some(x=>x.includes('Maid')));
assert(stage6.sourceAudit.ifcSanitaryTerminalCount===0);
assert(stage7.guardEngineeringApproved!==true);
assert(stage7.pendingApprovals.some(x=>x.includes('Electrical')));
assert.equal(stage8.movedApprovedGate,false);
assert.equal(stage8.addedBoundaryWalls,0);
assert.equal(stage8.originalSitePreserved.parkingBays,3);
assert.equal(stage9.clientAcceptance.status,'pending');
assert.equal(stage9.clientAcceptance.signedBy,null);
assert.equal(stage9.architectApproval.status,'pending');
assert.equal(stage9.publicReleasePolicy.automaticDesignStages,8);
assert.equal(stage9.constructionCertified,false);
assert(stage9.outstandingGates.length>=6);
assert(policy.screenshotScenes.length>=6);
assert.equal(productionPixelRatio(2.0,390),1);
assert.equal(productionPixelRatio(3.0,760),1.3);
assert.equal(productionPixelRatio(1.0,1440),1.0);
assert.equal(productionPixelRatio(0,1440),1);
assert.equal(productionPixelRatio(NaN,350),1);
const sample=summarizeStage9Engineering({
 loadedLayers:76,activeDoors:26,routesPassed:5,balconies:3,
 sourcePreserved:true,stagesAutoVisible:true,screenshotCount:6,
 mobileCapture:true,browserExceptions:0
});
assert.equal(sample.engineeringStatus,'verified');
assert.equal(sample.readyForClientReview,true);
assert.equal(sample.finalClientApproved,false);
const missing=summarizeStage9Engineering({
 loadedLayers:76,activeDoors:25,routesPassed:5,balconies:3,
 sourcePreserved:true,stagesAutoVisible:true,screenshotCount:6,
 mobileCapture:true,browserExceptions:0
});
assert.equal(missing.engineeringStatus,'needs-work');
assert.equal(missing.readyForClientReview,false);
let glbBytes=0,largest=0,glbCount=0;
const paths=new Set();
for(const layer of manifest.layers){
 assert(layer.name&&layer.level&&layer.category);
 assert(/^\/ifc\/house\/.+\.glb$/.test(layer.glb));
 assert(!paths.has(layer.glb),'Duplicate IFC layer path: '+layer.glb);
 paths.add(layer.glb);
 const rel='public'+layer.glb;
 assert(fs.existsSync(rel),'Broken source GLB path: '+rel);
 const len=fs.statSync(rel).size;
 assert(len>100,'Empty IFC geometry: '+rel);
 largest=Math.max(largest,len);glbBytes+=len;glbCount++;
}
assert.equal(glbCount,76);
assert(glbBytes<=policy.glbBudgetBytes,
 'Stage 9 original IFC asset budget exceeded: '+glbBytes);
assert(largest<=policy.largestGlbBudgetBytes,
 'Oversized individual GLB: '+largest);
const build=get('src/phase2/actual-house.js');
assert(build.includes('productionPixelRatio(window.devicePixelRatio||1,window.innerWidth)'));
assert(build.includes('if(document.hidden)return;'));
assert(build.includes('if(!publicPreview||qaPage)'));
assert(build.includes('stage9PerformanceStatus:()=>'));
assert(!build.includes('state.stage9Enabled'),'Stage 9 is NOT a visitor preview toggle');
const visual=get('tests/qa-production-browser.mjs');
for(const scene of policy.screenshotScenes)assert(
 visual.includes(scene),'Missing Stage 9 visual evidence case: '+scene);
assert(visual.includes('STAGE9_VISUAL_PERFORMANCE_AUDIT'));
assert(visual.includes('summarizeStage9Engineering('));
const workflow=get('.github/workflows/pages.yml');
assert(workflow.includes('npm run test:stage9'));
assert(workflow.includes('analysis/stage9-visuals/'));
console.log('STAGE9_SOURCE_AND_ACCEPTANCE_RELEASE_GATE',JSON.stringify({
 ifcLayers:glbCount,sourceElements:Object.keys(source).length,
 missingIfcProxyConversions:manifest.missingOrFailed.length,
 originalGlbMiB:+(glbBytes/1048576).toFixed(2),
 largestGlbMiB:+(largest/1048576).toFixed(2),
 budgetMiB:policy.glbBudgetBytes/1048576,
 clientApproval:'pending',architectApproval:'pending',
 sourceRoomPolygonsArchitectCertified:0,
 snapshotScenarios:policy.screenshotScenes.length,
 compactDpr:policy.maximumCompactDpr,desktopDpr:policy.maximumDesktopDpr,
 verifiedAllEightStagesAsAutoIntegrated:true
}));
