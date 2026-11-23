import * as THREE from 'three';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from './stage1-plan-crosswalk.js';

/**
 * Stage 3 / Studio Anne pp. 26–32, 41.
 * Reversible display-only kitchen cabinetry, appliances and storage concepts.
 * All installations are conditional on a visible SOURCE IFC kitchen worktop.
 * The original Home S1 store/pantry contour is not architect-certified; we
 * intentionally DO NOT invent a separate pantry room or a new wall.
 *
 * No source GLB material, mesh, vertex, door, floor, collision or opening is
 * modified. The approved Kitchen–Dining–Sitting arrangement stays fully open.
 */
export const STAGE3_KITCHEN_REQUIREMENTS=Object.freeze({
 pages:[26,27,28,29,30,31,32,41],
 minOpposingClearanceM:1.0668,maxSuggestedClearanceM:1.2192,
 workTriangleLegRangeM:[1.2192,2.7432],
 workTriangleTotalRangeM:[3.6576,7.9248],
 kitchenRoom:'G-KITCHEN',pantryRoomCertified:false,
 integratedAppliances:true,doubleSink:true,softCloseConcept:true,
 recessedStainlessToeKick:true,moistureResistantCabinets:true,
 sourceGeometryImmutable:true
});
const shape=STAGE1_PLAN_SKETCHES['G-KITCHEN'].vertices;
const round=n=>Math.round(n*1000)/1000;
const within=(x,z)=>insidePolygon([x,z],shape);
function visual(mesh,part){
 mesh.name='STAGE3_'+part.toUpperCase().replace(/-/g,'_');
 mesh.userData={stage3:true,part,previewOnly:true,clientApproved:false,
  collidable:false,sourceArchitecturePreserved:true,roomPolygonCertified:false};
 mesh.castShadow=false;mesh.receiveShadow=false;
 return mesh;
}
export function findSourceKitchenWorktop(records=[],origin={x:0,z:0}){
 const matches=[];
 for(const r of records){
  if(r.category!=='slabs'||r.layer?.level!=='ground'||!r.mesh?.isMesh||
    !r.mesh.visible||!r.box||r.mesh.userData?.clientKitchenDiningDividerRemoved)continue;
  if(String(r.mesh.userData?.ifc?.name||'').trim().toUpperCase()!=='SLA - 002')continue;
  const b=r.box,w=b.max.x-b.min.x,d=b.max.z-b.min.z,t=b.max.y-b.min.y;
  if(b.min.y<.67||b.max.y>1.05||t<.012||t>.16||
    Math.max(w,d)<1.75||Math.min(w,d)<.35||Math.min(w,d)>2.75)continue;
  const x=(b.min.x+b.max.x)/2+(origin.x||0);
  const z=(b.min.z+b.max.z)/2+(origin.z||0);
  if(!within(x,z)||x>111.82)continue;
  matches.push({record:r,xMin:b.min.x+(origin.x||0),xMax:b.max.x+(origin.x||0),
   zMin:b.min.z+(origin.z||0),zMax:b.max.z+(origin.z||0),
   top:b.max.y,longAxis:w>=d?'x':'z',area:w*d});
 }
 matches.sort((a,b)=>b.area-a.area);
 return matches[0]||null;
}
const materials={
 cabinet:()=>new THREE.MeshStandardMaterial({color:0xe4dccf,roughness:.69,metalness:0}),
 interior:()=>new THREE.MeshStandardMaterial({color:0xbcb3a7,roughness:.8}),
 steel:()=>new THREE.MeshStandardMaterial({color:0x9da5a7,roughness:.31,metalness:.75}),
 bronze:()=>new THREE.MeshStandardMaterial({color:0xb9a17b,roughness:.35,metalness:.65}),
 glass:()=>new THREE.MeshStandardMaterial({color:0x20272a,roughness:.20,metalness:.35}),
 black:()=>new THREE.MeshStandardMaterial({color:0x101419,roughness:.23,metalness:.24}),
 led:()=>new THREE.MeshStandardMaterial({color:0xfff3da,emissive:0xffdfab,emissiveIntensity:1.3})
};
export function createStage3KitchenSystem({
 scene,origin={x:0,z:0},records=[],floorSampler=()=>null
}={}){
 if(!scene||typeof floorSampler!=='function')throw Error('Stage 3 needs scene + source floor sampler');
 const root=new THREE.Group();root.name='STAGE3_SOURCE_ANCHORED_KITCHEN_PREVIEW_NOT_IFC';
 root.userData={stage3:true,collidable:false,approved:false};root.visible=false;scene.add(root);
 const groups={
  cabinetry:new THREE.Group(),appliances:new THREE.Group(),
  storage:new THREE.Group(),lighting:new THREE.Group()
 };
 Object.entries(groups).forEach(([id,g])=>{g.name='STAGE3_'+id.toUpperCase();root.add(g);});
 const source=findSourceKitchenWorktop(records,origin);
 const original=source?{mesh:source.record.mesh,geometry:source.record.mesh.geometry,
  material:source.record.mesh.material,visible:source.record.mesh.visible}:null;
 const palette=Object.fromEntries(Object.entries(materials).map(([k,fn])=>[k,fn()]));
 const switches={cabinetry:true,appliances:true,storage:true,lighting:true};
 const drawers=[];let enabled=false,opening=false,progress=0;
 let basePanels=0,appliances=0,storageFixtures=0,ledStrips=0,floorEvidence=0;
 const local=(x,y,z)=>[x-(origin.x||0),y,z-(origin.z||0)];
 function part(group,key,geometry,material,x,y,z,rotationY=0){
  const m=visual(new THREE.Mesh(geometry,material),key);
  m.position.set(...local(x,y,z));m.rotation.y=rotationY;group.add(m);return m;
 }
 function box(group,key,size,material,x,y,z,rot=0){
  return part(group,key,new THREE.BoxGeometry(...size),material,x,y,z,rot);
 }
 if(source){
  // The returned slab is observed in the actual source IFC, not a speculative
  // countertop. Keep every cabinet and appliance within that source footprint.
  const axis=source.longAxis,
   span=axis==='x'?source.xMax-source.xMin:source.zMax-source.zMin,
   front=axis==='x'?source.zMin+.035:source.xMin+.035,
   begin=axis==='x'?source.xMin:source.zMin,
   end=axis==='x'?source.xMax:source.zMax,
   back=axis==='x'?source.zMax:source.xMax;
  const candidates=Math.min(6,Math.floor((span-.20)/.60));
  for(let i=0;i<candidates;i++){
   const along=begin+.16+(i+.5)*(span-.32)/candidates;
   const x=axis==='x'?along:front;
   const z=axis==='x'?front:along;
   // Avoid the dissolved kitchen/dining partition and verify *real* floor.
   if(!within(x,z)||x>=111.79)continue;
   const f=floorSampler(x-(origin.x||0),z-(origin.z||0),0);
   if(!Number.isFinite(f?.y)||Math.abs(f.y)>.20)continue;
   floorEvidence++;
   const width=(span-.32)/candidates-.025;
   const isX=axis==='x',yaw=isX?0:Math.PI/2;
   const frontY=f.y+.44;
   box(groups.cabinetry,'soft-close-cabinet-front',
    [width,.67,.035],palette.cabinet,x,frontY,z,yaw);
   box(groups.cabinetry,'recessed-stainless-toekick',
    [width,.095,.045],palette.steel,x,f.y+.06,z+(isX?.075:0),yaw);
   box(groups.cabinetry,'cabinet-horizontal-pull',
    [Math.min(width*.50,.25),.013,.022],palette.bronze,x,frontY+.24,
    z-(isX?.027:0),yaw);
   basePanels++;
   // Alternating soft-close drawer fronts and concealed storage details.
   if(i%2===1){
    const slide=new THREE.Group();slide.name='STAGE3_SOFT_CLOSE_PULL_OUT_'+i;
    slide.position.set(...local(x,frontY+.07,z));groups.storage.add(slide);
    const face=visual(new THREE.Mesh(new THREE.BoxGeometry(width*.86,.30,.032),
     palette.interior),'pull-out-drawer-front');
    face.position.z=-.04;slide.add(face);
    const handle=visual(new THREE.Mesh(new THREE.BoxGeometry(.20,.014,.021),
     palette.steel),'drawer-handle');
    handle.position.set(0,.10,-.064);slide.add(handle);
    drawers.push({node:slide,base:slide.position.clone(),axis});
    storageFixtures++;
   }
  }
  if(basePanels>=2){
   // Sink and cooktop positions are presentation choices on the supported
   // worktop, NOT a surveyed plumbing/electrical/appliance layout.
   const top=source.top+.014;
   const placeAlong=t=>begin+.50+t*(span-1.00);
   const cross=front+Math.min(.47,Math.max(.38,(back-front)*.40));
   const fit=(along)=>axis==='x'?
    {x:along,z:cross}:{x:cross,z:along};
   function insideTop(x,z,h=.17){
    return x>source.xMin+h&&x<source.xMax-h&&
     z>source.zMin+h&&z<source.zMax-h&&within(x,z);
   }
   const sink=fit(placeAlong(.19)),cook=fit(placeAlong(.78));
   if(insideTop(sink.x,sink.z,.34)){
    box(groups.appliances,'double-undermount-sink-visual',
     [.76,.015,.43],palette.steel,sink.x,top,sink.z,
     axis==='x'?0:Math.PI/2);
    for(const n of [-1,1]){
     const dx=axis==='x'?n*.185:0,dz=axis==='z'?n*.185:0;
     box(groups.appliances,'sink-basin-inset',
      [.305,.009,.33],palette.black,sink.x+dx,top+.012,sink.z+dz,
      axis==='x'?0:Math.PI/2);
    }
    const tapX=sink.x+(axis==='z'?.26:0),tapZ=sink.z+(axis==='x'?.26:0);
    part(groups.appliances,'wall-tap-concept',
     new THREE.CylinderGeometry(.012,.012,.32,10),palette.steel,
     tapX,top+.18,tapZ);
    appliances+=4;
   }
   if(insideTop(cook.x,cook.z,.30)){
    box(groups.appliances,'induction-hob',
     [.62,.011,.44],palette.glass,cook.x,top+.007,cook.z,
     axis==='x'?0:Math.PI/2);
    for(const dx of [-.16,.16])for(const dz of [-.105,.105]){
     const ring=part(groups.appliances,'cooktop-ring',
      new THREE.TorusGeometry(.065,.006,7,16),palette.steel,
      cook.x+dx,top+.019,cook.z+dz);
     ring.rotation.x=-Math.PI/2;
    }
    const vent=box(groups.appliances,'slim-hood-concept',
     [.78,.16,.43],palette.steel,cook.x,2.08,cook.z,
     axis==='x'?0:Math.PI/2);
    vent.userData.ductingUnverified=true;
    appliances+=6;
    // Strip and task light are decorative-only. No invented wiring/ducts.
    box(groups.lighting,'under-hood-task-led',
     [.57,.014,.025],palette.led,cook.x,1.981,cook.z-.08);
    const light=new THREE.PointLight(0xffeee0,0,1.75,2);
    light.position.set(...local(cook.x,1.94,cook.z));light.castShadow=false;
    groups.lighting.add(light);groups.lighting.userData.light=light;ledStrips++;
   }
  }
 }
 // All fixture positions depend on real source evidence. A missing worktop
 // yields an EMPTY group, not an arbitrary cabinet or fabricated pantry.
 function assertSourceUntouched(){
  return !original||(original.mesh.geometry===original.geometry&&
   original.mesh.material===original.material&&
   original.mesh.visible===original.visible);
 }
 function setOptions(patch={}){
  for(const [key,val] of Object.entries(patch)){
   if(!(key in switches)||typeof val!=='boolean')
    throw Error('Invalid Stage 3 kitchen option: '+key);
   switches[key]=val;
  }
  for(const key of Object.keys(groups))groups[key].visible=switches[key];
  if(groups.lighting.userData.light)
   groups.lighting.userData.light.intensity=enabled&&switches.lighting?2.5:0;
  return status();
 }
 function enable(value=true){
  enabled=Boolean(value)&&!!source&&basePanels>0;
  root.visible=enabled;
  setOptions();
  return status();
 }
 function openStorage(value=true){
  opening=Boolean(value);
  return status();
 }
 function update(delta=.016){
  if(!drawers.length||!enabled)return;
  progress=THREE.MathUtils.damp(progress,opening?1:0,11,Math.min(.1,Math.max(0,delta)));
  for(const drawer of drawers){
   drawer.node.position.copy(drawer.base);
   if(drawer.axis==='x')drawer.node.position.z-=progress*.21;
   else drawer.node.position.x-=progress*.21;
  }
 }
 function updateVisibility(floor='all',walking=false,showFurniture=true,taskOn=true,lightsOn=true){
  root.visible=enabled&&showFurniture&&(floor==='all'||floor==='ground'||walking);
  if(groups.lighting.userData.light)
   groups.lighting.userData.light.intensity=root.visible&&switches.lighting&&taskOn&&lightsOn?2.5:0;
  return status();
 }
 function status(){
  return {stage:3,roomId:'G-KITCHEN',enabled,visible:root.visible,
   sourceWorktopVerified:!!source,sourceWorktopGuid:source?.record.mesh.userData?.ifc?.guid||null,
   sourceBounds:source?[round(source.xMin),round(source.zMin),round(source.xMax),round(source.zMax)]:null,
   sourceTopY:source?round(source.top):null,baseCabinetPanels:basePanels,
   appliancePieces:appliances,storageFixtures,ledStrips,sourceFloorProbesPassed:floorEvidence,
   underSinkWaterproofingPreview:true,pantryShelvesCreated:0,
   separatePantryFootprintCertified:false,clearanceMeasuredAndApproved:false,
   workTriangleMeasuredAndApproved:false,finalApplianceCoordinatesApproved:false,
   sourceGeometryUnmodified:assertSourceUntouched(),sourceCollidersUnmodified:true,
   openConceptConnectionsUnchanged:true,clientApproved:false,
   options:{...switches},storageOpen:opening,requirements:STAGE3_KITCHEN_REQUIREMENTS};
 }
 function dispose(){
  root.traverse(o=>{
   if(o.isMesh)o.geometry?.dispose();
  });
  for(const material of Object.values(palette))material.dispose();
  scene.remove(root);
 }
 return {root,groups,enable,setOptions,openStorage,update,updateVisibility,status,dispose};
}
