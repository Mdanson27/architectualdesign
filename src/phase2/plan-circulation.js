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
 const h=plan.height,w=plan.width,post=.065;
 const trim=(sx,sy,sz,x,y,z,name)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),edgeMat);
  m.position.set(x,y,z);m.name=name;root.add(m);return m;
 };
 trim(.10,h+.05,post,0,(h+.05)/2,-w/2,'KITCHEN_DOOR_FRAME_LEFT');
 trim(.10,h+.05,post,0,(h+.05)/2,w/2,'KITCHEN_DOOR_FRAME_RIGHT');
 trim(.10,.09,w+.08,0,h+.025,0,'KITCHEN_DOOR_HEADER');
 const pivot=new THREE.Group();
 pivot.name='HINGED_KITCHEN_LEAF_PIVOT';
 pivot.position.set(0,0,-w/2+.055);
 root.add(pivot);
 const leaf=new THREE.Mesh(new THREE.BoxGeometry(.052,h-.13,w-.11),oak);
 leaf.position.set(0,(h-.13)/2,(w-.11)/2);
 leaf.name='S1_KITCHEN_DINING_PROPER_HINGED_WOOD_DOOR';
 pivot.add(leaf);
 const handle=new THREE.Mesh(new THREE.SphereGeometry(.033,10,8),
  new THREE.MeshStandardMaterial({color:0xd7c29d,metalness:.55,roughness:.36}));
 handle.position.set(.055,1.02,w-.20);
 handle.name='KITCHEN_DOOR_HANDLE';
 pivot.add(handle);
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
  functional:true,source:'S1 Kitchen / Dining door-swing'};}
 update(.01);
 return {root,update,near,toggle,blocksTraversal,status,distanceTo,
  get current(){return current;},get target(){return target;},
  setOpenForQA(v){current=target=v?1:0;update(0);}};
}

export function createPlanCirculationCorrections(records,scene,origin={x:0,z:0},inside=()=>true){
 const supported=[];
 let kitchenDoor=null;
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
   root.add(kitchenDoor.root);
  }
 }
 return {root,kitchenDoor,apertures:supported.filter(r=>r.verified),
  summary:{sourceConfirmedOpenings:supported.filter(x=>x.verified).length,
   kitchenDoorFunctional:Boolean(kitchenDoor),
   expected:S1_GROUND_OPENINGS.length,
   connections:supported.map(({sourceWallMeshes,...rest})=>rest),
   noStructuralWallMeshModified:true}};
}
