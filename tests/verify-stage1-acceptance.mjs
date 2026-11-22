import fs from 'node:fs';
import assert from 'node:assert/strict';
import {STAGE1_ROOMS} from '../src/phase2/stage1-room-audit.js';
import {STAGE1_PLAN_SKETCHES} from '../src/phase2/stage1-plan-crosswalk.js';

const p=JSON.parse(fs.readFileSync('architecture/stage1-acceptance.json','utf8'));
assert.equal(p.schema,'autominds.stage1-acceptance.v1');
assert.equal(p.roomAcceptance.length,STAGE1_ROOMS.length);
assert.deepEqual(p.roomAcceptance.map(x=>x.id).sort(),
 STAGE1_ROOMS.map(x=>x.id).sort());
assert.deepEqual(Object.keys(STAGE1_PLAN_SKETCHES).sort(),
 STAGE1_ROOMS.map(x=>x.id).sort());
const keys=['sourceInventory','drawingLabelsAndDatums','provisionalRoomSketches',
 'roomBoundaryCertification','roomIfcGuidOwnership','doorWindowBalconySchedules',
 'maidRoomBoundaryMismatch','ifcProxyExclusionsIdentified','legacy13SuiteConflictResolved',
 'clientStyleChoice','clientRoomFinishSelections','clientArchitectApproval'];
assert.deepEqual(Object.keys(p.verification).sort(),keys.sort());
for(const [key,gate] of Object.entries(p.verification)){
 assert(['pending','verified'].includes(gate.status),'Unknown status '+key);
 if(gate.status==='verified'){
  assert(typeof gate.evidence==='string'&&gate.evidence.length>0,
   'Verified gate lacks evidence: '+key);
 }else{
  assert.equal(gate.reviewer,null,'Unreviewed gate must not claim approval: '+key);
 }
}
for(const room of p.roomAcceptance){
 for(const key of ['polygonVerified','guidCrosswalkVerified','openingScheduleVerified','finishApproved'])
  assert.equal(typeof room[key],'boolean',room.id+' '+key+' must be explicit');
}
const allGates=Object.values(p.verification).every(g=>g.status==='verified');
const allRooms=p.roomAcceptance.every(r=>r.polygonVerified&&
 r.guidCrosswalkVerified&&r.openingScheduleVerified&&r.finishApproved);
const signoff=p.approval.status==='approved'&&
 typeof p.approval.approver==='string'&&p.approval.approver.trim().length>0&&
 typeof p.approval.evidence==='string'&&p.approval.evidence.trim().length>0&&
 typeof p.approval.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.approval.date);
if(p.approval.status==='approved')assert(allGates&&allRooms&&signoff,
 'Stage 1 cannot be approved while evidence or room checks remain incomplete');
const complete=allGates&&allRooms&&signoff;
console.log('STAGE1_ACCEPTANCE_STATUS',JSON.stringify({
 complete,verifiedGates:Object.values(p.verification).filter(x=>x.status==='verified').length,
 totalGates:keys.length,verifiedRoomPolygons:p.roomAcceptance.filter(x=>x.polygonVerified).length,
 totalRooms:p.roomAcceptance.length,clientSignoff:p.approval.status
}));
