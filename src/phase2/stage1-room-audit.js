/**
 * AutoMinds Spaces / Stage 1: architectural evidence register.
 *
 * IMPORTANT:
 * - Home S1/S2 room areas below were transcribed into an earlier technical
 *   handoff. The Home drawing itself is NOT bundled in this public repository.
 * - The IFC manifest reports zero IfcSpace entities, so there are NO verified
 *   room polygons or room-specific IFC GUID assignments yet.
 * - Studio Anne's 46-page finishes brief does not alter house room footprints.
 * - All mappings here are READ-ONLY audit evidence, never design geometry.
 */
export const ROOM_AREA_PROVENANCE=
 'Home S1 plan labels as transcribed in architectural technical handoff; recheck original drawing before room sign-off';
const R=(id,level,label,area,briefPages,kind='habitable',anchor=null)=>Object.freeze({
 id,level,label,reportedAreaM2:area,kind,
 evidence:'plan-label-transcription',sourceDocument:'Home architectural S1',
 areaStatus:'requires-original-drawing-recheck',roomPolygon:null,
 verifiedRoomIfcGuids:[],sourceGeometryStatus:'unassigned-no-ifcspace',
 provisionalFurnitureHint:anchor,studioAnnePages:briefPages,
 finalPalette:null,finalFlooring:null,finalCeiling:null,clientApproved:false
});
// Source plan areas are NOT calculated from IFC meshes. Never count these
// reference labels as enclosed, surveyed or measured 3D room polygons.
export const STAGE1_ROOMS=Object.freeze([
 R('G-SITTING','ground','Sitting Room',35,[14,15,16,17,18,19,33]),
 R('G-DINING','ground','Dining Room',19,[20,21],
   'habitable',{x:115.05,z:-1.52,from:'provisional 3D dining table',radius:2.0}),
 R('G-KITCHEN','ground','Kitchen',25,[26,27,28,29,30,31,32],
   'service',{x:109.36,z:-2.18,from:'provisional kitchen work-light anchor',radius:2.4}),
 R('G-BEDROOM','ground','Ground-floor Bedroom',20,[22,23,24,25]),
 R('G-MAID','ground',"Maid's Room",11,[22,23,37,38,39,40],'service'),
 R('F-MASTER','first','Master Bedroom',35,[22,23,24,25]),
 R('F-BEDROOM-2','first','First-floor Bedroom',17,[22,23,24,25]),
 R('F-BEDROOM-3','first','First-floor Bedroom',13,[22,23,24,25]),
 R('F-FAMILY','first','Family Room',19,[14,15,16,17,18,19,33],
   'habitable',{x:114.72,z:-3.19,from:'viewer relocated IFC sofa, not room centre',radius:2.5}),
 R('F-READING','first','Reading Room',8,[25,36])
]);
export const STAGE1_UNSCHEDULED_SPACES=Object.freeze([
 {label:'Main entrance / foyer',level:'ground',areasM2:null,pages:[13],status:'floor-plan-boundary-needed'},
 {label:'Ground stairs / intermediate landing',level:'ground',areasM2:null,pages:[34,35],status:'floor-plan-boundary-needed'},
 {label:'First-floor landing and circulation',level:'first',areasM2:null,pages:[34,35],status:'floor-plan-boundary-needed'},
 {label:'Walk-in closets / dressing areas',level:'first',areasM2:null,pages:[23,24,25],status:'per-room-count-and-boundaries-needed'},
 {label:'Pantry and bulk storage',level:'unknown',areasM2:null,pages:[41],status:'verify-actual-floor-plan-room'},
 {label:'Bathrooms / toilets / powder room',level:'unknown',areasM2:null,pages:[13,37,38,39,40],status:'verify-count-location-and-maid-separator'},
 {label:'Balconies / terraces',level:'first',areasM2:null,pages:[34,35],status:'platform-door-guard-crosswalk-needed'}
]);
export const STAGE1_DESIGN_DECISIONS=Object.freeze([
 {id:'design_style',pages:[2],choices:['modern','classic/traditional'],status:'client-selection-pending'},
 {id:'palette',pages:[3,4,5],choices:['mint','taupe','powder blue'],status:'client-selection-pending'},
 {id:'ceiling',pages:[6],choices:['suspended/dropped','beamed','flat'],status:'room-by-room-selection-pending'},
 {id:'floor',pages:[7],choices:['porcelain/ceramic','ash wood-look tile','caramel wood-look tile'],status:'room-by-room-selection-pending'},
 {id:'wall_finish',pages:[8],choices:['paint','texture','stone-clad'],status:'room-by-room-selection-pending'},
 {id:'light_fixture',pages:[9,10,11,12],choices:['pendant','recessed','sconce','lamp'],status:'room-by-room-selection-pending'},
 {id:'bathroom_separators',pages:[37,39],choices:['glass other baths','concrete maid bath'],status:'locations-and-count-pending'},
 {id:'exterior',pages:[42,43,44,45],choices:['pavers','grass','planting','drainage'],status:'approved-layout-preserved-site-spec-pending'}
]);
export const STAGE1_APPROVED_CONSTRAINTS=Object.freeze([
 'Open ground-floor connections: Kitchen–Dining, Sitting–Dining, Stair–Sitting, Stair–Kitchen',
 "Maid's room interior doorway sealed, balcony-facing entrance preserved",
 'Two stair flights plus landing remain guarded and traversable',
 'Preserve source-confirmed first-floor balcony access and edge guards',
 'Palm-tree-side boundary gate, straight driveway/parking join and majority lawn',
 'Retain four plan-listed main bedrooms plus separate maid room; do not fabricate 13 suites',
 'Never mutate source IFC geometry, source names, GUIDs or original architectural files'
]);
const round=v=>Math.round(v*1000)/1000;
function candidatesForRoom(room,records,origin){
 const hint=room.provisionalFurnitureHint;
 if(!hint)return [];
 return records.filter(r=>r?.layer?.level===room.level&&r.category==='furniture'&&r.box?.min&&r.box?.max)
 .map(r=>{
  const x=(r.box.min.x+r.box.max.x)/2+(origin.x||0);
  const z=(r.box.min.z+r.box.max.z)/2+(origin.z||0);
  return {guid:r.mesh?.userData?.ifc?.guid||null,
   name:r.mesh?.userData?.ifc?.name||null,
   x:round(x),z:round(z),distanceM:round(Math.hypot(hint.x-x,hint.z-z))};
 }).filter(r=>r.guid&&r.distanceM<=hint.radius)
 .sort((a,b)=>a.distanceM-b.distanceM)
 .slice(0,12);
}
export function buildStage1RoomAudit(manifest,elements,records=[],origin={x:0,z:0}){
 if(manifest?.units!=='metres'||!Array.isArray(manifest?.layers))
  throw Error('Stage 1 requires the real metre-unit IFC manifest');
 const levels=manifest.modelStoreys||{};
 if(Math.abs(levels.ground||0)>.02||Math.abs(levels.first-3.3)>.02||
    Math.abs(levels.second-6.6)>.02)
  throw Error('Stage 1 storey datums differ from architectural plan');
 const entries=Object.entries(elements||{});
 const typeCounts={},layerCounts={},byStorey={};
 for(const [,meta] of entries)typeCounts[meta?.type||'unclassified']=
   (typeCounts[meta?.type||'unclassified']||0)+1;
 for(const l of manifest.layers){
  layerCounts[l.category]=(layerCounts[l.category]||0)+1;
  byStorey[l.level]??={layers:0,sourceObjectsInConvertedBatches:0};
  byStorey[l.level].layers++;
  byStorey[l.level].sourceObjectsInConvertedBatches+=l.elements||0;
 }
 const loadedSourceGuids=new Set(records.map(r=>r.mesh?.userData?.ifc?.guid).filter(Boolean));
 const sourceIndexes=new Set(entries.map(([guid])=>guid));
 const exclusions=(manifest.missingOrFailed||[]).map(r=>r.name);
 const rooms=STAGE1_ROOMS.map(room=>({
  ...room,
  // Hints can narrow a later manual review; they do not establish a room.
  candidateFurnishingSourceMeshes:candidatesForRoom(room,records,origin)
 }));
 const areasByFloor=Object.fromEntries(['ground','first'].map(level=>
  [level,round(rooms.filter(r=>r.level===level).reduce((sum,r)=>sum+r.reportedAreaM2,0))]));
 const notes=[
  'The IFC model has no IfcSpace entities; no room polygon or room-specific source GUID can be automatically certified.',
  'Room areas come from an earlier S1 plan transcription; original HOME sheet must be checked before sign-off.',
  'The older 13-suite brief conflicts with the four main bedrooms plus maid room identified in the plan transcription.',
  'Bedroom furniture / sofa / light positions are NOT proof of room boundaries or room identities.',
  'Three original IFC proxy batches were excluded in source conversion and need separate recovery review.',
  'Studio Anne references include optional alternatives; none is selected or signed off for each room.'
 ];
 return {
  schema:'autominds.stage1-architectural-room-audit.v1',
  source:{ifc:manifest.source,units:manifest.units,modelStoreys:{...levels},
   sourceIndexedElements:entries.length,manifestSourceProductCount:manifest.progress?.source_product_count??null,
   sourceLayerCount:manifest.layers.length,sourceObjectBatchesByFloor:byStorey,
   indexedIfcTypes:typeCounts,layerCategories:layerCounts,
   ifcSpaceCount:typeCounts.IFCSPACE||0,
   unavailableSourceBatches:exclusions,unavailableSourceBatchCount:exclusions.length,
   indexedGuidsPresentInLoadedMeshes:[...loadedSourceGuids].filter(g=>sourceIndexes.has(g)).length,
   originalElementsUntouched:true},
  plan:{
   evidence:ROOM_AREA_PROVENANCE,rooms,
   namedSpaceCount:rooms.length,
   mainBedroomCount:rooms.filter(r=>r.id==='G-BEDROOM'||r.id==='F-MASTER'||
     r.id==='F-BEDROOM-2'||r.id==='F-BEDROOM-3').length,
   separateMaidRoomCount:1,
   sumOfNamedRoomAreasNotTotalFloorArea:areasByFloor,
   measuredRoomPolygons:0,verifiedRoomIfcAssignments:0,
   additionalUnmeasuredSpaces:STAGE1_UNSCHEDULED_SPACES,
   legacyR01ThroughR14LabelsAreNotVerifiedRoomCount:true
  },
  design:{choices:STAGE1_DESIGN_DECISIONS,
   approvedSelections:0,requiredSelections:STAGE1_DESIGN_DECISIONS.length,
   constraints:STAGE1_APPROVED_CONSTRAINTS},
  readiness:{
   stage1SignedOff:false,
   reason:'Original Home plan polygon mapping, IFC crosswalk and client design decisions pending',
   nextActions:[
    'Reopen original Home S1/S2 sheets and trace each room, door, window and balcony polygon',
    'Map real IFC GUIDs to those polygons by actual spatial overlap, not name guesses',
    'Resolve the client 13-room vs plan four-bedroom discrepancy',
    'Identify every bathroom, pantry, closet and balcony and verify exact count',
    'Review three excluded IFC proxy batches without changing live source geometry',
    'Request client room-by-room finishes and style approval'
   ],
   notes
  }
 };
}
