/**
 * AutoMinds Spaces production presentation contract.
 *
 * Each implemented, source-supported phase is part of the house on first
 * render. Visitors are never expected to turn on numbered stages or compare
 * developer-only prototypes to see completed work.
 *
 * Future stages register their live integrations here. Architectural
 * clearances and unresolved approvals are not silently guessed.
 */
export const PRODUCTION_DESIGN_POLICY=Object.freeze({
 mode:'integrated-house',
 firstRender:'finished-surfaces-kitchen-living-dining-bedrooms-study-visible',
 visitorMustEnableStages:false,
 preserveOpenPlan:true,
 preserveIFCGeometry:true,
 restoreTools:'developer-qa-only',
 sourcePlansStillNeedArchitectApproval:true,
 independentPantryFootprintConfirmed:false
});
export function activateIntegratedHouseDesign({surfaces,kitchen,livingDining,bedroomsStudy}={}){
 if(typeof surfaces?.applyProposal!=='function'||typeof kitchen?.enable!=='function')
  throw Error('Production house requires the room finishes and kitchen systems');
 const finishes=surfaces.applyProposal();
 const kitchenStatus=kitchen.enable(true);
 const stage4=livingDining?.status?.()??null;
 const stage5=bedroomsStudy?.status?.()??null;
 if(!finishes.sourceGeometryUnmodified||!finishes.sourceColliderCountUnchanged||
    !kitchenStatus.sourceGeometryUnmodified||!kitchenStatus.sourceCollidersUnmodified)
  throw Error('Integrated interior must not alter original IFC architecture');
 if(stage4&&(!stage4.originalIFCGeometryPreserved||
    !stage4.sourceIFCCollidersPreserved||
    stage4.openPlanWallsCreated!==0||stage4.interiorDoorsCreated!==0||
    stage4.diningChairsTotal!==6||stage4.previewActivationRequired))
  throw Error('Stage 4 must furnish the source house without obstructing architectural openings');
 if(stage5&&(!stage5.productionIntegrated||stage5.previewActivationRequired||
    !stage5.originalIFCGeometryPreserved||!stage5.sourceCollidersPreserved||
    !stage5.sourceDoorAndWindowMeshesUnchanged||
    stage5.addedPartitionWalls!==0||stage5.addedDoors!==0||
    stage5.walkInClosetGeometryInvented))
  throw Error('Stage 5 must preserve source bedrooms, doors and verified architecture');
 if(!finishes.enhancedRooms)throw Error('No source-backed room finishes available');
 // If the source kitchen slab is absent, do NOT invent one just to satisfy a
 // readiness badge. Surface design may proceed but the kitchen must report
 // its missing IFC evidence.
 return Object.freeze({
  ...PRODUCTION_DESIGN_POLICY,
  active:true,stage2RoomsVisible:finishes.enhancedRooms,
  stage2Tiles:finishes.tiles,
  kitchenVisible:kitchenStatus.enabled,
  kitchenSourceAvailable:kitchenStatus.sourceWorktopVerified,
  kitchenCabinetPanels:kitchenStatus.baseCabinetPanels,
  kitchenApplianceParts:kitchenStatus.appliancePieces,
  stage4LivingDiningIntegrated:Boolean(stage4?.productionIntegrated),
  stage4RoomZones:stage4?.rooms??[],
  stage4FurniturePieces:stage4?.pieces??null,
  stage5BedroomsStudyIntegrated:Boolean(stage5?.productionIntegrated),
  stage5FinishedBeds:stage5?.sourceSupportedBedsFinished??0,
  stage5WardrobeRooms:stage5?.wardrobeRooms??0,
  stage5StudyDesks:stage5?.readingDesks??0,
  finalClientSignoff:false
 });
}
