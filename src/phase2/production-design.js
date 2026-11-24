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
 firstRender:'finished-house-stairs-balconies-landscaped-compound-and-lighting-visible',
 visitorMustEnableStages:false,
 preserveOpenPlan:true,
 preserveIFCGeometry:true,
 restoreTools:'developer-qa-only',
 sourcePlansStillNeedArchitectApproval:true,
 independentPantryFootprintConfirmed:false
});
export function activateIntegratedHouseDesign({surfaces,kitchen,livingDining,bedroomsStudy,wetAreas,stairsBalconiesLighting,exteriorLandscape}={}){
 if(typeof surfaces?.applyProposal!=='function'||typeof kitchen?.enable!=='function')
  throw Error('Production house requires the room finishes and kitchen systems');
 const finishes=surfaces.applyProposal();
 const kitchenStatus=kitchen.enable(true);
 const stage4=livingDining?.status?.()??null;
 const stage5=bedroomsStudy?.status?.()??null;
 const stage6=wetAreas?.status?.()??null;
 const stage7=stairsBalconiesLighting?.status?.()??null;
 const stage8=exteriorLandscape?.status?.()??null;
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
 if(stage6&&(!stage6.productionIntegrated||stage6.previewActivationRequired||
    !stage6.sourceGeometryPreserved||!stage6.sourceDoorCollidersPreserved||
    !stage6.sourceWallCollidersPreserved||
    stage6.addedInternalWalls!==0||stage6.addedDoors!==0||
    stage6.newUnverifiedToiletsCreated!==0||
    stage6.exactBathroomPolygonsCertified))
  throw Error('Stage 6 wet areas must preserve source walls, doors and sanitary uncertainty');
 if(stage7&&(!stage7.productionIntegrated||stage7.previewActivationRequired||
    !stage7.sourceGeometryPreserved||!stage7.sourceCollidersPreserved||
    stage7.addedStairFlights!==0||stage7.addedSafetyGuards!==0||
    stage7.addedPartitionWalls!==0||
    !stage7.originalBalconyGuardsPreserved||
    !stage7.originalBalconyDoorsPreserved||!stage7.originalOpenPlanPreserved))
  throw Error('Stage 7 must retain IFC stair, balcony rail, door and open-plan geometry');
 if(stage8&&(!stage8.productionIntegrated||stage8.previewActivationRequired||
    !stage8.sourceIFCGeometryPreserved||!stage8.sourceExteriorSitePreserved||
    !stage8.originalGateOnPalmSideFence||
    !stage8.straightDrivewayToCourtPreserved||
    !stage8.seamlessDrivewayEdgePreserved||
    stage8.originalGateWidthMetres!==4||
    stage8.originalMarkedParkingBays!==3||
    stage8.preservedPalms!==3||
    stage8.lawnPercentage<=50||
    stage8.builtNewBoundaryWalls!==0||stage8.movedOriginalGate||
    stage8.addedParkingShadeCanopy||stage8.addedSurfaceDrainagePipework))
  throw Error('Stage 8 must preserve approved S1 gate, parking, driveway and majority lawn');
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
  stage6WetAreasIntegrated:Boolean(stage6?.productionIntegrated),
  stage6SourceSupportedWetZones:stage6?.activeSourceWetZones??0,
  stage6PorcelainTiles:stage6?.porcelainFloorTiles??0,
  stage6SourceFixturesAccented:stage6?.identifiedSourceProxyFittings??0,
  stage7Integrated:Boolean(stage7?.productionIntegrated),
  stage7StairTreadsEnhanced:stage7?.sourceTreadsEnhanced??0,
  stage7SourceBalconiesFinished:stage7?.sourceBalconiesFinished??0,
  stage7BalconyDeckPieces:stage7?.balconyDeckPieces??0,
  stage7SwitchableLEDs:(stage7?.sourceStepLEDs??0)+(stage7?.balconyRailLEDs??0),
  stage8ExteriorIntegrated:Boolean(stage8?.productionIntegrated),
  stage8GardenClusters:stage8?.shrubClusters??0,
  stage8ExteriorLights:stage8?.lightSources??0,
  stage8ParkingMarkers:stage8?.parkingMarkers??0,
  stage8MajorityLawnPreserved:Boolean(stage8?.lawnPercentage>50),
  finalClientSignoff:false
 });
}
