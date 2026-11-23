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
 firstRender:'finished-surface-and-kitchen-visible',
 visitorMustEnableStages:false,
 preserveOpenPlan:true,
 preserveIFCGeometry:true,
 restoreTools:'developer-qa-only',
 sourcePlansStillNeedArchitectApproval:true,
 independentPantryFootprintConfirmed:false
});
export function activateIntegratedHouseDesign({surfaces,kitchen}={}){
 if(typeof surfaces?.applyProposal!=='function'||typeof kitchen?.enable!=='function')
  throw Error('Production house requires the room finishes and kitchen systems');
 const finishes=surfaces.applyProposal();
 const kitchenStatus=kitchen.enable(true);
 if(!finishes.sourceGeometryUnmodified||!finishes.sourceColliderCountUnchanged||
    !kitchenStatus.sourceGeometryUnmodified||!kitchenStatus.sourceCollidersUnmodified)
  throw Error('Integrated interior must not alter original IFC architecture');
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
  finalClientSignoff:false
 });
}
