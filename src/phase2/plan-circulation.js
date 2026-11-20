import * as THREE from 'three';

/**
 * Ground-floor S1 drawing corrections.
 * The plan shows open bays between 200mm structural piers beside the
 * ground stair, and a kitchen/dining door swing at the x=112.3m partition.
 * Exported SW - 017 and SW - 019 first-person collision meshes currently
 * continue through these DRAWN openings. Only remove the aperture volume,
 * never delete the structural wall or supporting piers.
 */
export const S1_GROUND_OPENINGS=Object.freeze([
 {id:'stair-living-upper-bay',label:'Stair to Sitting Room - northern open bay',
  name:'SW - 017',center:[112.3,-7.02],alongX:false,width:.83,height:2.45,
  drawing:'S1 ground floor, Sitting Room west boundary between 200mm piers',
  wallZ:[-7.54,-6.53]},
 {id:'stair-living-lower-bay',label:'Stair to Sitting Room - southern open bay',
  name:'SW - 017',center:[112.3,-6.02],alongX:false,width:.80,height:2.45,
  drawing:'S1 ground floor, Sitting Room west boundary between 200mm piers',
  wallZ:[-6.53,-5.56]},
 {id:'kitchen-dining-door',label:'Kitchen to Dining Hall interior door',
  name:'SW - 019',center:[112.3,-2.35],alongX:false,width:.93,height:2.42,
  drawing:'S1 ground floor, Kitchen/Dining dividing wall with door-swing symbol',
  wallZ:[-5.56,.59]},
]);

const edgeMat=new THREE.MeshStandardMaterial({color:0xcab49a,roughness:.62,metalness:.04});
const oak=new THREE.MeshStandardMaterial({color:0x8b6547,roughness:.58,side:THREE.DoubleSide});

function planarBounds(b,origin){
 return {minX:b.min.x+origin.x,maxX:b.max.x+origin.x,
  minZ:b.min.z+origin.z,maxZ:b.max.z+origin.z};
}
/**
 * The 0.93m Kitchen / Dining door is a drawing-backed S1 opening rather than
 * one of the 29 source-model door records. It needs an independently animated
 * leaf and actual CLOSED/OPEN collision behavior, not a permanently offset
 * brown slab. It never changes the source IFC vertex buffers.
 */
