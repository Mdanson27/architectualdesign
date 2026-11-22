/**
 * Stage 1: Home(4).pdf S1/S2 visual reinspection, 2026-11-22.
 *
 * THIS FILE IS A NON-DESTRUCTIVE, PRELIMINARY DRAWING-TO-IFC CROSSWALK.
 * Home S1 printed room labels and level heights have been inspected directly.
 * Digitized footprints are approximations for room finding / evidence review,
 * not measured BIM spaces or architect-approved construction boundaries.
 *
 * The 16.4m horizontal house dimension and ~15.84m grid depth were checked
 * against S1, then registered provisionally to the main IFC residence cluster
 * using exterior structural wall extrema (around X=106.13..122.63,
 * Z=-14.57..1.4). Individual boundary vertices must still be checked.
 */
export const HOME_S1_SOURCE_REVIEW=Object.freeze({
 source:'Home(4).pdf',sheet:'S1',visuallyReviewed:true,
 groundPlan:'02-Ground Floor Plan, 1:100',
 firstPlan:'03-First Floor Plan, 1:100',
 roofPlan:'04-Roof Plan, 1:100',
 sitePlan:'01-Site Plan, 1:200',
 s2:'Front, rear, both side elevations, cross-section and boundary-gate details',
 gridWidthM:16.4,nominalPlanDepthM:15.84,
 modelDatumsM:{ground:0,first:3.3,roof:6.6},
 planRoomsConfirmed:10,
 planBedroomsConfirmed:4,maidBedroomsConfirmed:1,
 spatialRegistrationStatus:'preliminary-not-surveyed',
 architecturalPlanNotPublished:true,
 clientCompoundRevisionSupersedesOriginalGate:true
});
/**
 * Rectangles/polyline candidate footprints in ORIGINAL source IFC world X/Z
 * metres. Conservative simple polygons, excluding implied corridors/wet rooms.
 * Ground G-MAID candidate envelope visibly underrepresents transcribed 11m²;
 * this is intentionally highlighted rather than stretching the shape.
 */
