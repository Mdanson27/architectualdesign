import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 STAGE1_ROOMS,STAGE1_UNSCHEDULED_SPACES,STAGE1_DESIGN_DECISIONS,
 STAGE1_APPROVED_CONSTRAINTS,buildStage1RoomAudit
} from '../src/phase2/stage1-room-audit.js';

const manifest=JSON.parse(fs.readFileSync('public/ifc/house/manifest.json','utf8'));
const indexed=JSON.parse(fs.readFileSync('public/ifc/house/source-elements.json','utf8'));
const mBefore=JSON.stringify(manifest),eBefore=JSON.stringify(indexed);
const audit=buildStage1RoomAudit(manifest,indexed);
assert.equal(audit.schema,'autominds.stage1-architectural-room-audit.v1');
assert.equal(audit.source.sourceIndexedElements,2575);
assert.equal(audit.source.manifestSourceProductCount,2575);
assert.equal(audit.source.sourceLayerCount,76);
assert.equal(audit.source.ifcSpaceCount,0);
assert.deepEqual(manifest.modelStoreys,{ground:0,first:3.3,second:6.6});
assert.equal(audit.source.unavailableSourceBatchCount,3);
assert.deepEqual(audit.source.unavailableSourceBatches.sort(),[
 'ground-proxies-r076','ground-proxies-r290','ground-proxies-r294'
]);
assert.equal(audit.plan.namedSpaceCount,10);
assert.equal(audit.plan.mainBedroomCount,4);
assert.equal(audit.plan.separateMaidRoomCount,1);
assert.equal(STAGE1_UNSCHEDULED_SPACES.length,7);
assert.deepEqual(audit.plan.sumOfNamedRoomAreasNotTotalFloorArea,
 {ground:110,first:92});
assert.equal(audit.plan.measuredRoomPolygons,0);
assert.equal(audit.plan.verifiedRoomIfcAssignments,0);
assert.equal(audit.plan.legacyR01ThroughR14LabelsAreNotVerifiedRoomCount,true);
assert.equal(audit.readiness.stage1SignedOff,false);
assert.equal(audit.design.approvedSelections,0);
assert.equal(audit.design.choices.length,8);
assert.equal(STAGE1_DESIGN_DECISIONS.length,8);
assert(STAGE1_APPROVED_CONSTRAINTS.some(x=>x.includes('Kitchen–Dining')));
assert(STAGE1_APPROVED_CONSTRAINTS.some(x=>x.includes('majority lawn')));
assert(STAGE1_ROOMS.every(r=>r.roomPolygon===null&&
 r.verifiedRoomIfcGuids.length===0&&!r.clientApproved&&r.finalPalette===null));
assert.equal(new Set(STAGE1_ROOMS.map(r=>r.id)).size,STAGE1_ROOMS.length);
assert(STAGE1_ROOMS.every(r=>r.reportedAreaM2>0&&
 r.studioAnnePages.every(p=>Number.isInteger(p)&&p>=2&&p<=45)));
const plan={ 'G-SITTING':35,'G-DINING':19,'G-KITCHEN':25,
 'G-BEDROOM':20,'G-MAID':11,'F-MASTER':35,'F-BEDROOM-2':17,
 'F-BEDROOM-3':13,'F-FAMILY':19,'F-READING':8 };
for(const r of STAGE1_ROOMS)assert.equal(r.reportedAreaM2,plan[r.id]);
assert.equal(Object.values(audit.source.indexedIfcTypes)
 .reduce((s,v)=>s+v,0),2575);
assert.equal(Object.values(audit.source.sourceObjectBatchesByFloor)
 .reduce((s,v)=>s+v.layers,0),76);
assert.equal(Object.values(audit.source.sourceObjectBatchesByFloor)
 .reduce((s,v)=>s+v.sourceObjectsInConvertedBatches,0),2572,
 'conversion batches exclude three source IFC batches');
const firstGuid=Object.keys(indexed)[0];
// Hint matching is NOT verified room membership. It must remain a candidate.
const localRecord={category:'furniture',layer:{level:'ground'},
 mesh:{userData:{ifc:{name:'TEST IFC FURNITURE',guid:firstGuid}}},
 box:{min:{x:114.8,z:-1.7},max:{x:115.2,z:-1.3}}};
const withCandidates=buildStage1RoomAudit(manifest,indexed,[localRecord]);
const dining=withCandidates.plan.rooms.find(r=>r.id==='G-DINING');
assert.equal(dining.candidateFurnishingSourceMeshes.length,1);
assert.equal(dining.candidateFurnishingSourceMeshes[0].guid,firstGuid);
assert.equal(dining.sourceGeometryStatus,'unassigned-no-ifcspace');
assert.equal(dining.verifiedRoomIfcGuids.length,0);
assert.equal(withCandidates.source.indexedGuidsPresentInLoadedMeshes,1);
assert.equal(JSON.stringify(manifest),mBefore,'IFC manifest must remain unmodified');
assert.equal(JSON.stringify(indexed),eBefore,'IFC source metadata must remain unmodified');
assert.throws(()=>buildStage1RoomAudit({...manifest,units:'feet'},indexed),/metre-unit/);
assert.throws(()=>buildStage1RoomAudit({...manifest,modelStoreys:{
 ground:0,first:2.8,second:6.6}},indexed),/storey datums/);
console.log('STAGE1_SOURCE_INVENTORY_VERIFIED',JSON.stringify({
  indexedElements:audit.source.sourceIndexedElements,layers:audit.source.sourceLayerCount,
  exclusions:audit.source.unavailableSourceBatches,ifcSpaces:audit.source.ifcSpaceCount,
  namedRooms:audit.plan.namedSpaceCount,mainBedrooms:audit.plan.mainBedroomCount,
  maidRooms:audit.plan.separateMaidRoomCount,polygonAssignments:0,
  sourcePreserved:true,designApprovals:0,stage1SignedOff:false
}));