export function createFunctionalKitchenDoor(plan,origin={x:0,z:0}){
 const root=new THREE.Group();
 root.name='S1_FUNCTIONAL_KITCHEN_DINING_DOOR';
 root.position.set(plan.center[0]-origin.x,0,plan.center[1]-origin.z);
 const h=plan.height,w=plan.width;
 // Physically model only this Kitchen–Dining leaf: full-depth frame, a
 // hinged timber body, recessed double-sided panels and real lock hardware.
 // The original S1 aperture, IFC walls and 29 source doors are untouched.
 const timber=new THREE.MeshStandardMaterial({
  color:0x895637,roughness:.56,metalness:0
 });
 const stileWood=new THREE.MeshStandardMaterial({
  color:0xa4754d,roughness:.48,metalness:0
 });
 const panelWood=new THREE.MeshStandardMaterial({
  color:0x74452d,roughness:.63,metalness:0
 });
 const brass=new THREE.MeshStandardMaterial({
  color:0xc3a46f,metalness:.79,roughness:.27
 });
 const frameWood=new THREE.MeshStandardMaterial({
  color:0xe5d5c1,roughness:.53,metalness:0
 });
 const trim=(sx,sy,sz,x,y,z,name,material=frameWood,parent=root)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
  mesh.position.set(x,y,z);
  mesh.name=name;
  mesh.castShadow=false;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
 };
 // The jamb spans the real 200mm partition depth, not a painted rectangle.
 trim(.23,h+.065,.084,0,(h+.065)/2,-w/2,'KITCHEN_DOOR_FRAME_LEFT');
 trim(.23,h+.065,.084,0,(h+.065)/2,w/2,'KITCHEN_DOOR_FRAME_RIGHT');
 trim(.23,.105,w+.09,0,h+.022,0,'KITCHEN_DOOR_HEADER');
 for(const face of [-1,1]){
  const x=face*.124;
  trim(.024,h+.095,.076,x,(h+.095)/2,-w/2,'KITCHEN_DOOR_CASING');
  trim(.024,h+.095,.076,x,(h+.095)/2,w/2,'KITCHEN_DOOR_CASING');
  trim(.024,.082,w+.14,x,h+.052,0,'KITCHEN_DOOR_CASING_HEADER');
 }
 const pivot=new THREE.Group();
 pivot.name='HINGED_KITCHEN_LEAF_PIVOT';
 pivot.position.set(0,0,-w/2+.052);
 root.add(pivot);
 const thickness=.068;
 const leafWidth=w-.102;
 const leafHeight=h-.105;
 const bottom=.047;
 const faceX=thickness/2;
 const leaf=new THREE.Mesh(new THREE.BoxGeometry(thickness,leafHeight,leafWidth),timber);
 leaf.position.set(0,bottom+leafHeight/2,leafWidth/2);
 leaf.name='S1_KITCHEN_DINING_PROPER_HINGED_WOOD_DOOR';
 leaf.castShadow=false;
 leaf.receiveShadow=true;
 pivot.add(leaf);
 // The stiles and cross-rails make the leaf visibly three-dimensional from
 // either room and from above; panels are inset into the door body.
 const panelWidths=leafWidth-.23;
 const panels=[
  {middle:.565,height:.71},
  {middle:1.690,height:.82}
 ];
 for(const side of [-1,1]){
  for(const panel of panels){
   const inset=trim(.009,panel.height,panelWidths,
    side*(faceX+.004),panel.middle,leafWidth/2,
    'KITCHEN_DOOR_RECESSED_WOOD_PANEL',panelWood,pivot);
   inset.userData.isRecessedTimberPanel=true;
   const edgeY=panel.height/2+.018;
   const edgeZ=panelWidths/2+.018;
   const borderX=side*(faceX+.017);
   // Individual profile beads catch light and show actual joinery depth.
   for(const dy of [-edgeY,edgeY]){
    trim(.023,.033,panelWidths+.07,borderX,panel.middle+dy,leafWidth/2,
     'KITCHEN_DOOR_RAISED_PANEL_MOULDING',stileWood,pivot);
   }
   for(const dz of [-edgeZ,edgeZ]){
    trim(.023,panel.height+.07,.034,borderX,panel.middle,leafWidth/2+dz,
     'KITCHEN_DOOR_RAISED_PANEL_MOULDING',stileWood,pivot);
   }
  }
  // Three-dimensional outer rails and stiles retain their texture from both
  // sides; they do not extend into the clear door jamb.
  for(const z of [.052,leafWidth-.052]){
   trim(.018,leafHeight,.098,side*(faceX+.01),bottom+leafHeight/2,z,
    'KITCHEN_DOOR_TIMBER_STILE',stileWood,pivot);
  }
  for(const y of [bottom+.065,bottom+1.12,bottom+leafHeight-.065]){
   trim(.018,.102,leafWidth-.12,side*(faceX+.01),y,leafWidth/2,
    'KITCHEN_DOOR_TIMBER_RAIL',stileWood,pivot);
  }
  // Working-looking lever hardware is attached to the rotating leaf on BOTH
  // faces rather than a fixed spherical dot on an unmodeled flat panel.
  const handleZ=leafWidth-.13;
  trim(.013,.212,.066,side*(faceX+.015),1.035,handleZ,
   'KITCHEN_DOOR_BRASS_ESCUTCHEON',brass,pivot);
  const spindle=new THREE.Mesh(new THREE.SphereGeometry(.032,12,10),brass);
  spindle.position.set(side*(faceX+.046),1.035,handleZ);
  spindle.name='KITCHEN_DOOR_HANDLE_SPINDLE';
  pivot.add(spindle);
  trim(.022,.026,.127,side*(faceX+.072),1.035,handleZ-.051,
   'KITCHEN_DOOR_LEVER_HANDLE',brass,pivot);
 }
 // Three genuine visible hinge barrels rotate with the leaf; fixed frame
 // straps remain on the jamb. The hinge axis is at the leaf's pivot.
 for(const y of [.30,1.20,2.08]){
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.095,14),brass);
  barrel.position.set(0,y,0);
  barrel.name='KITCHEN_DOOR_HINGE_BARREL';
  pivot.add(barrel);
  trim(.016,.098,.075,-.080,y,0,'KITCHEN_DOOR_FRAME_HINGE',brass);
 }
 root.userData.real3DKitchenDoor=true;
 root.userData.doorModel={
  panelCount:4,hingeCount:3,handleCount:2,leafThicknessMetres:thickness,
  openingWidthMetres:w,leafWidthMetres:leafWidth,
  reversibleSourceOnly:true
 };
 let current=0,target=0;
 function update(dt=.016){
  current=THREE.MathUtils.damp(current,target,8,Math.min(.10,Math.max(0,dt)));
  if(Math.abs(current-target)<.002)current=target;
  // Open into the dining side, away from the kitchen cabinetry.
  pivot.rotation.y=current*Math.PI*.49;
  root.updateMatrixWorld(true);
 }
 function distanceTo(viewer){
  const x=viewer.x-root.position.x,z=viewer.z-root.position.z;
  return Math.hypot(x,Math.max(0,Math.abs(z)-w/2));
 }
 function near(viewer,footY,max=1.75){
  return Math.abs(footY)<1.05&&distanceTo(viewer)<max;
 }
 function toggle(viewer,footY){
  if(!near(viewer,footY))return {ok:false,reason:'Move closer to the kitchen door'};
  const dx=viewer.x-root.position.x,dz=viewer.z-root.position.z;
  if(target>.5&&Math.abs(dx)<.48&&Math.abs(dz)<w/2+.32)
   return {ok:false,reason:'Move away from the kitchen doorway before closing'};
  target=target>.5?0:1;
  return {ok:true,open:target>.5,style:'hinge',name:'Kitchen–Dining door'};
 }
 function blocksTraversal(from,to,footY,radius=.32){
  if(current>=.85||Math.abs(footY)>1.05)return false;
  const ax=from.x-root.position.x,bx=to.x-root.position.x;
  const az=from.z-root.position.z,bz=to.z-root.position.z;
  if(Math.min(Math.abs(az),Math.abs(bz))>w/2+radius*.35)return false;
  return (Math.abs(bx)<.052+radius&&Math.abs(bx)<=Math.abs(ax)+.00001) ||
   (ax*bx<=0&&Math.abs(az)<w/2+radius*.1&&Math.abs(bz)<w/2+radius*.1);
 }
 function status(){return {open:target>.5,current,target,
  centre:[plan.center[0],plan.center[1]],width:w,height:h,
  functional:true,physicalDoorModel:root.userData.doorModel,
  source:'S1 Kitchen / Dining door-swing'};}
 update(.01);
 return {root,update,near,toggle,blocksTraversal,status,distanceTo,
  get current(){return current;},get target(){return target;},
  setOpenForQA(v){current=target=v?1:0;update(0);}};
}


