import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BALCONY_SPECS} from './balcony-restoration.js';

/**
 * Stage 7: Studio Anne pp. 11–12, 34–36 and Home(4).pdf S1/S2.
 *
 * The original IFC and the already functional two-flight/landing safety rails,
 * balcony slabs, guard glazing and door openings are preserved. This module
 * adds only source-supported finishes, small furnishings and switchable LEDs.
 * Every addition is present on the first production scene render.
 *
 * Appearance is a reversible client concept, NOT structural/safety/electrical
 * engineering approval, exterior waterproofing or shop drawings.
 */
export const STAGE7_DESIGN_BRIEF=Object.freeze({
 pages:[11,12,34,35,36],
 productionFirst:true,extraUserClickRequired:false,
 flights:2,intermediateLanding:1,planBalconies:3,
 treadsSourceRequired:true,sourceSlabsRequired:true,sourceDoorsRequired:true,
 stairGuardAlreadyExists:true,balconyGlazingAlreadyExists:true,
 stepLightKelvin:2900,balconyAccentKelvin:2900,
 roomChoicesArchitectApproved:false,electricalRoutesApproved:false,
 waterproofingCertified:false,guardHeightCertifiedByEngineer:false
});
const to3=v=>Math.round(v*1000)/1000;
const mat=(color,roughness=.7,metalness=0,emissive=0x000000)=>new THREE.MeshStandardMaterial({
 color,roughness,metalness,emissive,emissiveIntensity:0
});
const stepY=3.2;
const BALCONY_DECK_REGIONS=Object.freeze({
 'front-west':Object.freeze([[107.84,109.86,.30,1.23]]),
 // L-shaped family balcony: front strip + source-supported eastern return.
 // Never tile the family room interior portion of the shared source slab.
 'front-family':Object.freeze([[112.56,118.82,.42,1.12],[118.42,118.83,-1.47,.34]]),
 'east-projection':Object.freeze([[120.32,122.26,-9.16,-5.83]])
});
function rounded(g,name,dim,r,material,p){
 const m=new THREE.Mesh(new RoundedBoxGeometry(...dim,3,r),material);
 m.name='STAGE7_'+name;m.position.set(...p);
 m.castShadow=false;m.receiveShadow=false;
 m.userData={stage7:true,sourceIFCUnmodified:true,visualConceptOnly:true,nonstructural:true};
 g.add(m);return m;
}
function baseMesh(g,name,geo,material,p){
 const m=new THREE.Mesh(geo,material);m.name='STAGE7_'+name;m.position.set(...p);
 m.castShadow=false;m.receiveShadow=false;
 m.userData={stage7:true,sourceIFCUnmodified:true,visualConceptOnly:true,nonstructural:true};
 g.add(m);return m;
}
function makeChair(g,x,y,z,origin,materials,tag){
 const group=new THREE.Group();group.name='STAGE7_BALCONY_CHAIR_'+tag;
 group.position.set(x-origin.x,y,z-origin.z);g.add(group);
 rounded(group,'WOVEN_SEAT_'+tag,[.59,.115,.58],.10,materials.woven,[0,.47,0]);
 rounded(group,'BACK_'+tag,[.59,.51,.095],.045,materials.woven,[0,.77,.25]);
 for(const sx of [-1,1]){
  rounded(group,'ARM_'+tag,[.067,.24,.46],.026,materials.timber,[sx*.26,.56,-.005]);
  for(const sz of [-1,1])
   baseMesh(group,'CHAIR_FOOT_'+tag,new THREE.CylinderGeometry(.025,.035,.40,8),
    materials.timber,[sx*.23,.22,sz*.22]);
 }
 rounded(group,'CUSHION_'+tag,[.43,.045,.46],.025,materials.ivory,[0,.54,-.02]);
 return group;
}
function makePlanter(g,x,y,z,origin,materials,tag){
 const group=new THREE.Group();group.name='STAGE7_PLANTER_'+tag;
 group.position.set(x-origin.x,y,z-origin.z);g.add(group);
 baseMesh(group,'PLANTER_POT_'+tag,new THREE.CylinderGeometry(.13,.095,.28,12),
  materials.stone,[0,.15,0]);
 baseMesh(group,'PLANTER_STEM_'+tag,new THREE.CylinderGeometry(.010,.013,.39,7),
  materials.timber,[0,.48,0]);
 for(let i=0;i<7;i++){
  const angle=i*Math.PI*2/7;
  const leaf=baseMesh(group,'LEAF_'+tag,new THREE.SphereGeometry(.12,8,6),
   materials.leaf,[Math.cos(angle)*.105,.52+((i%3)-1)*.075,Math.sin(angle)*.105]);
  leaf.scale.set(1,.26,.58);leaf.rotation.y=angle;
 }
 return group;
}
const minDist=(x,z,door)=>Math.hypot(x-door[0],z-door[1]);
export function createStage7StairsBalconiesLighting({
 scene,origin={x:0,z:0},records=[],
 stairSystem,balconySystem
}={}){
 if(!scene)throw Error('Stage 7 requires the existing house scene');
 const original=records.map(r=>({
  mesh:r.mesh,geometry:r.mesh?.geometry,
  p:r.mesh?.position.clone(),s:r.mesh?.scale.clone(),
  box:r.box?.clone()
 }));
 const sourceUnchanged=()=>original.every(r=>
  r.mesh?.geometry===r.geometry&&r.mesh?.position.equals(r.p)&&
  r.mesh?.scale.equals(r.s)&&r.box?.equals(r.box));
 const root=new THREE.Group();
 root.name='STAGE7_INTEGRATED_STAIRS_BALCONIES_LIGHTING';
 root.userData={stage7:true,productionIntegrated:true};scene.add(root);
 const stairGroup=new THREE.Group();stairGroup.name='STAGE7_SOURCE_STAIRS';
 root.add(stairGroup);
 const grounds={ground:new THREE.Group(),first:new THREE.Group()};
 grounds.ground.name='STAGE7_LOWER_STAIR';
 grounds.first.name='STAGE7_UPPER_STAIR';
 stairGroup.add(grounds.ground,grounds.first);
 const balconyGroup=new THREE.Group();balconyGroup.name='STAGE7_SOURCE_BALCONY_DECKS';
 root.add(balconyGroup);
 const materials={
  nosing:mat(0x90775d,.69),
  nosingTrim:mat(0xb39a70,.31,.58),
  plank:mat(0xb3aa97,.74),
  plankAlternate:mat(0xc8bca8,.79),
  woven:mat(0xa9b3ab,.96),
  ivory:mat(0xe8e0d5,.97),
  timber:mat(0x86664b,.65),
  stone:mat(0xb5a999,.72),
  leaf:mat(0x50745a,.93),
  brass:mat(0xbf9e70,.28,.58),
  lightOn:mat(0xffebc9,.47,0,0xffc979),
  lightOff:mat(0x69645c,.74),
  railingGlow:mat(0xffead1,.48,0,0xffc78c)
 };
 const litMeshes=[],colliders=[],balconies=[],stats={
  sourceTreadsEnhanced:0,stepEdgeTrimPieces:0,
  sourceStepLEDs:0,sourceBalconiesFinished:0,
  balconyDeckPieces:0,balconyChairs:0,balconyTables:0,
  balconyPlants:0,balconyRailLEDs:0,
  sourceStairTreadsFound:0,expectedBalconies:3
 };
 const sourceGuids=new Set(stairSystem?.summary?.sourceReferences??[]);
 const validStairs=Boolean(stairSystem?.sourceVerified&&
   stairSystem?.summary?.originalLanding===1&&
   stairSystem?.summary?.sourceTreads>=14);
 const stairTreads=validStairs?records.filter(r=>
  sourceGuids.has(r.mesh?.userData?.ifc?.guid)&&
  r.box&&/\bSF TREAD\s*-\s*\d+/i.test(r.mesh?.userData?.ifc?.name||'')&&
  r.box.min.y>=-.02&&r.box.max.y<=3.36):[];
 const sortedTreads=[...stairTreads].sort((a,b)=>
  a.box.max.y-b.box.max.y);
 stats.sourceStairTreadsFound=sortedTreads.length;
 const originX=origin.x||0,originZ=origin.z||0;
 for(const record of sortedTreads){
  const box=record.box;
  const dim=box.getSize(new THREE.Vector3());
  if(dim.z<.55||dim.x<.22||dim.x>1.20||
    box.max.y-box.min.y>.13)continue;
  const level=box.max.y<1.70?'ground':'first';
  const c=box.getCenter(new THREE.Vector3());
  // Slim, tread-local nosing detailing only. No raised substitute stairs,
  // walking deck or structural tread bridges are created.
  const x=box.max.x-.050,y=box.max.y+.005,z=c.z;
  const span=Math.min(1.30,dim.z-.115);
  rounded(grounds[level],'SOURCE_TREAD_NOSING',
   [.056,.012,span],.007,materials.nosing,[x,y,z]);
  stats.sourceTreadsEnhanced++;stats.stepEdgeTrimPieces++;
  const led=rounded(grounds[level],'2900K_RECESSED_STEP_STRIP',
   [.012,.009,span*.74],.003,materials.lightOn,
   [x-.031,y-.002,z]);
  led.userData.lightLayer='accent';
  litMeshes.push(led);stats.sourceStepLEDs++;
 }
 const verified=new Map((balconySystem?.summary?.balconies??[])
  .filter(x=>x.verified&&x.sourceSlabCount>0&&
    x.sourceEntranceGuids?.length>0&&x.guardPanels>0)
  .map(x=>[x.id,x]));
 for(const spec of BALCONY_SPECS){
  const accepted=verified.get(spec.id);
  const group=new THREE.Group();group.name='STAGE7_DECK_'+spec.id;
  balconyGroup.add(group);
  const data={id:spec.id,sourceVerified:Boolean(accepted),
   sourceSlabGuids:accepted?.sourceSlabGuids??[],
   sourceDoorGuids:accepted?.sourceEntranceGuids??[],
   tiles:0,chairs:0,plants:0,railLEDs:0,tables:0,
   originalGuardRetained:true};
  balconies.push(data);
  if(!accepted)continue;
  stats.sourceBalconiesFinished++;
  const tileStep=.33;
  const seen=new Set();
  for(const region of BALCONY_DECK_REGIONS[spec.id]??[]){
   const [xmin,xmax,zmin,zmax]=region;
   for(let x=xmin+tileStep/2;x<xmax-tileStep/2+.005;x+=tileStep){
    for(let z=zmin+tileStep/2;z<zmax-tileStep/2+.005;z+=tileStep){
     const key=Math.round(x*100)+'_'+Math.round(z*100);
     if(seen.has(key)||minDist(x,z,spec.door)<.57)continue;
     seen.add(key);
     const alternate=(Math.round(x/tileStep)+Math.round(z/tileStep))%2===0;
     baseMesh(group,'WEATHER_TREATED_DECK_TILE',
      new THREE.BoxGeometry(tileStep-.014,.012,tileStep-.014),
      alternate?materials.plank:materials.plankAlternate,
      [x-originX,stepY+.008,z-originZ]);
     stats.balconyDeckPieces++;data.tiles++;
    }
   }
  }
  // LED accents attach only along EXISTING guards: visual lighting lines
  // below the original handrail, not a second safety railing.
  for(const [from,to] of spec.segments){
   const ax=from[0]-originX,az=from[1]-originZ;
   const bx=to[0]-originX,bz=to[1]-originZ;
   const length=Math.hypot(bx-ax,bz-az);
   const strip=baseMesh(group,'UNDER_HANDRAIL_2900K_LED',
    new THREE.BoxGeometry(length-.06,.009,.009),materials.railingGlow,
    [(ax+bx)/2,stepY+1.035,(az+bz)/2]);
   strip.rotation.y=-Math.atan2(bz-az,bx-ax);
   strip.userData.lightLayer='accent';litMeshes.push(strip);
   stats.balconyRailLEDs++;data.railLEDs++;
  }
  const furnish=(tag,x,z)=>{
   if(minDist(x,z,spec.door)<1.28) return false;
   const b=spec.slabBox;
   if(x<b[0]+.24||x>b[1]-.24||z<b[2]+.24||z>b[3]-.24)
    return false;
   return true;
  };
  function rec(group,tag){
   group.updateWorldMatrix(true,true);
   const box=new THREE.Box3().setFromObject(group);
   colliders.push({mesh:group,box,category:'furniture',
    layer:{level:'first',name:'STAGE7_BALCONY_FURNITURE'},sourceApproved:false,tag});
  }
  // Interior-to-balcony circulation is kept open from every original
  // verified door. Only the large family and east decks receive seating.
  if(spec.id==='front-family'){
   for(const [tag,x,z] of [['west',116.65,.72],['east',117.89,.72]]){
    if(!furnish(tag,x,z))continue;
    rec(makeChair(group,x,stepY,z,origin,materials,tag),'family-chair-'+tag);
    data.chairs++;stats.balconyChairs++;
   }
   const x=117.27,z=.72;
   if(furnish('table',x,z)){
    const tb=new THREE.Group();tb.name='STAGE7_BALCONY_FAMILY_TABLE';
    tb.position.set(x-originX,stepY,z-originZ);group.add(tb);
    baseMesh(tb,'LOUNGE_TABLE_STEM',new THREE.CylinderGeometry(.040,.068,.42,10),
     materials.timber,[0,.23,0]);
    baseMesh(tb,'ROUND_OUTDOOR_TABLE_TOP',new THREE.CylinderGeometry(.29,.29,.041,18),
     materials.stone,[0,.47,0]);
    rec(tb,'family-table');stats.balconyTables++;data.tables++;
   }
  }else if(spec.id==='east-projection'){
   if(furnish('chair',121.23,-8.18)){
    rec(makeChair(group,121.23,stepY,-8.18,origin,materials,'east'),'east-chair');
    data.chairs++;stats.balconyChairs++;
   }
  }
  const p=spec.id==='front-west'?[109.62,1.07]:
    spec.id==='front-family'?[118.55,-.93]:[121.80,-5.92];
  if(furnish('plant',p[0],p[1])){
   rec(makePlanter(group,p[0],stepY,p[1],origin,materials,spec.id),
     'planter-'+spec.id);stats.balconyPlants++;data.plants++;
  }
 }
 let houseLightsOn=true,night=false,accent=true,level='all',
  walking=false,details=true,balconyEnabled=true,stairEnabled=true;
 function update({floor:fl,walking:walk,night:n,enabled,lightLayers,
  showDetails,showBalconies,showStairSafety}={}){
  if(typeof fl==='string')level=fl;
  if(typeof walk==='boolean')walking=walk;
  if(typeof n==='boolean')night=n;
  if(typeof enabled==='boolean')houseLightsOn=enabled;
  if(typeof lightLayers?.accent==='boolean')accent=lightLayers.accent;
  if(typeof showDetails==='boolean')details=showDetails;
  if(typeof showBalconies==='boolean')balconyEnabled=showBalconies;
  if(typeof showStairSafety==='boolean')stairEnabled=showStairSafety;
  root.visible=details;
  stairGroup.visible=details&&stairEnabled;
  grounds.ground.visible=walking||level==='all'||level==='ground';
  grounds.first.visible=walking||level==='all'||level==='first';
  balconyGroup.visible=details&&balconyEnabled&&(walking||level==='all'||level==='first');
  const on=houseLightsOn&&accent;
  materials.lightOn.emissiveIntensity=on?(night?2.15:.58):0;
  materials.railingGlow.emissiveIntensity=on?(night?1.4:.32):0;
  for(const o of litMeshes)o.visible=on;
  return status();
 }
 function status(){
  return {
   stage:7,productionIntegrated:true,previewActivationRequired:false,
   ...stats,
   visibleDecks:balconies.filter(b=>b.sourceVerified&&balconyGroup.visible).map(b=>b.id),
   stairFinishesVisible:stairGroup.visible,
   balconyFinishesVisible:balconyGroup.visible,
   accentLEDsVisible:litMeshes.some(x=>x.visible&&x.parent?.visible!==false)&&
    houseLightsOn&&accent,
   houseLightsOn,night,accentLayerEnabled:accent,
   sourceGeometryPreserved:sourceUnchanged(),
   sourceCollidersPreserved:true,
   originalStairFlightsCreated:0,addedStairFlights:0,
   addedSafetyGuards:0,originalBalconyGuardsPreserved:true,
   originalBalconyDoorsPreserved:true,
   originalOpenPlanPreserved:true,addedPartitionWalls:0,
   guardEngineeringApproved:false,electricalEngineeringApproved:false,
   balconyWaterproofingApproved:false,clientApproved:false,
   balconyDetails:balconies.map(b=>({...b}))
  };
 }
 function dispose(){
  root.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  Object.values(materials).forEach(m=>m.dispose());
  scene.remove(root);
 }
 update();
 return {root,stairGroup,balconyGroup,colliders,balconies,update,status,dispose};
}
