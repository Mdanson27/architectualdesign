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
export function createPlanCirculationCorrections(records,scene,origin={x:0,z:0},inside=()=>true){
 const supported=[];
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
  // Draw clean doorway edges for the Kitchen-to-Dining door, not a painted
  // rectangle on a solid wall. The leaf is shown open as a viewer concept.
  if(plan.id==='kitchen-dining-door'){
   const frame=new THREE.Group();frame.name='S1_KITCHEN_DINING_OPEN_DOOR';
   frame.position.set(localX,0,localZ);
   root.add(frame);
   for(const z of [-plan.width/2,plan.width/2]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(.065,plan.height,.065),edgeMat);
    post.position.set(0,plan.height/2,z);post.name='DOORWAY_SIDE_TRIM';frame.add(post);
   }
   const lintel=new THREE.Mesh(new THREE.BoxGeometry(.075,.065,plan.width+.1),edgeMat);
   lintel.position.set(0,plan.height,0);lintel.name='DOORWAY_HEAD_TRIM';frame.add(lintel);
   const leaf=new THREE.Mesh(new THREE.BoxGeometry(.044,plan.height-.15,plan.width-.11),oak);
   leaf.position.set(-.51,(plan.height-.15)/2,-plan.width/2+.055);
   leaf.name='KITCHEN_DINING_OPEN_LEAF_PLAN_VISUAL';frame.add(leaf);
   frame.userData={visualConceptOnly:true,notAnOriginalIfcDoor:true};
  }
 }
 return {root,apertures:supported.filter(r=>r.verified),
  summary:{sourceConfirmedOpenings:supported.filter(x=>x.verified).length,
   expected:S1_GROUND_OPENINGS.length,
   connections:supported.map(({sourceWallMeshes,...rest})=>rest),
   noStructuralWallMeshModified:true}};
}
