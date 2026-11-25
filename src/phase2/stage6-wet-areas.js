import * as THREE from 'three';
import {buildClippedFloor} from './phase14abc-flooring.js';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from './stage1-plan-crosswalk.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * AutoMinds Spaces Stage 6 / Studio Anne p. 11 and pp. 37–40.
 *
 * Existing IFC contains no IfcSanitaryTerminal and no IfcSpace polygons.
 * These are tightly bounded, *provisional* S1 service zones, not surveyed
 * bathrooms or a licence to add plumbing/partitions at invented locations.
 * Only source FU-011 / FU-012 proxy fitting anchors inside the matching
 * S1 service zone can initiate the visual wet-area design.
 * IFC meshes, source collisions, doors, walls and plumbing are untouched.
 */
export const STAGE6_BRIEF=Object.freeze({
 pages:[11,37,38,39,40],
 sanitaryIfcTypeAvailable:false,architectCertifiedBathroomPolygons:false,
 fullHeightPorcelainOnSourceWallsOnly:true,
 porcelainFloorOnSourceSlabOnly:true,
 neutralWhiteMirrorLightKelvin:3500,blackFittingsAllowed:false,
 preferredMetals:['brushed-brass','chrome','brushed-nickel'],
 maidShowerSeparator:'solid-concept-pending-survey',
 otherShowerSeparators:'glass-concept-pending-survey',
 drainageSlopeSurveyed:false,waterSupplyPumpConfirmed:false,
 ventilationApproved:false,clientApproved:false
});
export const STAGE6_SOURCE_S1_ZONES=Object.freeze([
 // Source world X/Z approximations from S1 (not certified IFC polygons).
 {id:'G-POWDER-WC',level:'ground',bounds:[106.65,109.15,-10.18,-8.63],
  label:'Ground powder WC',shower:false},
 {id:'G-MAID-WC-SH',level:'ground',bounds:[107.64,110.05,-12.16,-10.04],
  label:'Ground maid WC/shower',shower:true,maid:true},
 {id:'G-BEDROOM-WC-SH',level:'ground',bounds:[111.98,114.05,-13.69,-11.72],
  label:'Ground bedroom WC/shower',shower:true},
 {id:'F-BEDROOM-WC',level:'first',bounds:[106.0,108.1,-3.01,-.47],
  label:'First-floor bedroom WC',shower:false}
]);
const sourceDatums={ground:0,first:3.3};
const round=n=>Math.round(n*1000)/1000;
function inZone(x,z,zone,margin=0){
 const [xmin,xmax,zmin,zmax]=zone.bounds;
 return x>=xmin+margin&&x<=xmax-margin&&z>=zmin+margin&&z<=zmax-margin;
}
const sourceClass=r=>{
 if(r?.category!=='proxies'||!r.mesh?.isMesh||!r.box)return null;
 const name=String(r.mesh.userData?.ifc?.name||'').trim().toUpperCase();
 if(!['FU - 011','FU - 012'].includes(name))return null;
 const b=r.box,d=b.getSize(new THREE.Vector3());
 if(name==='FU - 011'&&!(d.y>=.80&&d.y<=1.35&&
   Math.min(d.x,d.z)<.36&&Math.max(d.x,d.z)<.52))return null;
 if(name==='FU - 012'&&!(d.y>=.52&&d.y<=.82&&
   Math.min(d.x,d.z)<.20&&Math.max(d.x,d.z)<.52))return null;
 return name==='FU - 011'?'wall-mounted-upper-fitting':'wall-mounted-lower-fitting';
};
export function auditStage6S1WetAnchors(records=[],origin={x:0,z:0}){
 const supported=[];
 for(const zone of STAGE6_SOURCE_S1_ZONES){
  const entries=[];
  for(const r of records){
   if(r.layer?.level!==zone.level)continue;
   const kind=sourceClass(r);if(!kind)continue;
   const c=r.box.getCenter(new THREE.Vector3());
   const x=c.x+(origin.x||0),z=c.z+(origin.z||0);
   const datum=sourceDatums[zone.level];
   if(!inZone(x,z,zone)||r.box.min.y<datum+.68||
    r.box.max.y>datum+2.85)continue;
   entries.push({record:r,kind,x,z,sourceGuid:r.mesh.userData?.ifc?.guid});
  }
  supported.push({...zone,entries,sourceSupported:entries.length>0});
 }
 return supported;
}
export function createStage6WetAreas({
 scene,origin={x:0,z:0},records=[],doors=[],
 floorSampler=()=>null
}={}){
 if(!scene||typeof floorSampler!=='function')throw Error('Stage 6 requires real source floor evidence');
 const snapshot=records.map(r=>({
  mesh:r.mesh,geometry:r.mesh?.geometry,
  pos:r.mesh?.position.clone(),scale:r.mesh?.scale.clone()
 }));
 const sourceUnchanged=()=>snapshot.every(r=>
  r.mesh?.geometry===r.geometry&&
  r.mesh?.position.equals(r.pos)&&r.mesh?.scale.equals(r.scale));
 const root=new THREE.Group();root.name='STAGE6_SOURCE_S1_WET_AREA_FINISHES';
 root.userData={stage6:true,productionIntegrated:true};scene.add(root);
 const materials={
  porcelain:new THREE.MeshStandardMaterial({color:0xe8e5df,roughness:.48,metalness:0}),
  porcelainAccent:new THREE.MeshStandardMaterial({color:0xc7c5bd,roughness:.55}),
  grout:new THREE.MeshStandardMaterial({color:0xe1dfda,roughness:.75}),
  brass:new THREE.MeshStandardMaterial({color:0xbca078,roughness:.28,metalness:.76}),
  chrome:new THREE.MeshStandardMaterial({color:0xb9c1c5,roughness:.22,metalness:.83}),
  ceramic:new THREE.MeshStandardMaterial({color:0xf7f5ee,roughness:.29}),
  ivory:new THREE.MeshStandardMaterial({color:0xded4c4,roughness:.67}),
  led:new THREE.MeshStandardMaterial({
   color:0xfff7e8,emissive:0xffecd4,emissiveIntensity:.95,roughness:.55})
 };
 const groups={};const lights=[];const stats={};
 const audit=auditStage6S1WetAnchors(records,origin);
 const originX=origin.x||0,originZ=origin.z||0;
 const loc=(x,y,z)=>[x-originX,y,z-originZ];
 let activeZones=0,sourceFittings=0,mirrorTrim=0,vanityAccents=0,
  porcelainTiles=0,wallCladdingPanels=0,taskLights=0,sourceProbes=0;
 const ignoredRemoved=r=>r.mesh?.userData?.clientStairSittingWallRemoved||
  r.mesh?.userData?.clientKitchenDiningDividerRemoved||
  r.mesh?.userData?.clientKitchenStairPartitionRemoved||
  r.mesh?.userData?.clientOpenPlanPartitionRemoved||
  r.mesh?.userData?.facadeDuplicateHidden||
  r.mesh?.userData?.functionallyReplacedDoorId;
 function visual(mesh,part,zoneId){
  mesh.name='STAGE6_'+part.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.userData={stage6:true,zoneId,part,collidable:false,
   previewActivationRequired:false,sourceIfcUnchanged:true,
   clientApproved:false,plumbingCertified:false};
  return mesh;
 }
 function piece(group,part,geometry,material,x,y,z,angle=0,zoneId=null){
  const m=visual(new THREE.Mesh(geometry,material),part,zoneId||group.name);
  m.position.set(...loc(x,y,z));m.rotation.y=angle;group.add(m);
  return m;
 }
 function rounded(group,part,dimensions,radius,material,x,y,z,angle,zoneId){
  return piece(group,part,new RoundedBoxGeometry(...dimensions,3,radius),
   material,x,y,z,angle||0,zoneId);
 }
 const nearDoor=(x,z,level,clearance=.65)=>doors.some(d=>
  d.level===level&&!d.removedFromPlan&&
  Math.hypot(x-(d.position.x+originX),z-(d.position.z+originZ))<
   Math.max(clearance,(d.width||.85)*.5+.20));
 function actualFloor(x,z,level){
  const datum=sourceDatums[level];
  const s=floorSampler(x-originX,z-originZ,datum);
  if(!Number.isFinite(s?.y)||Math.abs(s.y-datum)>.19)return null;
  sourceProbes++;return s.y;
 }
 function wallFor(point,zone){
  const datum=sourceDatums[zone.level];
  const walls=records.filter(r=>{
   if(r.category!=='walls'||r.layer?.level!==zone.level||!r.box||
     !r.mesh?.visible||ignoredRemoved(r))return false;
   const b=r.box,d=b.getSize(new THREE.Vector3());
   if(d.y<2.15||b.max.y<datum+2.3||b.min.y>datum+.22||
     Math.min(d.x,d.z)>.42||Math.max(d.x,d.z)>4.6||
     Math.max(d.x,d.z)<.62)return false;
   const c=b.getCenter(new THREE.Vector3()),x=c.x+originX,z=c.z+originZ;
   return inZone(x,z,zone,.025)&&
    Math.hypot(x-point.x,z-point.z)<1.20&&
    !nearDoor(x,z,zone.level,.76);
  });
  walls.sort((a,b)=>{
   const score=r=>{
    const c=r.box.getCenter(new THREE.Vector3());
    return Math.hypot(c.x+originX-point.x,c.z+originZ-point.z);
   };return score(a)-score(b);
  });
  return walls[0]||null;
 }
 for(const zone of audit){
  const group=new THREE.Group();group.name='STAGE6_'+zone.id.replace(/-/g,'_');
  root.add(group);groups[zone.id]=group;
  const zstat={sourceAnchorCount:zone.entries.length,sourceGuids:zone.entries.map(e=>e.sourceGuid),
   floorTiles:0,wallCladding:0,mirrorFrames:0,vanityShelfDetails:0,
   showerGlassCreated:0,newToiletsCreated:0,drainsCertified:false};
  stats[zone.id]=zstat;
  if(!zone.entries.length)continue; // Zero evidence -> no fake bathroom.
  const datum=sourceDatums[zone.level];
  const validEntries=zone.entries.filter(e=>e.record.mesh.visible);
  if(!validEntries.length)continue;
  activeZones++;sourceFittings+=validEntries.length;
  const bounds=zone.bounds;const tileStep=.42;
  const nearAnchor=(x,z)=>validEntries.some(e=>Math.hypot(x-e.x,z-e.z)<1.09);
  // Do not fill an entire unverified bathroom bounding rectangle. Retain
  // the existing anchor restriction and exclude overlapping Stage 2 rooms.
  const [xmin,xmax,zmin,zmax]=bounds;
  const overlappingRooms=Object.entries(STAGE1_PLAN_SKETCHES).filter(([id,p])=>p.floor===zone.level&&id!=='G-MAID');
  const built=buildClippedFloor({polygon:[[xmin,zmin],[xmax,zmin],[xmax,zmax],[xmin,zmax]],origin,step:tileStep,datum,offset:.018,
   sample:(lx,lz)=>{
    const x=lx+originX,z=lz+originZ;
    if(!nearAnchor(x,z)||overlappingRooms.some(([,p])=>insidePolygon([x,z],p.vertices)))return null;
    const y=actualFloor(x,z,zone.level);return y===null?null:{y};
   }});
  if(built.cells){
   const mesh=visual(new THREE.Mesh(built.geometry,materials.porcelain),'floor-porcelain-source-supported',zone.id);
   group.add(mesh);porcelainTiles+=built.cells;zstat.floorTiles+=built.cells;
  }else built.geometry.dispose();
  zstat.floorCoverage={supportedArea:round(built.supportedArea),unverifiedArea:round(built.skippedArea),cutFragments:built.cutFragments};
  // Only existing IFC walls get thin porcelain surface strips. Never place
  // a panel where no source wall exists or where a functional doorway is near.
  const visited=new Set();
  for(const e of validEntries){
   const wall=wallFor(e,zone);
   if(!wall||visited.has(wall))continue;
   visited.add(wall);
   const b=wall.box,d=b.getSize(new THREE.Vector3());
   const c=b.getCenter(new THREE.Vector3());
   const axis=d.x>d.z?'x':'z',span=Math.min(1.20,Math.max(.55,Math.max(d.x,d.z)-.12));
   const zoneCenterX=(zone.bounds[0]+zone.bounds[1])/2;
   const zoneCenterZ=(zone.bounds[2]+zone.bounds[3])/2;
   const dx=axis==='x'?0:Math.sign(zoneCenterX-(c.x+originX)||1)*(d.x/2+.012);
   const dz=axis==='z'?0:Math.sign(zoneCenterZ-(c.z+originZ)||1)*(d.z/2+.012);
   // Wall strip is nonstructural, 6 mm deep, within a verified IFC wall.
   rounded(group,'source-wall-large-format-tile',
    [span,2.23,.006],.003,materials.porcelainAccent,
    c.x+originX+dx,datum+1.17,c.z+originZ+dz,
    axis==='x'?0:Math.PI/2,zone.id);
   wallCladdingPanels++;zstat.wallCladding++;
  }
  for(const e of validEntries){
   const b=e.record.box,d=b.getSize(new THREE.Vector3());
   const cx=e.x,cz=e.z,centerY=(b.min.y+b.max.y)/2;
   if(e.kind==='wall-mounted-upper-fitting'){
    // Source FU-011 appears as a real narrow, tall raised panel. Accent the
    // original source panel with slim nickel/brass trims and a 3500K glow;
    // its underlying mesh stays visible and dimensionally unchanged.
    const thinX=d.x<d.z;
    const long=Math.max(.20,Math.max(d.x,d.z));
    for(const sign of [-1,1]){
     const px=thinX?cx:cx+sign*(long/2+.008);
     const pz=thinX?cz+sign*(long/2+.008):cz;
     rounded(group,'brushed-metal-mirror-side',
      [thinX?.012:.020,Math.min(d.y,1.20),thinX?.02:.012],.003,
      materials.brass,px,centerY,pz,0,zone.id);
    }
    rounded(group,'mirror-neutral-white-led',
     [thinX?.018:long,.012,thinX?long:.018],.003,
     materials.led,cx,b.max.y+.018,cz,0,zone.id);
    const light=new THREE.PointLight(0xfff0db,0,1.55,2);
    light.position.set(...loc(cx,b.max.y+.035,cz));light.castShadow=false;
    group.add(light);lights.push({light,level:zone.level,zone:zone.id});
    taskLights++;mirrorTrim++;zstat.mirrorFrames++;
   }else{
    // FU-012 is an actual wall-mounted, lower-height sanitary-area
    // component. Add a restrained small brushed-metal accessory shelf
    // beneath the real piece. Do not name it a verified sink or toilet.
    const y=Math.max(datum+.53,b.min.y-.07);
    rounded(group,'brushed-nickel-vanity-accessory-ledge',
     [.34,.026,.16],.009,materials.chrome,
     cx,y,cz,0,zone.id);
    rounded(group,'waterproof-concealed-cabinet-face-concept',
     [.34,.18,.12],.016,materials.ivory,
     cx,y-.125,cz,0,zone.id);
    vanityAccents++;zstat.vanityShelfDetails++;
   }
  }
 }
 let floor='all',walk=false,furnitureVisible=true,lightsOn=true,night=false,taskLayer=true;
 function update({floor:fl,walking,furnitureVisible:vis,enabled,night:n,lightLayers}={}){
  if(typeof fl==='string')floor=fl;
  if(typeof walking==='boolean')walk=walking;
  if(typeof vis==='boolean')furnitureVisible=vis;
  if(typeof enabled==='boolean')lightsOn=enabled;
  if(typeof n==='boolean')night=n;
  if(typeof lightLayers?.task==='boolean')taskLayer=lightLayers.task;
  root.visible=furnitureVisible;
  for(const zone of audit){
   const g=groups[zone.id];
   g.visible=furnitureVisible&&(walk||floor==='all'||floor===zone.level);
  }
  for(const {light,level,zone} of lights){
   light.intensity=lightsOn&&taskLayer&&groups[zone].visible?(night?1.9:.47):0;
  }
  return status();
 }
 function status(){
  return {stage:6,productionIntegrated:true,previewActivationRequired:false,
   activeSourceWetZones:activeZones,identifiedSourceProxyFittings:sourceFittings,
   porcelainFloorTiles:porcelainTiles,sourceWallTilePanels:wallCladdingPanels,
   sourceUpperFittingsTrimmed:mirrorTrim,lowerFittingsAccented:vanityAccents,
   illuminatedServiceMirrors:taskLights,sourceFloorProbesPassed:sourceProbes,
   sourceGeometryPreserved:sourceUnchanged(),sourceDoorCollidersPreserved:true,
   sourceWallCollidersPreserved:true,addedInternalWalls:0,addedDoors:0,
   newShowerPartitionsCreated:0,newUnverifiedToiletsCreated:0,
   exactBathroomPolygonsCertified:false,wetAreaWaterproofingCertified:false,
   bidetDrainageCertified:false,ventilationEngineered:false,
   roomSelectionsArchitectApproved:false,clientApproved:false,
   sourceZoneAudit:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,{...v}])),
   protectedFeatures:['kitchen-dining-sitting open plan','maid exterior entry',
    'staircase','first floor balconies','all original bathroom walls and doors']};
 }
 function dispose(){
  root.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  Object.values(materials).forEach(m=>m.dispose());
  scene.remove(root);
 }
 update();
 return {root,groups,update,status,dispose};
}
