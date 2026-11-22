import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 HOME_S1_SOURCE_REVIEW,STAGE1_PLAN_SKETCHES,STAGE1_S1_ADDITIONAL_CONDITIONS,
 polygonArea,polygonBounds,insidePolygon,buildStage1PlanCrosswalk
} from '../src/phase2/stage1-plan-crosswalk.js';
import {STAGE1_ROOMS,buildStage1RoomAudit} from '../src/phase2/stage1-room-audit.js';

const manifest=JSON.parse(fs.readFileSync('public/ifc/house/manifest.json','utf8'));
const elements=JSON.parse(fs.readFileSync('public/ifc/house/source-elements.json','utf8'));
const beforeM=JSON.stringify(manifest),beforeE=JSON.stringify(elements);
assert.equal(HOME_S1_SOURCE_REVIEW.visuallyReviewed,true);
assert.equal(HOME_S1_SOURCE_REVIEW.gridWidthM,16.4);
assert.equal(HOME_S1_SOURCE_REVIEW.modelDatumsM.first,3.3);
assert.equal(HOME_S1_SOURCE_REVIEW.clientCompoundRevisionSupersedesOriginalGate,true);
assert.equal(Object.keys(STAGE1_PLAN_SKETCHES).length,10);
assert.equal(STAGE1_S1_ADDITIONAL_CONDITIONS.length,7);
const cross=buildStage1PlanCrosswalk(STAGE1_ROOMS,[]);
assert.equal(cross.provisionalSketchedRoomCount,10);
assert.equal(cross.verifiedRoomPolygonCount,0);
assert.equal(cross.verifiedRoomGuidAssignments,0);
assert.equal(cross.sourceFilesUnmodified,true);
assert.equal(cross.clientApproval,false);
assert(cross.entries.every(x=>!x.polygonVerified&&!x.clientApproved&&
 x.ifcRoomGuidsVerified.length===0&&x.status==='review-required'));
assert(cross.entries.every(x=>Number.isFinite(x.provisionalSketchedAreaM2)&&
 x.provisionalSketchedAreaM2>0&&x.provisionalIfcXZVertices.length>=4));
for(const entry of cross.entries){
 const s=STAGE1_PLAN_SKETCHES[entry.id];
 assert.equal(entry.level,s.floor);
 assert.equal(entry.provisionalSketchedAreaM2,Math.round(polygonArea(s.vertices)*1000)/1000);
 const b=polygonBounds(s.vertices);
 const middle=[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];
 if(entry.id!=='G-KITCHEN')assert(insidePolygon(middle,s.vertices),
  'Expected point within simple approximate '+entry.id+' room');
}
const family=cross.entries.find(x=>x.id==='F-FAMILY');
assert(Math.abs(family.provisionalAreaDeltaPct)<5);
const maid=cross.entries.find(x=>x.id==='G-MAID');
assert(maid.provisionalAreaDeltaPct< -15,'Do not overstate maid boundary confidence');
assert.equal(STAGE1_PLAN_SKETCHES['G-MAID'].confidence,'low');
const dining=cross.entries.find(x=>x.id==='G-DINING');
assert(insidePolygon([115.05,-1.52],dining.provisionalIfcXZVertices),
 'Verified provisional dining furniture anchor must be inside sketch');
const kitchen=cross.entries.find(x=>x.id==='G-KITCHEN');
assert(insidePolygon([109.36,-2.18],kitchen.provisionalIfcXZVertices),
 'Existing provisional kitchen lighting anchor should lie in kitchen sketch');
assert(insidePolygon([114.72,-3.19],family.provisionalIfcXZVertices),
 'Existing source sofa relocation should lie in family-room sketch');
const guid=Object.keys(elements)[0],mock=[{
 layer:{level:'ground'},category:'furniture',
 mesh:{userData:{ifc:{guid,name:'SOURCE SOFA'}}},
 box:{min:{x:114.9,z:-1.7},max:{x:115.2,z:-1.3}}
}];
const candidateCross=buildStage1PlanCrosswalk(STAGE1_ROOMS,mock);
const item=candidateCross.entries.find(x=>x.id==='G-DINING');
assert.equal(item.candidateIfcGuids.length,1);
assert.equal(item.candidateIfcGuids[0].guid,guid);
assert.equal(item.candidateIfcGuids[0].category,'furniture');
assert.equal(item.candidateIfcGuids[0].centerInsideCandidate,true);
assert.equal(item.ifcRoomGuidsVerified.length,0);
const sourceAudit=buildStage1RoomAudit(manifest,elements,mock);
assert.equal(sourceAudit.plan.sourcePlanReview.visuallyReviewed,true);
assert.equal(sourceAudit.plan.preliminarySourceCrosswalk.entries.length,10);
assert.equal(sourceAudit.plan.measuredRoomPolygons,0);
assert.equal(sourceAudit.plan.verifiedRoomIfcAssignments,0);
assert.equal(sourceAudit.plan.mainBedroomCount,4);
assert.equal(sourceAudit.plan.separateMaidRoomCount,1);
assert.equal(sourceAudit.readiness.stage1SignedOff,false);
assert.equal(JSON.stringify(manifest),beforeM);
assert.equal(JSON.stringify(elements),beforeE);
console.log('STAGE1_PLAN_S1_CROSSWALK_VERIFIED',JSON.stringify({
 readOriginalDrawing:true,rooms:cross.entries.length,polygonCertifications:0,
 preliminaryCandidateGuidOverlap:true,originalIFCUnmodified:true,
 maidFootprintNeedsReview:true,clientSiteRevisionPreserved:true,
 candidateSourceGuidNotCertified:true}));
