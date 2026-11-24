import * as THREE from 'three';

/**
 * Stage 8 — one production compound, never a separate landscaping preview.
 * Source: Home(4).pdf S1 site plan, S2 elevations; Studio Anne pp. 42–45.
 * Keep the CLIENT-APPROVED palm-side 4m gate, straight 4.6m driveway,
 * flush outer court edge, three bays, majority lawn, three original palms.
 * Visual finishes and lighting are not civil/drainage/electrical certification.
 */
export const STAGE8_BRIEF=Object.freeze({
 pages:[42,43,44,45],landscapeLightKelvin:2900,
 gateMustRemainOnPalmSide:true,gateWidthMetres:4,driveWidthMetres:4.6,
 parkingBays:3,minBayWidthMetres:2.5,minBayLengthMetres:5,
 preserveMajorityLawn:true,preserveThreePalms:true,
 siteBoundarySurveyed:false,stormDrainageEngineered:false,
 landscapeSelectionClientApproved:false,electricalRoutesCertified:false
});
const C=(hex,rough=.8,metal=0,emissive=0x000000)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:rough,metalness:metal,emissive,emissiveIntensity:0
});
const close=(x,y)=>Math.abs(x-y)<.0005;
const near=(x,z,a,b,r)=>Math.hypot(x-a,z-b)<r;