export const STAGE1_PLAN_SKETCHES=Object.freeze({
 'G-SITTING':{floor:'ground',vertices:[[112.4,-9.62],[119.73,-9.62],[119.73,-4.89],[112.4,-4.89]],confidence:'moderate'},
 'G-DINING':{floor:'ground',vertices:[[112.45,-4.42],[117.15,-4.42],[117.15,-.38],[112.45,-.38]],confidence:'moderate'},
 'G-KITCHEN':{floor:'ground',vertices:[[106.2,-5.22],[112.25,-5.22],[112.25,-.40],[108.1,-.40],[108.1,-1.9],[106.2,-1.9]],confidence:'moderate'},
 'G-BEDROOM':{floor:'ground',vertices:[[112.56,-13.65],[118.4,-13.65],[118.4,-10.2],[112.56,-10.2]],confidence:'moderate'},
 'G-MAID':{floor:'ground',vertices:[[109.4,-14.5],[112.23,-14.5],[112.23,-11.58],[109.4,-11.58]],confidence:'low'},
 'F-MASTER':{floor:'first',vertices:[[112.4,-9.62],[119.73,-9.62],[119.73,-4.85],[112.4,-4.85]],confidence:'moderate'},
 'F-BEDROOM-2':{floor:'first',vertices:[[106.76,-14.48],[111.53,-14.48],[111.53,-10.86],[106.76,-10.86]],confidence:'moderate'},
 'F-BEDROOM-3':{floor:'first',vertices:[[107.8,-3.31],[112.28,-3.31],[112.28,-.33],[107.8,-.33]],confidence:'moderate'},
 'F-FAMILY':{floor:'first',vertices:[[112.4,-4.31],[116.92,-4.31],[116.92,-.15],[112.4,-.15]],confidence:'high-from-existing-furniture-guard'},
 'F-READING':{floor:'first',vertices:[[106.74,-5.16],[111.7,-5.16],[111.7,-3.52],[106.74,-3.52]],confidence:'moderate'}
});
export const STAGE1_S1_ADDITIONAL_CONDITIONS=Object.freeze([
 {id:'GROUND-WC-SH',floor:'ground',label:'Ground-floor WC/shower and toilet areas',status:'visually-present-count-to-verify'},
 {id:'GROUND-STORE',floor:'ground',label:'Store near kitchen and stairs',status:'visually-present-boundary-to-verify'},
 {id:'FIRST-WICS',floor:'first',label:'First-floor walk-in closets (including master closets)',status:'visually-present-room-mapping-to-verify'},
 {id:'FIRST-SANITARY',floor:'first',label:'First-floor bathroom/toilet areas',status:'visually-present-fixtures-to-verify'},
 {id:'FIRST-BALCONIES',floor:'first',label:'Multiple first-floor balconies and guardrails',status:'visually-supported-by-S1-and-S2'},
 {id:'GROUND-STAIRS',floor:'ground',label:'Two-flight staircase with intermediate landing',status:'S1-S2-visible-existing-guards-retained'},
 {id:'SITE-GATE-CLIENT-REVISION',floor:'site',label:'Approved client gate/parking override',status:'later-approved-layout-overrides-earlier-S1-gate'}
]);
function near(n){return Math.round(n*1000)/1000}
export function polygonArea(points){
 let twice=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  twice+=a[0]*b[1]-b[0]*a[1];
 }
 return Math.abs(twice)/2;
}
export function polygonBounds(points){
 return {minX:Math.min(...points.map(v=>v[0])),
 maxX:Math.max(...points.map(v=>v[0])),
 minZ:Math.min(...points.map(v=>v[1])),
 maxZ:Math.max(...points.map(v=>v[1]))};
}
export function insidePolygon(point,poly){
 const [x,z]=point;let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,zi]=poly[i],[xj,zj]=poly[j];
  if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)
   inside=!inside;
 }
 return inside;
}
function clipRectToPolygonBounds(poly,box){
 const b=polygonBounds(poly);
 return box.maxX>=b.minX&&box.minX<=b.maxX&&
  box.maxZ>=b.minZ&&box.minZ<=b.maxZ;
}
function roomCandidates(room,records,origin){
 const p=STAGE1_PLAN_SKETCHES[room.id];if(!p)return [];
 const b=polygonBounds(p.vertices),items=[];
 for(const r of records||[]){
  if(r.layer?.level!==room.level)continue;
  const geo=r.box;
  if(!geo||!Number.isFinite(geo.min?.x)||!Number.isFinite(geo.min?.z))continue;
  const global={minX:geo.min.x+(origin?.x||0),maxX:geo.max.x+(origin?.x||0),
    minZ:geo.min.z+(origin?.z||0),maxZ:geo.max.z+(origin?.z||0)};
  if(!clipRectToPolygonBounds(p.vertices,global))continue;
  // Very large slabs/envelope objects can touch several proposed rooms.
  // Label them as candidates only; never assign source GUID as owned.
  const guid=r.mesh?.userData?.ifc?.guid||null;
  if(!guid)continue;
  const x=(global.minX+global.maxX)/2,z=(global.minZ+global.maxZ)/2;
  const category=r.category||'unknown';
  const centerInside=insidePolygon([x,z],p.vertices);
  const overlapX=Math.max(0,Math.min(b.maxX,global.maxX)-Math.max(b.minX,global.minX));
  const overlapZ=Math.max(0,Math.min(b.maxZ,global.maxZ)-Math.max(b.minZ,global.minZ));
  const score=centerInside?2:1;
  items.push({guid,name:r.mesh?.userData?.ifc?.name??null,category,
   centerInsideCandidate:!!centerInside,footprintOverlapM2:near(overlapX*overlapZ),
   sourceBoundsXZ:[near(global.minX),near(global.minZ),near(global.maxX),near(global.maxZ)],
   provisionalEvidenceScore:score});
 }
 items.sort((a,b)=>b.provisionalEvidenceScore-a.provisionalEvidenceScore||
  b.footprintOverlapM2-a.footprintOverlapM2);
 return items.slice(0,150);
}
/**
 * Only exports PROVISIONAL overlays. Architect-verifiable room polygons,
 * certified IFC GUID assignments and signed-off clearances remain null.
 */
export function buildStage1PlanCrosswalk(rooms,records=[],origin={x:0,z:0}){
 const entries=rooms.map(room=>{
  const s=STAGE1_PLAN_SKETCHES[room.id];
  if(!s)throw Error('Missing S1 room sketch: '+room.id);
  if(s.floor!==room.level)throw Error('S1 world outline on wrong floor: '+room.id);
  const candidates=roomCandidates(room,records,origin);
  const counts={};
  for(const c of candidates)counts[c.category]=(counts[c.category]||0)+1;
  const area=near(polygonArea(s.vertices));
  return {
   id:room.id,level:room.level,reportedAreaM2:room.reportedAreaM2,
   provisionalSketchedAreaM2:area,
   provisionalAreaDeltaPct:near(100*(area-room.reportedAreaM2)/room.reportedAreaM2),
   // Never publish this as an authenticated or measured IFC room polygon.
   provisionalIfcXZVertices:s.vertices.map(v=>v.slice()),
   provisionalIfcBounds:polygonBounds(s.vertices),
   polygonVerified:false,clientApproved:false,
   ifcRoomGuidsVerified:[],
   sourceLocation:'Home(4).pdf / S1 traced visually to source cluster',
   registrationConfidence:s.confidence,
   spatialRegistration:'manual-preliminary',status:'review-required',
   candidateIfcGuids:candidates,
   categoryCounts:counts,hasGeometryCandidates:candidates.length>0
  };
 });
 return {
  schema:'autominds.stage1.plan-ifc-crosswalk.v1',
  source:HOME_S1_SOURCE_REVIEW,
  entries,
  additionalConditions:STAGE1_S1_ADDITIONAL_CONDITIONS,
  verifiedRoomPolygonCount:0,
  verifiedRoomGuidAssignments:0,
  provisionalSketchedRoomCount:entries.length,
  sourceFilesUnmodified:true,
  clientApproval:false,
  note:'A traced S1 room sketch is not an architect-certified world polygon or IFC room assignment.'
 };
}
