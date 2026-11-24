/**
 * Stage 9: quality-control policy, not a replacement architectural stage.
 * Keep low-end mobile GPUs responsive while retaining full architectural
 * fidelity and the 76 source IFC layers.
 */
export const STAGE9_QA_POLICY=Object.freeze({
 schema:'autominds.spaces.stage9.quality.v1',
 expectedIfcLayers:76,knownIfcConversionExclusions:3,
 expectedSourceElements:2575,
 activeDoors:26,sourceCirculationRoutes:5,sourceBalconies:3,
 maximumDesktopDpr:1.3,maximumCompactDpr:1.0,
 compactScreenCutoffCssPx:760,
 glbBudgetBytes:75*1024*1024,
 largestGlbBudgetBytes:10*1024*1024,
 screenshotScenes:Object.freeze([
  'desktop-whole-house-day','desktop-whole-house-night',
  'desktop-ground-floor','desktop-first-floor',
  'mobile-house-day','mobile-navigation-open'
 ]),
 // Rendered visual proposals do NOT constitute construction / owner signoff.
 engineeringReadinessCannotImplyClientApproval:true
});
export function productionPixelRatio(deviceDpr=1,viewportCssWidth=1280){
 const dpr=Number.isFinite(deviceDpr)&&deviceDpr>0?deviceDpr:1;
 const compact=Number.isFinite(viewportCssWidth)&&
  viewportCssWidth<STAGE9_QA_POLICY.compactScreenCutoffCssPx;
 return Math.min(dpr,compact?STAGE9_QA_POLICY.maximumCompactDpr:
  STAGE9_QA_POLICY.maximumDesktopDpr);
}
export function summarizeStage9Engineering(evidence={}){
 const checks={
  sourceLayers:evidence.loadedLayers===STAGE9_QA_POLICY.expectedIfcLayers,
  doors:evidence.activeDoors===STAGE9_QA_POLICY.activeDoors,
  routes:evidence.routesPassed===STAGE9_QA_POLICY.sourceCirculationRoutes,
  balconies:evidence.balconies===STAGE9_QA_POLICY.sourceBalconies,
  sourceGeometry:evidence.sourcePreserved===true,
  productionAutoVisible:evidence.stagesAutoVisible===true,
  screenshotMatrix:evidence.screenshotCount>=STAGE9_QA_POLICY.screenshotScenes.length,
  mobileCapture:evidence.mobileCapture===true,
  browserExceptions:evidence.browserExceptions===0
 };
 const passed=Object.values(checks).every(Boolean);
 return {schema:STAGE9_QA_POLICY.schema,engineeringStatus:passed?'verified':'needs-work',
  checks,readyForClientReview:passed,finalClientApproved:false,
  architectApproved:false,constructionCertified:false};
}