/**
 * Fix the actual counter-end obstruction seen in the Kitchen–Dining door.
 * The S1 opening passes through SW-019 at x=112.30, z=-2.35, but three
 * low SLA-002 source slabs (counter top/return/end) overlap the doorway.
 * Cut only the intrusion into the exact S1 doorway rectangle. No IFC vertex
 * is changed or source mesh deleted; adjacent usable counter stays in view.
 *
 * Each selected source slab gets its own material clone so neighboring kitchen
 * counters and all other room floors retain the normal source appearance.
 */
export function repairKitchenDoorCounterIntrusion(records,origin,plan,inside=()=>true){
 const cx=plan.center[0]-origin.x,cz=plan.center[1]-origin.z;
 const halfWidth=plan.width/2+.035;
 const xLo=cx-.48,xHi=cx+.48,zLo=cz-halfWidth,zHi=cz+halfWidth;
 const selected=records.filter(r=>{
  if(!inside(r)||r.category!=='slabs'||r.layer?.level!=='ground')return false;
  if(String(r.mesh.userData.ifc?.name||'').toUpperCase().trim()!=='SLA - 002')return false;
  const b=r.box,s=b.getSize(new THREE.Vector3());
  // Only small countertop geometry, never a structural room floor.
  return b.max.y<1.10&&b.min.y>=-.08&&b.max.y-b.min.y>.025&&
   s.x<.65&&s.x>.012 &&
   b.max.x>xLo&&b.min.x<xHi&&b.max.z>zLo&&b.min.z<zHi;
 });
 const original=new Map(),cut=new Map();
 for(const rec of selected){
  const material=rec.mesh.material;
  // The source material is not modified; this unique clone clips a small
  // localized volume out of just this counter segment at drawing-based door.
  const derived=material.clone();
  const prev=derived.onBeforeCompile;
  const region=new THREE.Vector4(xLo,xHi,zLo,zHi);
  const height=new THREE.Vector2(-.08,1.10);
  derived.onBeforeCompile=(shader,renderer)=>{
   prev?.(shader,renderer);
   shader.uniforms.uKitchenCounterCutXZ={value:region};
   shader.uniforms.uKitchenCounterCutY={value:height};
   shader.vertexShader='varying vec3 vKitchenCounterWorld;\n'+
    shader.vertexShader.replace('#include <begin_vertex>',
     '#include <begin_vertex>\n vKitchenCounterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 vKitchenCounterWorld;\n'+
    'uniform vec4 uKitchenCounterCutXZ;\n'+
    'uniform vec2 uKitchenCounterCutY;\n'+
    shader.fragmentShader.replace('#include <clipping_planes_fragment>',
     '#include <clipping_planes_fragment>\n'+
     'if(vKitchenCounterWorld.x>uKitchenCounterCutXZ.x &&'+
     ' vKitchenCounterWorld.x<uKitchenCounterCutXZ.y &&'+
     ' vKitchenCounterWorld.z>uKitchenCounterCutXZ.z &&'+
     ' vKitchenCounterWorld.z<uKitchenCounterCutXZ.w &&'+
     ' vKitchenCounterWorld.y>uKitchenCounterCutY.x &&'+
     ' vKitchenCounterWorld.y<uKitchenCounterCutY.y)discard;');
  };
  derived.customProgramCacheKey=()=> 'kitchen-counter-door-cut-v1-'+
   String(rec.mesh.userData.ifc?.guid||'source-slab');
  original.set(rec,material);cut.set(rec,derived);
  rec.mesh.material=derived;
  rec.mesh.userData.kitchenCounterDoorCut=true;
 }
 let enabled=true;
 function setEnabled(value){
  enabled=Boolean(value);
  for(const rec of selected)rec.mesh.material=enabled?cut.get(rec):original.get(rec);
 }
 function pointInCut(point){
  return point.x>xLo&&point.x<xHi&&point.z>zLo&&point.z<zHi&&
   point.y>-.08&&point.y<1.10;
 }
 // A detailed physical collision detector may query source low slabs. Align
 // it with the same aperture as the fragment shader while preserving walls.
 function permitsCounterHit(hit){
  return enabled&&selected.some(r=>r.mesh===hit?.object)&&pointInCut(hit.point);
 }
 return {
  selected,original,cut,setEnabled,permitsCounterHit,pointInCut,
  get enabled(){return enabled;},
  summary:{
   source:'S1 Kitchen-Dining opening and source SLA-002 counter edges',
   matchedSourceSlabs:selected.length,
   matchedGuids:selected.map(r=>r.mesh.userData.ifc?.guid),
   cutRectangle:[xLo,xHi,zLo,zHi],
   cutHeight:[-.08,1.10],
   sourceMeshesAndVertexBuffersPreserved:true,
   counterOutsideDoorRetained:true,
   doorClearanceNotFabricated:true
  }
 };
}

export function createPlanCirculationCorrections(records,scene,origin={x:0,z:0},inside=()=>true){
 const supported=[];
 let kitchenDoor=null,kitchenCounterRepair=null;
 const root=new THREE.Group();root.name='S1_CONFIRMED_OPEN_ROOM_CIRCULATION';scene.add(root);
 for(const plan of S1_GROUND_OPENINGS){
  const walls=records.filter(r=>{
   if(!inside(r)||r.category!=='walls'||r.layer.level!=='ground')return false;
   if(String(r.mesh.userData.ifc?.name||'').trim().toUpperCase()!==plan.name)return false;
   const b=planarBounds(r.box,origin),size=r.box.getSize(new THREE.Vector3());
   return b.minX<plan.center[0]+.12&&b.maxX>plan.center[0]-.12&&
    b.minZ<plan.center[1]+plan.width/2&&b.maxZ>plan.center[1]-plan.width/2&&
    size.y>2.2;
  });
  if(!walls.length){supported.push({id:plan.id,verified:false,reason:'Expected source wall not found'});continue;}
  const localX=plan.center[0]-origin.x,localZ=plan.center[1]-origin.z;
  const sourceGuids=walls.map(r=>r.mesh.userData.ifc?.guid);
  supported.push({
   id:plan.id,verified:true,kind:'plan',cx:localX,cz:localZ,
   groundY:0,width:plan.width,height:plan.height,alongX:plan.alongX,
   drawing:plan.drawing,sourceWallGuids:sourceGuids,sourceWallMeshes:new Set(walls.map(w=>w.mesh)),
   autoOpen:true
  });
  // Build the real swinging display door at the source-backed plan opening,
  // with live keyboard interaction and solid closed-door collision.
  if(plan.id==='kitchen-dining-door'){
   kitchenDoor=createFunctionalKitchenDoor(plan,origin);
   kitchenCounterRepair=repairKitchenDoorCounterIntrusion(records,origin,plan,inside);
   root.add(kitchenDoor.root);
  }
 }
 return {root,kitchenDoor,kitchenCounterRepair,apertures:supported.filter(r=>r.verified),
  summary:{sourceConfirmedOpenings:supported.filter(x=>x.verified).length,
   kitchenDoorFunctional:Boolean(kitchenDoor),
   kitchenCounterClearance:kitchenCounterRepair?.summary??null,
   expected:S1_GROUND_OPENINGS.length,
   connections:supported.map(({sourceWallMeshes,...rest})=>rest),
   noStructuralWallMeshModified:true}};
}
