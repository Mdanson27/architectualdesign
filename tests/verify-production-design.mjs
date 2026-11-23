import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activateIntegratedHouseDesign,PRODUCTION_DESIGN_POLICY}
 from '../src/phase2/production-design.js';

const sceneJs=fs.readFileSync('src/phase2/actual-house.js','utf8');
const html=fs.readFileSync('actual-house.html','utf8');
const css=fs.readFileSync('src/phase2/actual-house.css','utf8');
assert.equal(PRODUCTION_DESIGN_POLICY.mode,'integrated-house');
assert.equal(PRODUCTION_DESIGN_POLICY.visitorMustEnableStages,false);
assert.equal(PRODUCTION_DESIGN_POLICY.preserveOpenPlan,true);
assert.equal(PRODUCTION_DESIGN_POLICY.independentPantryFootprintConfirmed,false);
assert(sceneJs.includes("state.productionDesign=activateIntegratedHouseDesign("));
assert(sceneJs.includes("state.showSurroundings:true")||
       sceneJs.includes("showSurroundings:true"));
assert(sceneJs.includes("if(publicPreview||new URLSearchParams(location.search).has('preview'))"));
assert(sceneJs.includes("if(publicPreview)frameBuilding();else focusMainBuilding();"));
assert(html.includes('id="surroundingsToggle" type="checkbox" checked'));
assert(css.includes('.production-design #designStudioBtn'));
assert(css.includes('.production-design #stage2MobileBtn'));
assert(css.includes('display:none!important'));
let finishCalls=0,kitchenCalls=0;
const surfaces={applyProposal(){finishCalls++;return {
 enhancedRooms:9,tiles:423,sourceGeometryUnmodified:true,sourceColliderCountUnchanged:true
};}};
const kitchen={enable(v){assert.equal(v,true);kitchenCalls++;return {
 enabled:true,sourceWorktopVerified:true,sourceGeometryUnmodified:true,
 sourceCollidersUnmodified:true,baseCabinetPanels:6,appliancePieces:10
};}};
const model=activateIntegratedHouseDesign({surfaces,kitchen});
assert(model.active&&model.kitchenVisible);
assert.equal(model.stage2RoomsVisible,9);
assert.equal(model.stage2Tiles,423);
assert.equal(model.kitchenCabinetPanels,6);
assert.equal(model.finalClientSignoff,false);
assert.equal(finishCalls,1);
assert.equal(kitchenCalls,1);
assert.throws(()=>activateIntegratedHouseDesign({}),/requires/);
assert.throws(()=>activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:0,sourceGeometryUnmodified:true,
 sourceColliderCountUnchanged:true})},
 kitchen:{enable:()=>({enabled:false,sourceGeometryUnmodified:true,
 sourceCollidersUnmodified:true})}
}),/No source-backed/);
assert.throws(()=>activateIntegratedHouseDesign({
 surfaces:{applyProposal:()=>({enhancedRooms:1,sourceGeometryUnmodified:false,
 sourceColliderCountUnchanged:true})},
 kitchen
}),/must not alter/);
// Missing kitchen worktop must not cause a fictional fallback room.
const noKitchen=activateIntegratedHouseDesign({
 surfaces,kitchen:{enable:()=>({
  enabled:false,sourceWorktopVerified:false,sourceGeometryUnmodified:true,
  sourceCollidersUnmodified:true,baseCabinetPanels:0,appliancePieces:0
 })}
});
assert.equal(noKitchen.kitchenVisible,false);
assert.equal(noKitchen.kitchenSourceAvailable,false);
assert.equal(noKitchen.stage2RoomsVisible,9);
console.log('PRODUCTION_INTEGRATED_DESIGN_VERIFIED',JSON.stringify({
 initialSceneActive:true,nineRoomsVisible:true,kitchenVisible:true,
 siteShown:true,noStagePreviewButtonsRequired:true,
 missingSourceNeverFabricated:true,architectApprovalsStillPending:true
}));
