import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from './stage1-plan-crosswalk.js';

/**
 * Stage 5 — Studio Anne pp 12, 22-25. The bedroom presentation becomes a
 * permanent component of the house, not an opt-in staging tool.
 *
 * Fitted bed accents attach to the existing corridor-corrected IFC bed
 * replacements. Wardrobe facades attach only to a real, retained IFC wall.
 * Reading desk proposals require the floor and exclusion checks below.
 * No source architectural mesh, door or window is altered.
 */
export const STAGE5_SPEC=Object.freeze({
 pages:[12,22,23,24,25],
 planBedrooms:['G-BEDROOM','F-MASTER','F-BEDROOM-2','F-BEDROOM-3'],
 provisionalMaid:'G-MAID',
 readingRoom:'F-READING',
 fullHeightCloset:"source wall-mounted facade only; final wardrobe depth pending survey",
 requireSourceForEveryPiece:true,masterWalkInPolygonCertified:false,
 preserveDoorAndBalconyAccess:true,clientApproved:false
});
const ROOMS=Object.freeze({
 'G-BEDROOM':'ground',
 'F-MASTER':'first','F-BEDROOM-2':'first','F-BEDROOM-3':'first',
 'F-READING':'first'
});
const p=id=>STAGE1_PLAN_SKETCHES[id]?.vertices;
const near=(a,b)=>Math.abs(a-b)<1e-5;
function inside(id,x,z,inset=0){
 const poly=p(id);if(!poly||!insidePolygon([x,z],poly))return false;
 if(inset<=0)return true;
 return [[-1,-1],[-1,1],[1,-1],[1,1]].every(([a,b])=>
  insidePolygon([x+a*inset,z+b*inset],poly));
}
function intersectsXZ(a,b,margin=0){
 return a.min.x<b.max.x+margin&&a.max.x>b.min.x-margin&&
  a.min.z<b.max.z+margin&&a.max.z>b.min.z-margin;
}
function mats(){
 const make=(color,roughness=.77,metalness=0,emissive=null)=>
  new THREE.MeshStandardMaterial({color,roughness,metalness,
   ...(emissive?{emissive,emissiveIntensity:.10}:{})});
 return {
  cream:make(0xe8ded1,.88),walnut:make(0x81644b,.62),
  taupe:make(0xa9988b,.92),linen:make(0xf2ece2,1),
  green:make(0x7b8c79,.92),brass:make(0xbc9c69,.35,.7),
  stone:make(0xc2b6a7,.84),rug:make(0xc3b7a5,1),
  dark:make(0x6c5549,.7),glass:make(0xb8c5bc,.28,.31),
  led:make(0xffefca,.45,0,0xffd49a)
 };
}
function visual(mesh,tag){
 mesh.name='STAGE5_'+tag.replace(/[^a-z0-9-]/gi,'_').toUpperCase();
 mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData={stage5:true,part:tag,sourcePreserving:true,
  architectCertified:false,clientApproved:false,collidable:false};
 return mesh;
}
export function createStage5BedroomsStudy({
 scene,origin={x:0,z:0},records=[],
 bedSystem,doorSystem,floorSampler=()=>null
}={}){
 if(!scene||!Array.isArray(bedSystem?.visualBeds)||!bedSystem?.group||
   typeof floorSampler!=='function')
  throw Error('Stage 5 needs existing IFC-derived styled bedroom system and a real floor sampler');
 const all=bedSystem.visualBeds;
 const srcSnapshot=records.map(r=>({
  mesh:r.mesh,geometry:r.mesh?.geometry,material:r.mesh?.material,
  position:r.mesh?.position.clone(),scale:r.mesh?.scale.clone(),
  visible:r.mesh?.visible
 }));
 const sourceUnchanged=()=>srcSnapshot.every(r=>r.mesh?.geometry===r.geometry&&
  r.mesh?.material===r.material&&r.mesh?.position.equals(r.position)&&
  r.mesh?.scale.equals(r.scale));
 const root=new THREE.Group();root.name='STAGE5_INTEGRATED_BEDROOMS_WARDROBES_STUDY';
 root.userData={stage5:true,productionIntegrated:true,sourceUnchanged:true};
 scene.add(root);
 const material=mats(),groups={};
 for(const id of [...Object.keys(ROOMS),'BED-ATTACHED']){
  const g=new THREE.Group();g.name='STAGE5_'+id.replace(/-/g,'_');
  root.add(g);groups[id]=g;
 }
 const attached=[],lights=[],colliders=[],roomResults={},skips={};
 let finishedBeds=0,headboardLights=0,bedsideShelves=0,wallArt=0,bedRugs=0;
 let wardrobeFaces=0,wardrobeRooms=0,studyDesk=0,studyShelves=0,studyChair=0;
 let floorProbes=0;
 const loc=(x,y,z)=>[x-(origin.x||0),y,z-(origin.z||0)];
 const global=(x,z)=>[x+(origin.x||0),z+(origin.z||0)];
 const floor=(id,x,z,inset=.13)=>{
  const level=ROOMS[id];if(!level||!inside(id,x,z,inset))return null;
  const datum=level==='first'?3.3:0;
  const f=floorSampler(x-(origin.x||0),z-(origin.z||0),datum);
  if(!Number.isFinite(f?.y)||Math.abs(f.y-datum)>.19)return null;
  floorProbes++;return f.y;
 };
 function piece(group,tag,geo,mat,x,y,z,angle=0){
  const o=visual(new THREE.Mesh(geo,mat),tag);
  o.position.set(x,y,z);o.rotation.y=angle;group.add(o);
  return o;
 }
 const round=(g,t,dim,r,m,x,y,z,a=0)=>
  piece(g,t,new RoundedBoxGeometry(...dim,3,r),m,x,y,z,a);
 const cylinder=(g,t,rad,height,m,x,y,z)=>
  piece(g,t,new THREE.CylinderGeometry(rad,rad,height,18),m,x,y,z);
 function nearestDoor(x,z,level){
  const list=doorSystem?.doors??[];
  return list.some(d=>d.level===level&&!d.removedFromPlan&&
   Math.hypot(x-(d.position.x+(origin.x||0)),z-(d.position.z+(origin.z||0)))<1.08);
 }
 function vacantBox(id,box,ignore=[],extra=.09){
  const level=ROOMS[id];
  if(!level)return false;
  const obstructed=records.some(r=>{
   if(!r.box||ignore.includes(r)||!r.mesh||r.layer?.level!==level)return false;
   if(!['furniture','proxies','windows','doors'].includes(r.category))return false;
   if(bedSystem.sources.includes(r))return false; // use the relocated display bed instead
   return intersectsXZ(box,r.box,extra)&&r.box.max.y>box.min.y+.1 &&
     r.box.min.y<box.max.y-.10;
  });
  if(obstructed)return false;
  return !(bedSystem.collisionBoxes??[]).some(b=>intersectsXZ(box,b,extra));
 }
 function rect(x,z,w,d,y,h){
  return new THREE.Box3(
   new THREE.Vector3(x-(origin.x||0)-w/2,y,z-(origin.z||0)-d/2),
   new THREE.Vector3(x-(origin.x||0)+w/2,y+h,z-(origin.z||0)+d/2));
 }
 function addRug(id,x,z,w,d,y){
  const poly=p(id);
  if(!poly||![[1,1],[-1,1],[1,-1],[-1,-1]].every(([a,b])=>
   insidePolygon([x+a*(w/2+.04),z+b*(d/2+.04)],poly)))return false;
  round(groups[id],'woven-bed-rug',[w,.021,d],.055,material.rug,
   ...loc(x,y+.025,z));
  round(groups[id],'rug-inlay',[w-.14,.003,d-.14],.05,material.linen,
   ...loc(x,y+.039,z));
  return true;
 }
 // Existing styled beds already include a realistic frame, bedding and
 // pillows; decorate those rather than making competing second beds.
 for(const bed of all){
  if(!bed.visible||!bed.userData?.sourceGuid||!bed.userData?.footprint_m)continue;
  const [x,z]=global(bed.position.x,bed.position.z);
  const id=Object.keys(ROOMS).find(k=>k!=='F-READING'&&
   ROOMS[k]===bed.userData.floor&&inside(k,x,z,.08));
  if(!id){
   skips['bed-'+bed.userData.sourceGuid]='Bed lies outside S1 provisional room or unverified maid outline';
   continue;
  }
  const [w,l]=bed.userData.footprint_m;
  // Do not move a bed or change its collider — only attach contained trims.
  const g=new THREE.Group();g.name='STAGE5_BED_ACCENTS_'+bed.userData.sourceGuid;
  bed.add(g);attached.push({bed,child:g});
  const back=-(l/2+.115);
  round(g,'upholstered-headboard-linen-inlay',[Math.max(.4,w*.71),.26,.03],
   .013,material.taupe,0,1.01,back-.01);
  round(g,'warm-headboard-led',[Math.max(.30,w*.78),.012,.022],
   .005,material.led,0,1.166,back-.03);
  const strip=new THREE.PointLight(0xffd9a4,0,1.75,2);
  strip.position.set(0,1.14,back-.08);strip.castShadow=false;g.add(strip);
  lights.push({light:strip,level:ROOMS[id],type:'accent',room:id});
  finishedBeds++;headboardLights++;
  // Nightstands have slim shelves flush with the source bed footprint;
  // unverified extra floor space and balcony approaches are not occupied.
  for(const side of [-1,1]){
   const px=side*Math.max(.24,w*.37);
   round(g,'floating-bedside-tray',[Math.max(.20,w*.18),.045,.32],
    .014,material.walnut,px,.54,back+.18);
   const led=round(g,'bedside-under-tray-led',[Math.max(.18,w*.15),.010,.19],
    .003,material.led,px,.501,back+.18);
   led.userData.layer='task';
   bedsideShelves++;
  }
  // A restrained textile wall feature above the pillow line, attached to
  // the real bed assembly, not a new unsupported structural wall.
  round(g,'headboard-art-panel',[Math.max(.36,w*.44),.19,.018],
   .009,material.cream,0,1.44,back-.015);
  wallArt++;
  // source-floor rug is independent, thin and non-colliding.
  const f=floor(id,x,z);
  if(f!==null&&addRug(id,x,z,Math.min(2.4,w+.48),Math.min(2.65,l+.40),f))
   bedRugs++;
  roomResults[id]=(roomResults[id]??0)+1;
 }
 // Wardrobe facades: thin full-height coordinated fronts fixed over a REAL
 // source IFC wall, NOT a fabricated walk-in closet or new partition.
 const hiddenSource=r=>r.mesh?.userData?.clientKitchenDiningDividerRemoved||
  r.mesh?.userData?.clientOpenPlanPartitionRemoved||
  r.mesh?.userData?.clientStairSittingWallRemoved||
  r.mesh?.userData?.clientKitchenStairPartitionRemoved||
  r.mesh?.userData?.facadeDuplicateHidden;
 const wallCandidates=(id)=>{
  const level=ROOMS[id],datum=level==='first'?3.3:0;
  return records.filter(r=>{
   if(r.category!=='walls'||r.layer?.level!==level||!r.box||!r.mesh||
    hiddenSource(r)||!r.mesh.visible)return false;
   const b=r.box,w=b.max.x-b.min.x,d=b.max.z-b.min.z,h=b.max.y-b.min.y;
   if(h<2.28||b.max.y<datum+2.28||b.min.y>datum+.15)return false;
   const axis=w>d?'x':'z',span=Math.max(w,d),thick=Math.min(w,d);
   if(span<1.4||span>8.5||thick>.50)return false;
   const c=b.getCenter(new THREE.Vector3()),[x,z]=global(c.x,c.z);
   return inside(id,x,z,.09)||inside(id,x,z,0);
  }).sort((a,b)=>{
   const len=r=>Math.max(r.box.max.x-r.box.min.x,r.box.max.z-r.box.min.z);
   return len(a)-len(b);
  });
 };
 for(const id of STAGE5_SPEC.planBedrooms){
  const level=ROOMS[id];if(!level)continue;
  let chosen=null;
  for(const record of wallCandidates(id)){
   const b=record.box;const w=b.max.x-b.min.x,d=b.max.z-b.min.z;
   const axis=w>d?'x':'z',span=Math.min(1.48,Math.max(1.08,Math.max(w,d)-.50));
   const c=b.getCenter(new THREE.Vector3()),[cx,cz]=global(c.x,c.z);
   for(const sign of [-1,1]){
    const x=cx+(axis==='z'?sign*(w/2+.045):0);
    const z=cz+(axis==='x'?sign*(d/2+.045):0);
    const depth=.06;
    const safety=axis==='x'?rect(x,z,span,depth,level==='first'?3.35:.05,2.35)
      :rect(x,z,depth,span,level==='first'?3.35:.05,2.35);
    // A facade must be attached to the actual wall face and cannot cover
    // an opening, door, bedroom bed or another source piece.
    if(!inside(id,x,z,.02)||nearestDoor(x,z,level)||
     !vacantBox(id,safety,[record],.12))continue;
    const f=floor(id,x,z,.02);
    if(f===null)continue;
    chosen={x,z,span,axis,wall:record,f};break;
   }
   if(chosen)break;
  }
  if(!chosen){skips['wardrobe-'+id]='No source-confirmed uninterrupted wall/clear floor; do not invent closets';continue;}
  const {x,z,span,axis,wall,f}=chosen;
  const g=groups[id],angle=axis==='x'?0:Math.PI/2;
  for(const i of [-1,1]){
   const along=i*span/4;
   const px=x+(axis==='x'?along:0),pz=z+(axis==='z'?along:0);
   round(g,'full-height-concealed-wardrobe-front',
    [span/2-.025,2.32,.035],.012,material.cream,
    ...loc(px,f+1.23,pz),angle);
   round(g,'vertical-walnut-wardrobe-trim',
    [.032,2.22,.040],.009,material.walnut,
    ...loc(px+(axis==='x'?i*(span/4-.06):0),f+1.24,
      pz+(axis==='z'?i*(span/4-.06):0)),angle);
   round(g,'brushed-brass-wardrobe-pull',[.018,.27,.034],
    .006,material.brass,...loc(px,f+1.24,pz),angle);
   wardrobeFaces++;
  }
  round(g,'concealed-overhead-bulk-storage',
   [span,.26,.035],.010,material.walnut,
   ...loc(x,f+2.54,z),angle);
  wardrobeRooms++;
  roomResults[id]=(roomResults[id]??0)+1;
 }
 // The original S1 *walk-in closet* contours are not certified. A facade
 // against a source bedroom wall is NOT mislabeled as a built closet room.
 // No wardrobes added to low-confidence maid outlines.

 // F-READING: slim wall-side floating-look desk, only on verified real floor
 // and with no source doors, furnishings, bed, or windows in its footprint.
 const id='F-READING';
 const studyProposals=[
  [107.18,-4.47],[107.54,-4.52],[108.10,-4.58],[108.66,-4.43],
  [108.95,-4.48],[107.75,-4.07],[108.38,-4.06]
 ];
 let spot=null;
 for(const [x,z] of studyProposals){
  const f=floor(id,x,z,.64);
  if(f===null||nearestDoor(x,z,'first'))continue;
  const footprint=rect(x,z,1.15,.53,f+.08,.98);
  if(!vacantBox(id,footprint,[],.27))continue;
  // Ensure source floor also exists at both desk outer corners.
  if(floor(id,x-.5,z-.2,.08)===null||floor(id,x+.5,z+.2,.08)===null)
   continue;
  spot={x,z,f};break;
 }
 if(spot){
  const {x,z,f}=spot,g=groups[id];
  const desk=new THREE.Group();desk.name='STAGE5_READING_WALL_SIDE_DESK';
  desk.position.set(...loc(x,f,z));g.add(desk);
  round(desk,'floating-desk-walnut-top',[1.15,.055,.53],.035,
   material.walnut,0,.75,0);
  for(const dx of [-.49,.49]){
   round(desk,'reading-desk-slim-brass-support',[.034,.70,.035],
    .009,material.brass,dx,.36,-.17);
  }
  round(desk,'desk-hidden-storage-drawer',[.77,.12,.37],.025,
   material.stone,0,.65,.01);
  studyDesk++;
  // Slender shelving rises from desk's own supports, not a new wall,
  // and stays entirely within its safe verified footprint.
  for(let i=0;i<3;i++){
   round(desk,'reading-shelf',[1.08,.035,.18],.008,
    material.cream,0,1.14+i*.29,-.16);
   studyShelves++;
  }
  round(desk,'reading-task-led',[.53,.012,.022],.005,
   material.led,0,1.68,-.17);
  const task=new THREE.PointLight(0xffefd9,0,1.85,2);
  task.position.set(0,1.59,.01);task.castShadow=false;desk.add(task);
  lights.push({light:task,level:'first',type:'task',room:id});
  // Proper first-person obstacle: table only, not lamps/near-floor rug.
  desk.updateWorldMatrix(true,true);
  colliders.push({
   mesh:desk.children[0],box:new THREE.Box3().setFromObject(desk),
   category:'furniture',layer:{level:'first',name:'Stage 5 reading furniture'}
  });
  roomResults[id]=1;
 }else skips.study='Reading room floor or safe desk approach unverified; no fake desk placed';
 let on=true,night=false,lightsOn=true,layers={ambient:true,task:true,accent:true};
 let level='all',walk=false,furnitureVisible=true;
 function update({floor:fl,walking,furnitureVisible:vis,
  night:n,enabled,lightLayers}={}){
  if(typeof fl==='string')level=fl;
  if(typeof walking==='boolean')walk=walking;
  if(typeof vis==='boolean')furnitureVisible=vis;
  if(typeof n==='boolean')night=n;
  if(typeof enabled==='boolean')lightsOn=enabled;
  if(lightLayers)layers={...layers,...lightLayers};
  root.visible=furnitureVisible;
  for(const [id,g] of Object.entries(groups)){
   g.visible=furnitureVisible&&(walk||level==='all'||
    (id==='BED-ATTACHED'?true:ROOMS[id]===level));
  }
  for(const [id,g] of Object.entries(groups)){
   if(id==='BED-ATTACHED')continue;
   if(!g.visible)continue;
  }
  for(const a of attached){
   const id=Object.keys(ROOMS).find(k=>k!=='F-READING'&&
    ROOMS[k]===a.bed.userData.floor&&inside(k,...global(a.bed.position.x,a.bed.position.z)));
   a.child.visible=furnitureVisible&&(walk||level==='all'||ROOMS[id]===level);
  }
  for(const o of lights)
   o.light.intensity=furnitureVisible&&lightsOn&&layers[o.type]&&
    (walk||level==='all'||o.level===level)?(night?2:.45):0;
  return status();
 }
 function status(){
  return {
   stage:5,productionIntegrated:true,previewActivationRequired:false,
   originalIFCGeometryPreserved:sourceUnchanged(),
   sourceCollidersPreserved:true,
   sourceBedCount:all.length,sourceSupportedBedsFinished:finishedBeds,
   headboardMoodLightStrips:headboardLights,
   integratedBedsideShelves:bedsideShelves,
   bedroomAccentArt:wallArt,bedroomRugs:bedRugs,
   wardrobePanels:wardrobeFaces,wardrobeRooms,
   freeStandingWardrobeEnclosuresCreated:0,walkInClosetGeometryInvented:false,
   readingDesks:studyDesk,readingShelves:studyShelves,readingChairs:studyChair,
   sourceFloorProbesPassed:floorProbes,sourceFurnitureUnchanged:true,
   sourceDoorAndWindowMeshesUnchanged:true,
   addedPartitionWalls:0,addedDoors:0,
   bedroomRoomPolygonsCertified:false,finalDesignApproved:false,
   roomsEnhanced:{...roomResults},skipped:{...skips},
   sourcePlanBedroomCount:4,maidProvisionalUntouched:true
  };
 }
 function dispose(){
  for(const {bed,child} of attached){
   child.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
   bed.remove(child);
  }
  root.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  Object.values(material).forEach(m=>m.dispose());
  scene.remove(root);
 }
 update();
 return {root,groups,colliders,update,status,dispose};
}
