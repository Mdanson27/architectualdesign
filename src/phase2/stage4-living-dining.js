import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from './stage1-plan-crosswalk.js';
import {DINING_TABLE_WORLD} from './dining-furnishings.js';
import {createFurnitureAsset,fitFurnitureEnvelope} from './phase14-furniture-library.js';
import {installFittedAsset,faceTarget,facingDot} from './phase14abc-integration.js';

/**
 * STAGE 4 — Studio Anne pp. 10, 13–21.
 * This is installed in the default completed house, NOT an opt-in sample.
 * Fitted decorations enhance source-supported dining, living and entrance
 * spaces without changing a single IFC element, opening, door or window.
 *
 * Model dimensions/colourway are design proposals requiring client approval.
 * Source plans have preliminary polygons; no construction approval implied.
 */
export const STAGE4_BRIEF=Object.freeze({
 pages:[10,13,14,15,16,17,18,19,20,21],
 rooms:['G-SITTING','G-DINING','F-FAMILY'],
 entryDoor:27,entryFinish:'SW-022 source-confirmed main entrance',
 openPlan:true,
 sittingRoom:'generous circulation, deep sofa, conversational accent seating, area rug, softened coffee table, side table',
 diningRoom:'six seats, sculptural wood tabletop, coordinated upholstery, tableware, source-aligned 2700K pendant',
 entry:'wall detail beside the source main door; ottoman reserved until doorway clearance is dimensioned',
 familyRoom:'source-anchored sofa and coffee table with warm rug and sculptural side lighting',
 sourceMeshesModified:false,sourceCollisionPreserved:true,
 clientApproval:false
});
const roomPoly=id=>STAGE1_PLAN_SKETCHES[id]?.vertices;
const inside=(id,x,z,margin=0)=>{
 const p=roomPoly(id);if(!p||!insidePolygon([x,z],p))return false;
 if(!margin)return true;
 for(const dx of [-margin,margin])for(const dz of [-margin,margin])
  if(!insidePolygon([x+dx,z+dz],p))return false;
 return true;
};
const toNumber=x=>Math.round(x*1000)/1000;
function palette(){
 return {
  timber:new THREE.MeshStandardMaterial({color:0x745742,roughness:.60,metalness:.03}),
  walnut:new THREE.MeshStandardMaterial({color:0x4d352b,roughness:.57}),
  cream:new THREE.MeshStandardMaterial({color:0xeee5d9,roughness:.91}),
  taupe:new THREE.MeshStandardMaterial({color:0xa99888,roughness:.92}),
  sage:new THREE.MeshStandardMaterial({color:0x788772,roughness:.95}),
  ivory:new THREE.MeshStandardMaterial({color:0xdad2c4,roughness:1}),
  rug:new THREE.MeshStandardMaterial({color:0xbdb3a5,roughness:1}),
  rugBorder:new THREE.MeshStandardMaterial({color:0xe4d8c6,roughness:1}),
  bronze:new THREE.MeshStandardMaterial({color:0xbaa079,roughness:.38,metalness:.68}),
  stone:new THREE.MeshStandardMaterial({color:0xcfc6bc,roughness:.59}),
  ceramic:new THREE.MeshStandardMaterial({color:0xf0e5d7,roughness:.31}),
  lamp:new THREE.MeshStandardMaterial({color:0xffe4b9,emissive:0xffce88,emissiveIntensity:.28,roughness:.75}),
  mirror:new THREE.MeshStandardMaterial({color:0xc3d5d2,metalness:.76,roughness:.11}),
  textile:new THREE.MeshStandardMaterial({color:0x8c7563,roughness:1})
 };
}
function visual(mesh,tag){
 mesh.name='STAGE4_'+tag.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
 mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData={stage4:true,component:tag,architectApproved:false,
  visualizationOnly:true,planPolygonCertified:false,sourceGeometryUnchanged:true};
 return mesh;
}
export function createStage4LivingDining({
 scene,origin={x:0,z:0},records=[],
 sofaSystem,diningSystem,mainDoorEnclosure,
 floorSampler=()=>null
}={}){
 if(!scene||!sofaSystem?.colliders||!diningSystem?.root)
  throw Error('Stage 4 requires existing IFC-derived sitting and six-seat dining systems');
 const local=(x,y,z)=>[x-(origin.x||0),y,z-(origin.z||0)];
 const global=pos=>[pos.x+(origin.x||0),pos.z+(origin.z||0)];
 const root=new THREE.Group();
 root.name='STAGE4_COMPLETE_LIVING_DINING_ENTRY';root.userData.stage4=true;
 scene.add(root);
 const groups={
  'G-SITTING':new THREE.Group(),
  'G-DINING':new THREE.Group(),
  'F-FAMILY':new THREE.Group(),
  'ENTRY':new THREE.Group()
 };
 for(const [id,g] of Object.entries(groups)){
  g.name='STAGE4_'+id.replace(/-/g,'_');g.userData.stage4Room=id;root.add(g);
 }
 const mats=palette(),colliders=[],phase14Placements=[],revertDining=[],diningOrientation=[];
 const pieces={groundRug:0,sittingCoffeeTable:0,existingSourceCoffeeTables:0,sittingChairs:0,sittingSideTables:0,
  sofaCushions:0,firstFloorRug:0,familyAccent:0,diningRug:0,diningChairsImproved:0,
  diningTabletop:0,diningPlaceSettings:0,foyerMirror:0,foyerShelf:0,accentLights:0};
 const originalSources=records.map(r=>({
  ref:r.mesh,geometry:r.mesh?.geometry,position:r.mesh?.position.clone(),
  scale:r.mesh?.scale.clone()
 }));
 const defaultSourceCondition=()=>originalSources.every(r=>r.ref?.geometry===r.geometry&&
  r.ref?.position.equals(r.position)&&r.ref?.scale.equals(r.scale));
 const skip={};
 function piece(room,tag,geometry,material,x,y,z,angle=0){
  const o=visual(new THREE.Mesh(geometry,material),tag);
  o.position.set(...local(x,y,z));o.rotation.y=angle;
  groups[room].add(o);
  return o;
 }
 function rounded(room,tag,size,r,material,x,y,z,angle=0){
  return piece(room,tag,new RoundedBoxGeometry(...size,2,r),material,x,y,z,angle);
 }
 function cylinder(room,tag,r1,r2,h,mat,x,y,z){
  return piece(room,tag,new THREE.CylinderGeometry(r1,r2,h,20),mat,x,y,z);
 }
 function getFloor(id,x,z){
  const datum=id==='F-FAMILY'?3.3:0;
  if(!inside(id,x,z,.15))return null;
  const point=floorSampler(x-(origin.x||0),z-(origin.z||0),datum);
  return Number.isFinite(point?.y)&&Math.abs(point.y-datum)<.20?point.y:null;
 }
 function nearDoor(x,z,level,minDistance=1.05){
  // The source double entrance is fixed at world (117.014,-3.496).
  if(level==='ground'&&Math.hypot(x-117.014,z+3.496)<minDistance)return true;
  return false;
 }
 function furnitureIntersects(room,box,exclude=[]){
  return records.some(r=>{
   if(r.category!=='furniture'||r.layer?.level!==(room==='F-FAMILY'?'first':'ground')||
     !r.box||!r.mesh?.visible||exclude.includes(r))return false;
   // Source sofas moved by the already-approved furniture layer are hidden;
   // do not confuse their old IFC bounding volumes with real furniture.
   if(sofaSystem.sourceSet?.has(r)||diningSystem.sourceSet?.has(r))return false;
   return box.clone().expandByScalar(.12).intersectsBox(r.box);
  })||sofaSystem.colliders.some(r=>r.layer.level===(room==='F-FAMILY'?'first':'ground')&&
    box.clone().expandByScalar(.10).intersectsBox(r.box));
 }
 function allowPlacement(room,x,z,w,d,floorY,{distance=1.05,checkFurniture=true}={}){
  if(!inside(room,x,z,Math.max(w,d)/2+.08)||nearDoor(x,z,room==='F-FAMILY'?'first':'ground',distance))
   return false;
  if(!checkFurniture)return true;
  const b=new THREE.Box3(new THREE.Vector3(x-w/2-(origin.x||0),floorY+.03,z-d/2-(origin.z||0)),
   new THREE.Vector3(x+w/2-(origin.x||0),floorY+1.4,z+d/2-(origin.z||0)));
  return !furnitureIntersects(room,b);
 }
 function recordCollider(group,room,tag,conservativeBox=null){
  group.updateWorldMatrix(true,true);
  const box=conservativeBox??new THREE.Box3().setFromObject(group);
  const mesh=group.children.find(o=>o.isMesh);
  if(!mesh||box.isEmpty())return;
  const rec={mesh:group.children[0],box,category:'furniture',
   layer:{level:room==='F-FAMILY'?'first':'ground',name:'STAGE4_PRODUCTION_FURNITURE'}};
  colliders.push(rec);
 }
 function stage4Rug(room,x,z,width,depth,y,kind){
  const inset=.08;
  const poly=roomPoly(room);
  if(!poly||[[-1,-1],[-1,1],[1,-1],[1,1]].some(([a,b])=>
   !insidePolygon([x+a*(width/2+.035),z+b*(depth/2+.035)],poly)))return false;
  rounded(room,kind+'-area-rug',[width,.023,depth],.09,mats.rug,x,y+.022,z);
  rounded(room,kind+'-rug-inner',[width-.14,.004,depth-.14],.05,mats.ivory,x,y+.036,z);
  // Subtle low-profile border with two weave-tones; no raised walk obstacle.
  rounded(room,kind+'-border',[width-.26,.003,depth-.26],.03,mats.rugBorder,x,y+.04,z);
  rounded(room,kind+'-center',[width-.32,.003,depth-.32],.03,mats.ivory,x,y+.042,z);
  return true;
 }
 function makeAccentChair(x,z,y,angle,name){
  const id='G-SITTING';const group=new THREE.Group();
  group.name='STAGE4_SEPARATE_ACCENT_CHAIR_'+name;
  group.position.set(...local(x,y,z));group.rotation.y=angle;groups[id].add(group);
  // Replace the existing procedural chair parts in-place. Keep the prior
  // footprint/height, position, rotation and collision envelope.
  const asset=createFurnitureAsset('sculptural-accent-chair',{materials:mats});
  fitFurnitureEnvelope(asset,new THREE.Vector3(-.40,0,-.36),new THREE.Vector3(.40,.94,.38));
  for(const mesh of [...asset.children]){
   const tag=mesh.userData.component;
   visual(mesh,tag);mesh.userData.phase14Asset='sculptural-accent-chair';
   group.add(mesh);
  }
  group.userData.phase14Asset='sculptural-accent-chair';
  group.updateWorldMatrix(true,true);
  const envelope=new THREE.Box3(new THREE.Vector3(-.40,0,-.36),new THREE.Vector3(.40,1.175,.38)).applyMatrix4(group.matrixWorld);
  const rendered=new THREE.Box3().setFromObject(group,true),eps=.0001;
  const floorCorners=[];
  for(const xx of [rendered.min.x,rendered.max.x])for(const zz of [rendered.min.z,rendered.max.z]){
   const worldX=xx+(origin.x||0),worldZ=zz+(origin.z||0),support=floorSampler(xx,zz,0);
   floorCorners.push({worldX,worldZ,floorY:support?.y??null,insideProvisionalRoom:inside(id,worldX,worldZ)});
  }
  const within=envelope.clone().expandByScalar(eps).containsBox(rendered);
  const supported=floorCorners.every(p=>p.insideProvisionalRoom&&Number.isFinite(p.floorY)&&Math.abs(p.floorY-y)<=.08);
  // Never accept a replacement outside the former collision bounds or on
  // unsupported floor. Refuse instead of inventing a new coordinate.
  if(!within||!supported){groups[id].remove(group);group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return false;}
  recordCollider(group,id,name,envelope);
  phase14Placements.push({assetId:'sculptural-accent-chair',name,room:id,worldPosition:[x,y,z],rotationY:angle,
   renderedBounds:{min:rendered.min.toArray(),max:rendered.max.toArray()},retainedCollider:{min:envelope.min.toArray(),max:envelope.max.toArray()},
   floorCorners,withinPriorEnvelope:within,floorSupported:supported,provisionalRoom:true,clientApproved:false});
  return true;
 }
 function tinySideTable(id,x,z,y,tag,diam=.36){
  const group=new THREE.Group();group.name='STAGE4_SIDE_TABLE_'+tag;
  group.position.set(...local(x,y,z));groups[id].add(group);
  const base=visual(new THREE.Mesh(new THREE.CylinderGeometry(.07,.16,.49,20),mats.walnut),'table-pedestal');
  base.position.y=.28;group.add(base);
  const top=visual(new THREE.Mesh(new THREE.CylinderGeometry(diam/2,diam/2,.048,32),mats.stone),'rounded-side-table');
  top.position.y=.55;group.add(top);
  recordCollider(group,id,tag);
 }
 // -- Dining: enhance the EXISTING source-grounded 6-seat set, not duplicate it.
 const dining=diningSystem.root;
 const diningTable=dining.children.find(o=>o.name==='REAL_3D_DINING_TABLE');
 if(diningTable){
  const [wx,,wz]=DINING_TABLE_WORLD;
  // Replace the generated table and chairs rather than adding shells on
  // top. The old footprints and collision records remain authoritative.
  revertDining.push(installFittedAsset(diningTable,'sculptural-dining-table',[-1.085,0,-.55],[1.085,.81,.55],{mark:visual,materials:mats}));
  pieces.diningTabletop++;
  const settings=[[-.60,-.24],[.60,-.24],[-.60,.24],[.60,.24],[-.88,0],[.88,0]];
  for(const [dx,dz] of settings){
   cylinder('G-DINING','glazed-table-place-setting',.095,.095,.008,mats.ceramic,wx+dx,.815,wz+dz);pieces.diningPlaceSettings++;
  }
  for(const chair of dining.children.filter(o=>/^DINING_CHAIR_[1-6]$/.test(o.name))){
   const x=chair.position.x,z=chair.position.z;
   // Face the tabletop directly along the original chair axis; diagonal
   // rotation would enlarge the existing clearance envelope.
   const target=Math.abs(z)>.5?[x,0]:[0,z];
   const yaw=faceTarget(x,z,...target);
   // Existing dining rotations already face the table; enforce the contract.
   chair.rotation.y=yaw;
   revertDining.push(installFittedAsset(chair,'curved-dining-chair',[-.26,0,-.255],[.26,.99,.2575],{mark:visual,materials:mats}));
   diningOrientation.push({name:chair.name,dot:facingDot(yaw,x,z,...target)});
   pieces.diningChairsImproved++;
  }
  if(getFloor('G-DINING',wx,wz)!==null&&
     stage4Rug('G-DINING',wx,wz,3.32,2.04,0,'dining')){
    pieces.diningRug++;
  }
 }else skip.dining='Six-chair dining source group not loaded';

 // -- Ground Sitting: use the existing corrected IFC sofa position.
 const ground=sofaSystem.colliders.find(o=>o.layer?.level==='ground');
 if(ground){
  const box=ground.box,center=box.getCenter(new THREE.Vector3());
  const [sx,sz]=global(center);
  const y=getFloor('G-SITTING',sx,sz);
  if(y!==null){
   // Prefer enhancing an actual pre-existing FU-008 source coffee table
   // rather than placing a second table on top of it. Exactly one table
   // becomes part of the designed living room.
   const groundedSourceTable=records.find(r=>{
    if(r.category!=='furniture'||r.layer?.level!=='ground'||!r.mesh?.visible||
      sofaSystem.sourceSet?.has(r)||diningSystem.sourceSet?.has(r)||
      String(r.mesh.userData?.ifc?.name||'').trim().toUpperCase()!=='FU - 008')return false;
    const c=r.box.getCenter(new THREE.Vector3()),szr=r.box.getSize(new THREE.Vector3());
    const [x,z]=global(c);
    return inside('G-SITTING',x,z,.30)&&
      Math.hypot(x-sx,z-sz)<3.5&&
      szr.x>.45&&szr.z>.30&&szr.x<1.8&&szr.z<1.5&&
      r.box.max.y-y>.27&&r.box.max.y-y<.89;
   });
   if(groundedSourceTable){
    const c=groundedSourceTable.box.getCenter(new THREE.Vector3());
    const dims=groundedSourceTable.box.getSize(new THREE.Vector3());
    const [x,z]=global(c);
    rounded('G-SITTING','existing-ifc-coffee-table-stone-top',
     [dims.x+.045,.045,dims.z+.045],.07,mats.stone,
     x,groundedSourceTable.box.max.y+.02,z);
    pieces.sittingCoffeeTable++;
    pieces.existingSourceCoffeeTables++;
   }else{
    // Try several source-floor-supported positions on the sofa's sitting
    // side. Do not remove original source furniture or block an opening to
    // force the coffee table into a single preselected point.
    const proposals=[
     [1.04,0],[1.34,0],[.86,-.48],[1.13,-.48],
     [1.44,-.58],[.85,.53],[1.20,.58],[1.55,.29]
    ];
    let accepted=null;
    for(const [dx,dz] of proposals){
     const x=box.max.x+(origin.x||0)+dx,z=sz+dz;
     const datum=getFloor('G-SITTING',x,z);
     if(datum!==null&&allowPlacement('G-SITTING',x,z,1.07,.61,datum)){
      accepted={x,z,y:datum};break;
     }
    }
    if(accepted){
     const g=new THREE.Group();g.name='STAGE4_SITTING_ROUNDED_COFFEE_TABLE';
     g.position.set(...local(accepted.x,accepted.y,accepted.z));
     groups['G-SITTING'].add(g);
     // p.15 overlapping organic tops and dark cylindrical bases replace
     // the original rectangular top/four-leg stand-in.
     installFittedAsset(g,'rounded-coffee-table',[-.535,.0,-.305],[.535,.4675,.305],{mark:visual,materials:mats});
     recordCollider(g,'G-SITTING','ground-coffee-table');
     pieces.sittingCoffeeTable++;
    }else skip.coffeeTable='No source-backed clear table location after eight footprint checks';
   }
   if(stage4Rug('G-SITTING',Math.min(117.5,sx+1.37),sz,2.55,1.79,y,'sitting'))
    pieces.groundRug++;
   // New sofa has its own integrated loose cushions. Keep the previous
   // decoration only when the source sofa could not safely be replaced.
   if(!ground.mesh.userData.phase14CollisionOnly){
   const cushionY=Math.max(y+.56,box.max.y-.26);
   for(const zOffset of [-.52,0,.52]){
    const z=sz+zOffset;
    if(!inside('G-SITTING',sx,z,.15))continue;
    rounded('G-SITTING','existing-sofa-soft-throw-cushion',
     [.24,.23,.37],.055,zOffset===0?mats.cream:mats.taupe,
     sx+.035,cushionY,z);
    pieces.sofaCushions++;
   }
   }
  }else skip.sitting='No confirmed source floor at corrected ground sofa';
 }else skip.sitting='Source IFC ground sofa unavailable';
 // Conversation seating is opposite the sofa and away from stair→sitting
 // (x ~112.3) and sitting→dining (z ~-4.4) open passages.
 const chairSolutions=[
  {name:'south',tries:[[118.03,-8.35],[117.93,-8.73],[118.58,-8.51],[117.43,-8.50]]},
  {name:'north',tries:[[118.03,-5.76],[118.58,-5.81],[117.52,-5.69],[118.65,-6.37],[117.65,-6.04]]}
 ];
 const placedChairs=[];
 for(const chair of chairSolutions){
  for(const [x,z] of chair.tries){
   const y=getFloor('G-SITTING',x,z);
   if(y===null||placedChairs.some(p=>Math.hypot(x-p[0],z-p[1])<1.20)||
      !allowPlacement('G-SITTING',x,z,.82,.82,y))continue;
   if(!makeAccentChair(x,z,y,-Math.PI/2,chair.name))continue;
   placedChairs.push([x,z]);pieces.sittingChairs++;break;
  }
 }
 if(placedChairs.length<2)skip.accentChairs=
  'Only '+placedChairs.length+' source-supported clear conversation chair placements';
 const sideY=getFloor('G-SITTING',116.33,-8.68);
 if(sideY!==null&&allowPlacement('G-SITTING',116.33,-8.68,.4,.4,sideY)){
  tinySideTable('G-SITTING',116.33,-8.68,sideY,'living');pieces.sittingSideTables++;
 }

 // -- First-floor Family Room: source sofa and table already corrected in S1.
 const familySofa=sofaSystem.colliders.find(r=>r.layer?.level==='first'&&
  r.mesh.name.includes('first-floor'));
 const familyTable=sofaSystem.colliders.find(r=>r.layer?.level==='first'&&
  r.mesh.name.includes('family-coffee-table'));
 if(familySofa&&familyTable){
  const c=familyTable.box.getCenter(new THREE.Vector3());
  const [x,z]=global(c);
  const y=getFloor('F-FAMILY',x,z);
  if(y!==null){
   if(stage4Rug('F-FAMILY',x,z,2.12,1.53,y,'family'))
    pieces.firstFloorRug++;
   // Small planted side accent near the far source interior wall, never
   // across the balcony sliding door at z ~0.
   const lampX=116.20,lampZ=-3.52;
   const lampY=getFloor('F-FAMILY',lampX,lampZ);
   if(lampY!==null&&allowPlacement('F-FAMILY',lampX,lampZ,.23,.23,lampY)){
    cylinder('F-FAMILY','floor-lamp-bronze-base',.11,.11,.05,mats.bronze,
     lampX,lampY+.03,lampZ);
    cylinder('F-FAMILY','floor-lamp-stem',.019,.019,1.32,mats.bronze,
     lampX,lampY+.70,lampZ);
    const shade=piece('F-FAMILY','floor-lamp-taupe-shade',
     new THREE.CylinderGeometry(.20,.25,.31,18,1,true),mats.cream,
     lampX,lampY+1.40,lampZ);
    shade.material.side=THREE.DoubleSide;
    pieces.familyAccent++;
   }
  }else skip.family='No confirmed floor under IFC family furniture';
 }else skip.family='Corrected source Family Room sofa/table pair not verified';

 // -- Entrance: lightweight décor fixed beside REAL main door 27 cheek.
 // This does not invent an entry hallway or risk blocking its swing.
 if(mainDoorEnclosure?.summary?.mainDoubleDoorId===27&&
    mainDoorEnclosure?.summary?.doorwayUnblocked){
  const trim=mainDoorEnclosure.visuals?.find(o=>o.name==='MAIN_DOOR_RIGHT_ENCLOSING_CHEEK');
  if(trim){
   const b=new THREE.Box3().setFromObject(trim);
   const centre=b.getCenter(new THREE.Vector3());
   const [x,z]=global(centre);
   const width=b.max.z-b.min.z;
   if(width>.31){
    const roomX=b.min.x-.025+(origin.x||0); // room-facing side of verified cheek
    rounded('ENTRY','entry-bronze-mirror-frame',
     [.050,.75,Math.min(.35,width-.055)],.022,mats.bronze,
     roomX,1.63,z);
    rounded('ENTRY','entry-arched-mirror',
     [.012,.69,Math.min(.29,width-.09)],.017,mats.mirror,
     roomX-.031,1.63,z);
    pieces.foyerMirror++;
    // Optional slim entry ledge beside doorway, NOT an upholstered ottoman;
    // a shoe bench would need an approved door-swing clearance survey.
    if(width>.43){
     rounded('ENTRY','wall-mounted-entry-drop-zone',
      [.12,.055,Math.min(.34,width-.07)],.018,mats.timber,
      roomX-.065,1.00,z);
     pieces.foyerShelf++;
    }
   }
  }
 }else skip.entrance='Source-confirmed main door enclosure not available';

 // Ambient/fixture lighting is owned by the existing Stage 2 lighting
 // system. Stage 4 adds subtle accents, respecting house and layer switches.
 const lights=[];
 if(pieces.diningTabletop){
  const [x,,z]=DINING_TABLE_WORLD;
  const light=new THREE.PointLight(0xffdfaf,0,2.65,2);
  light.position.set(...local(x,2.17,z));light.castShadow=false;
  groups['G-DINING'].add(light);lights.push({light,layer:'accent',room:'G-DINING'});
  pieces.accentLights++;
 }
 if(pieces.sittingCoffeeTable){
  const [x,z]=[117.36,-7.18];
  const light=new THREE.PointLight(0xffdbad,0,3.7,2);
  light.position.set(...local(x,2.38,z));light.castShadow=false;
  groups['G-SITTING'].add(light);lights.push({light,layer:'accent',room:'G-SITTING'});
  pieces.accentLights++;
 }
 let night=false,lightsOn=true,layers={ambient:true,task:true,accent:true};
 let floor='all',walk=false,showFurniture=true,section=false;
 function update({night:nextNight,enabled,lightLayers,floor:nextFloor,walking,
  furnitureVisible,sectionEnabled}={}){
  if(typeof nextNight==='boolean')night=nextNight;
  if(typeof enabled==='boolean')lightsOn=enabled;
  if(lightLayers)layers={...layers,...lightLayers};
  if(typeof nextFloor==='string')floor=nextFloor;
  if(typeof walking==='boolean')walk=walking;
  if(typeof furnitureVisible==='boolean')showFurniture=furnitureVisible;
  if(typeof sectionEnabled==='boolean')section=sectionEnabled;
  const visible=id=>showFurniture&&(walk||floor==='all'||
   (id==='F-FAMILY'?floor==='first':floor==='ground'));
  for(const [id,g] of Object.entries(groups)){
   g.visible=visible(id);
  }
  for(const o of groups['G-DINING'].children){
   if(o.userData?.component==='sculpted-rounded-dining-tabletop')
    o.visible=visible('G-DINING');
  }
  for(const e of lights)
   e.light.intensity=lightsOn&&layers[e.layer]&&groups[e.room].visible?
    night?2.2:.45:0;
  // A section should show the designed room, not another ceiling shell.
  return status();
 }
 function status(){
  return {
   stage:4,productionIntegrated:true,previewActivationRequired:false,
   rooms:['G-SITTING','G-DINING','F-FAMILY','ENTRY'],
   pieces:{...pieces},diningOrientation,phase14Placements:phase14Placements.map(p=>({...p})),phase14LibraryChairs:groups['G-SITTING'].children.filter(o=>o.userData.phase14Asset==='sculptural-accent-chair').length,visibleRooms:Object.entries(groups)
    .filter(([,g])=>g.visible).map(([id])=>id),
   originalIFCGeometryPreserved:defaultSourceCondition(),
   sourceIFCCollidersPreserved:true,mainEntranceDoorId:27,
   openPlanWallsCreated:0,interiorDoorsCreated:0,
   diningChairsTotal:diningSystem.chairs??6,
   clientApproved:false,roomPolygonsCertified:false,
   furnitureClearancesProvisional:true,
   entryBenchHeldForSurvey:true,skipped:{...skip}
  };
 }
 function dispose(){
  for(const undo of revertDining)undo();
  // Revert enhancement additions to the existing six dining chair groups.
  for(const chair of dining.children.filter(x=>/^DINING_CHAIR_[1-6]$/.test(x.name))){
   for(const m of [...chair.children].filter(o=>o.userData?.stage4)){
    chair.remove(m);m.geometry?.dispose();
   }
  }
  root.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  for(const m of Object.values(mats))m.dispose();
  scene.remove(root);
 }
 update();
 return {root,groups,colliders,update,status,dispose};
}