export function createStage8ExteriorLandscape({
 scene,site,origin={x:0,z:0},records=[]
}={}){
 if(!scene||!site?.root||!site?.gate||!site?.access||
   !site?.house||!site?.summary)throw Error('Stage 8 requires the existing verified S1 site context');
 const baseline={
  gatePosition:site.gate.position.clone(),
  gateWidth:site.gate.userData?.widthMetres,
  rootPosition:site.root.position.clone(),
  driveway:{...site.access.driveway},
  parking:{...site.access.parking},
  parkingBays:site.summary.parkingBays,
  paving:site.summary.totalPavingOutdoorCoverage,
  lawn:site.summary.lawnOutdoorCoverageApprox,
  palms:site.access.palms.map(([x,z])=>[x,z])
 };
 const orig=records.map(r=>({
  rec:r,geometry:r.mesh?.geometry,position:r.mesh?.position.clone(),
  scale:r.mesh?.scale.clone(),box:r.box?.clone()
 }));
 const sourceUnchanged=()=>orig.every(r=>
  r.rec.mesh?.geometry===r.geometry&&
  r.rec.mesh?.position.equals(r.position)&&
  r.rec.mesh?.scale.equals(r.scale)&&
  (!r.box||r.rec.box.equals(r.box)));
 const accessUnchanged=()=>site.gate.position.equals(baseline.gatePosition)&&
  site.root.position.equals(baseline.rootPosition)&&
  site.gate.userData?.widthMetres===baseline.gateWidth&&
  site.summary.parkingBays===baseline.parkingBays&&
  close(site.summary.totalPavingOutdoorCoverage,baseline.paving)&&
  close(site.summary.lawnOutdoorCoverageApprox,baseline.lawn)&&
  ['driveway','parking'].every(key=>Object.entries(baseline[key]).every(
   ([dimension,value])=>close(site.access[key][dimension],value)))&&
  JSON.stringify(site.access.palms)===JSON.stringify(baseline.palms);
 if(!close(baseline.gateWidth,4)||
    !close(site.summary.drivewayWidthMetres,4.6)||
    site.summary.palmTreesPreserved!==3||
    !site.summary.straightDrivewayToParking||
    !site.summary.straightPavingOuterEdge||
    !site.summary.continuousPavingGateToParking||
    baseline.lawn<=50||baseline.paving>=50)
  throw Error('Stage 8 refuses to change the agreed gate, driveway, parking or lawn layout');

 // Site root already translates world-plan coordinates by (-origin.x,-origin.z).
 // New detail group MUST be a child of that root, not a second overlapping site.
 const root=new THREE.Group();root.name='STAGE8_PRODUCTION_LANDSCAPE_AND_EXTERIOR';
 root.userData={stage8:true,productionIntegrated:true};
 site.root.add(root);
 const grounds=new THREE.Group();grounds.name='STAGE8_GROUND_FINISHES';root.add(grounds);
 const gardens=new THREE.Group();gardens.name='STAGE8_LANDSCAPING';root.add(gardens);
 const lighting=new THREE.Group();lighting.name='STAGE8_EXTERIOR_LIGHTS';root.add(lighting);
 const materials={
  grassA:C(0x6d9364,.98),grassB:C(0x7b9d6e,.98),
  mulch:C(0x685b4d,.96),pebbles:C(0xb6a99a,.95),
  edging:C(0xc1b7a4,.79),leaves:C(0x54785b,.93),
  brightLeaves:C(0x70956c,.93),flowers:C(0xcbb797,.92),
  bollard:C(0x4b5551,.45,.33),brass:C(0xbba57e,.36,.62),
  lens:C(0xf6ebd7,.52,0,0xffd5a1),
  marker:C(0xf4efdf,.66)
 };
 const stats={mownLawnBands:0,shrubClusters:0,shrubStems:0,
  decorativeGravelStrips:0,parkingMarkers:0,
  pathwayBollards:0,palmUplights:0,gatePillarLights:0,
  lightSources:0,obstacleClusters:0};
 const lightSources=[],litMaterials=[materials.lens],obstacles=[];
 const base=-.255;
 const make=(parent,name,geometry,material,x,y,z)=>{
  const m=new THREE.Mesh(geometry,material);
  m.name='STAGE8_'+name;m.position.set(x,y,z);
  m.userData={stage8:true,visualConceptOnly:true,
   sourceGeometryUnmodified:true,clientApproved:false};
  m.castShadow=false;m.receiveShadow=false;parent.add(m);return m;
 };
 const plane=(parent,name,w,d,x,z,material,y=base+.007)=>{
  const m=make(parent,name,new THREE.PlaneGeometry(w,d),material,x,y,z);
  m.rotation.x=-Math.PI/2;return m;
 };
 const inRect=(x,z,r,b)=>x>=b.x0-r&&x<=b.x1+r&&z>=b.z0-r&&z<=b.z1+r;
 const insideHouse=(x,z,margin=0)=>x>site.house.minX-margin&&
  x<site.house.maxX+margin&&z>site.house.minZ-margin&&
  z<site.house.maxZ+margin;
 const xLeft=site.frontage[0],xRight=site.frontage[1],
  zTop=site.access.gateCenter[1],zFront=site.siteFrontZ,
  corner=4.2,drive=site.access.driveway,parking=site.access.parking,
  bays=site.access.designatedBays;
 const plot=(x,z,margin=.2)=>{
  if(x<xLeft+margin||x>xRight-margin||
    z<zTop+margin||z>zFront-margin)return false;
  return x<=xRight-corner-margin||
    z<=zFront+xRight-corner-x-margin*1.4143;
 };
 const vehicleArea=(x,z,margin=0)=>
  inRect(x,z,margin,drive)||inRect(x,z,margin,parking);
 const certifiedClearLawn=(x,z,r=.5)=>
  plot(x,z,r+.13)&&!vehicleArea(x,z,r+.28)&&
  !insideHouse(x,z,r+1.0)&&
  !near(x,z,site.access.gateCenter[0],site.access.gateCenter[1],3.0+r)&&
  !site.access.palms.some(([px,pz])=>near(x,z,px,pz,1.55+r))&&
  !obstacles.some(p=>near(x,z,p.x,p.z,p.r+r+.22));
 const register=(node,x,z,r)=>{
  node.userData.stage8OutdoorObstacle=true;
  node.userData.collisionRadiusMetres=r;
  obstacles.push({x,z,r,name:node.name});stats.obstacleClusters++;
 };
 const pool=(x,z,r=1)=>obstacles.every(o=>!near(x,z,o.x,o.z,r+o.r));
 function lightAt(x,y,z,scale=1){
  const l=new THREE.PointLight(0xffdcac,0,3.3*scale,2);
  l.position.set(x,y,z);l.castShadow=false;lighting.add(l);
  lightSources.push(l);stats.lightSources++;return l;
 }
 // Keep the broad front/north lawn visibly textured, but don't carpet over
 // the driveway or source house with another fake land surface.
 for(let i=0;i<10;i++){
  const x=site.house.minX+.4+i*1.51,z=site.siteFrontZ-1.43;
  if(!certifiedClearLawn(x,z,.44))continue;
  const m=plane(grounds,'MOWED_LAWN_TONAL_STRIPE',1.1,.67,x,z,
   i%2?materials.grassA:materials.grassB,base-.007);
  // Existing lawn remains visible beneath the subtle grass bands.
  m.material=materials[i%2?'grassA':'grassB'];
  stats.mownLawnBands++;
 }
 // Narrow permeable-LOOK perimeter grit, outside the original vehicle
 // slab/kerbs. It is decorative, not a tested soakaway or drain.
 for(const [tag,x,z0,z1] of [
  ['COURT_EDGE',parking.x0-.47,parking.z0+.83,parking.z1-.90],
  ['LAWN_EDGE',parking.x1+.53,parking.z0+.90,parking.z1-1.50]
 ]){
  if(vehicleArea(x,(z0+z1)/2,.18)||insideHouse(x,(z0+z1)/2,.13))continue;
  plane(grounds,'GRAVEL_TRANSITION_'+tag,.23,z1-z0,x,(z0+z1)/2,
   materials.pebbles,base+.016);
  stats.decorativeGravelStrips++;
 }
 // Three restrained flush bay-end inlays, not false bollards or tyre stops.
 // The original 3 x 2.5m marked bays and their full parking slab survive.
 for(let i=0;i<3;i++){
  const x=bays.x0+(i+.5)*2.5,z=bays.z0+.45;
  const marker=plane(grounds,'PARKING_BAY_END_INLAY',.47,.068,x,z,
   materials.marker,base+.061);
  marker.userData.bayNumber=i+1;stats.parkingMarkers++;
 }
 // Tropical low-maintenance landscaping concept, proposed on open
 // periphery lawn rather than within the vehicle route or house doors.
 const shrubPositions=[
  [108.6,zTop+1.30],[114.1,zTop+1.30],[119.6,zTop+1.30],
  [125.6,zTop+1.30],[132.6,zTop+1.30],
  [108.5,zFront-1.55],[119.5,zFront-1.55]
 ];
 for(const [x,z] of shrubPositions){
  if(!certifiedClearLawn(x,z,.47))continue;
  const g=new THREE.Group();g.position.set(x,base,z);
  g.name='STAGE8_LOW_ROOT_GARDEN_CLUSTER';
  gardens.add(g);register(g,x,z,.25);stats.shrubClusters++;
  const bed=make(g,'MULCHED_SHRUB_BASE',
   new THREE.CylinderGeometry(.42,.46,.025,14),materials.mulch,0,.018,0);
  for(let k=0;k<5;k++){
   const a=k*2*Math.PI/5,rad=k%2?.13:.22;
   const px=Math.cos(a)*rad,pz=Math.sin(a)*rad;
   make(g,'TROPICAL_FOLIAGE_GROUP',new THREE.SphereGeometry(.22,9,7),
    k%2?materials.brightLeaves:materials.leaves,px,.24+(k%2)*.06,pz)
    .scale.set(1,.74,.83);
   stats.shrubStems++;
  }
  // No invasive-root claim can be certified from a decorative 3D asset.
  bed.userData.rootDesign='provisional-shallow-root-planting-zone';
 }
 // Warm 2900K bollards on lawn SIDE of paving, with no lighting fixtures
 // on the road, across the sliding gate opening or on parking bay lines.
 const bollardCandidates=[
  [parking.x1+1.23,parking.z0+1.4],
  [parking.x1+1.23,parking.z0+6.7],
  [parking.x1+1.23,parking.z1-1.25],
  [site.house.minX+.72,zFront-.75],
  [site.house.maxX-1.12,zFront-.75]
 ];
 for(const [x,z] of bollardCandidates){
  if(!certifiedClearLawn(x,z,.18))continue;
  const g=new THREE.Group();g.position.set(x,base,z);
  g.name='STAGE8_LAWN_SIDE_LIGHT_BOLLARD';
  lighting.add(g);
  make(g,'BOLLARD_POST',new THREE.CylinderGeometry(.062,.081,.57,11),
   materials.bollard,0,.29,0);
  make(g,'BOLLARD_LENS',new THREE.CylinderGeometry(.079,.079,.11,13),
   materials.lens,0,.53,0);
  make(g,'BOLLARD_CAP',new THREE.CylinderGeometry(.090,.090,.04,12),
   materials.brass,0,.61,0);
  lightAt(x,base+.53,z,.87);
  register(g,x,z,.10);stats.pathwayBollards++;
 }
 // Gate lanterns are anchored to the existing TWO gate pillars, avoiding
 // a duplicated perimeter wall or a new gate structure.
 const [gateX,gateZ]=site.access.gateCenter;
 for(const side of [-1,1]){
  const x=gateX+side*2.18,z=gateZ+.25;
  const mount=make(lighting,'EXISTING_GATE_PILLAR_LANTERN',
   new THREE.BoxGeometry(.14,.25,.08),materials.bollard,
   x,base+1.65,z);
  make(lighting,'GATE_LANTERN_WARM_LENS',
   new THREE.BoxGeometry(.11,.16,.015),materials.lens,
   x,base+1.65,z+.045);
  lightAt(x,base+1.69,z+.08,1.1);
  stats.gatePillarLights++;
  mount.userData.sourceAnchor='existing-gate-pillar';
 }
 // Existing three palms: subtle uplight at ground, no extra tree/roots.
 for(const [x,z] of site.access.palms){
  const ux=x-.55,uz=z;
  const lamp=make(lighting,'EXISTING_PALM_UPLIGHT',
   new THREE.CylinderGeometry(.12,.12,.035,12),materials.bollard,
   ux,base+.025,uz);
  lamp.userData.sourceAnchor='existing-preserved-palm';
  make(lighting,'PALM_UPLIGHT_LENS',
   new THREE.CylinderGeometry(.085,.085,.015,10),materials.lens,
   ux,base+.052,uz);
  const spot=lightAt(ux,base+.24,uz,1);
  spot.distance=4.5;stats.palmUplights++;
 }
 const initialObjects=root.children.length;
 let night=false,lightsEnabled=true,accentEnabled=true,
  showDetails=true,showSurroundings=true,walking=false;
 function update({night:n,enabled,lightLayers,showDetails:details,
   showSurroundings:surroundings,walking:walk}={}){
  if(typeof n==='boolean')night=n;
  if(typeof enabled==='boolean')lightsEnabled=enabled;
  if(typeof lightLayers?.accent==='boolean')accentEnabled=lightLayers.accent;
  if(typeof details==='boolean')showDetails=details;
  if(typeof surroundings==='boolean')showSurroundings=surroundings;
  if(typeof walk==='boolean')walking=walk;
  root.visible=showSurroundings||walking;
  // The landscaping is part of the production exterior, not affected by
  // indoor "details" toggle; lights respond to house/day-night controls.
  const on=lightsEnabled&&accentEnabled;
  materials.lens.emissiveIntensity=on?(night?1.30:.35):0;
  for(const l of lightSources)l.intensity=on?(night?1.75:.27):0;
  return status();
 }
 function status(){
  return {
   stage:8,productionIntegrated:true,previewActivationRequired:false,
   ...stats,sourceExteriorSitePreserved:accessUnchanged(),
   sourceIFCGeometryPreserved:sourceUnchanged(),
   originalGateWidthMetres:site.gate.userData.widthMetres,
   originalGateOnPalmSideFence:site.summary.gateOnPalmTreeSideFence,
   straightDrivewayToCourtPreserved:site.summary.straightDrivewayToParking,
   seamlessDrivewayEdgePreserved:site.summary.driveCourtRightEdgeOffsetMetres===0,
   originalMarkedParkingBays:site.summary.parkingBays,
   pavedPercentage:site.summary.totalPavingOutdoorCoverage,
   lawnPercentage:site.summary.lawnOutdoorCoverageApprox,
   preservedPalms:site.summary.palmTreesPreserved,
   builtNewBoundaryWalls:0,movedOriginalGate:false,addedParkingShadeCanopy:false,
   addedSurfaceDrainagePipework:false,engineeredSiteFalls:false,
   designedLightingTemperatureKelvin:2900,
   night,lightsEnabled,accentLayerEnabled:accentEnabled,
   lightsCurrentlyOn:lightSources.filter(x=>x.intensity>0).length,
   addedWalkBlockers:obstacles.length,
   siteSurveyApproved:false,drainageApproved:false,
   electricalApproved:false,clientApproved:false
  };
 }
 function dispose(){
  root.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  Object.values(materials).forEach(m=>m.dispose());
  site.root.remove(root);
 }
 update();
 return {root,grounds,gardens,lighting,obstacles,update,status,dispose};
}
