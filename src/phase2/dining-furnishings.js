import * as THREE from 'three';
// Reconstructed from Home.pdf S1, 19m² dining area and six-chair drawing.
// Furniture dimensions and finishes are previews. The original IFC is unchanged.
const oak=new THREE.MeshStandardMaterial({color:0xa87c55,roughness:.63});
const legs=new THREE.MeshStandardMaterial({color:0x6f5440,roughness:.58});
const upholstered=new THREE.MeshStandardMaterial({color:0xe5ddd1,roughness:.92});
const cushion=new THREE.MeshStandardMaterial({color:0xb1b0a3,roughness:.9});
const ceramic=new THREE.MeshStandardMaterial({color:0xe9e3d8,roughness:.4});
const green=new THREE.MeshStandardMaterial({color:0x6e8670,roughness:.83});
function piece(group,w,h,d,x,y,z,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function makeChair(x,z,rotation,index){
 const chair=new THREE.Group();
 chair.name='DINING_CHAIR_'+(index+1);
 chair.position.set(x,0,z);chair.rotation.y=rotation;
 // Solid timber frames, upholstered seat, actual chair back, four legs.
 piece(chair,.52,.105,.51,0,.43,0,oak);
 piece(chair,.47,.06,.46,0,.51,-.01,upholstered);
 for(const a of [-1,1])for(const b of [-1,1]){
  piece(chair,.06,.44,.06,a*.218,.215,b*.207,legs);
 }
 for(const a of [-1,1])piece(chair,.064,.55,.065,a*.212,.70,.225,legs);
 piece(chair,.48,.34,.065,0,.82,.225,oak);
 piece(chair,.41,.27,.073,0,.81,.16,cushion);
 return chair;
}
export function createPlanDiningFurniture(scene,origin,sourceRecords=[]){
 const root=new THREE.Group();
 root.name='PDF_DINING_ROOM_19M2_SIX_CHAIRS_PROVISIONAL';
 // Derived approximate position from ground-floor source coordinates and
 // photo/plan orientation. Requires source-to-PDF interior clearance approval.
 root.position.set(114.05-origin.x,0,-1.52-origin.z);
 const tabletop=new THREE.Group();tabletop.name='REAL_3D_DINING_TABLE';
 const tableTop=piece(tabletop,2.17,.09,1.10,0,.765,0,oak);
 for(const x of [-.94,.94])for(const z of [-.42,.42])piece(tabletop,.084,.72,.084,x,.36,z,legs);
 piece(tabletop,1.72,.095,.084,0,.655,-.39,legs);
 piece(tabletop,1.72,.095,.084,0,.655,.39,legs);
 // Branded centerpiece remains proper 3D geometry, not a painted image.
 const vase=new THREE.Mesh(new THREE.CylinderGeometry(.095,.13,.26,24),ceramic);
 vase.position.set(0,.97,0);tabletop.add(vase);
 const leaves=new THREE.Group();tabletop.add(leaves);
 for(let i=0;i<5;i++){
  const leaf=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),green);
  leaf.scale.set(.27,.1,.11);leaf.position.set((i-2)*.055,1.17+Math.sin(i)*.05,(i%2?-.02:.02));
  leaf.rotation.z=(i-2)*.37;leaves.add(leaf);
 }
 root.add(tabletop);
 const positions=[
  [-.55,-.92,Math.PI], [.55,-.92,Math.PI],
  [-.55,.92,0], [.55,.92,0],
  [-1.48,0,-Math.PI/2], [1.48,0,Math.PI/2]
 ];
 const furniture=[tabletop];
 for(let i=0;i<positions.length;i++){
  const chair=makeChair(...positions[i],i);
  root.add(chair);furniture.push(chair);
 }
 scene.add(root);
 root.updateWorldMatrix(true,true);
 const collisionBoxes=furniture.map(o=>new THREE.Box3().setFromObject(o).clone());
 // Identify the odd lone IFC furnishing that otherwise stands at the dining
 // margin. Keep the original element available in the BIM records; hide its
 // visual while the complete coordinated six-chair set is displayed.
 const diningBox=new THREE.Box3(
   new THREE.Vector3(root.position.x-2.05,-.04,root.position.z-1.65),
   new THREE.Vector3(root.position.x+2.05,1.85,root.position.z+1.65)
 );
 const sourceSet=new Set(sourceRecords.filter(r=>{
   if(r.layer?.level!=='ground'||!/^FU\s*-/i.test(r.mesh.userData.ifc?.name||''))return false;
   if(r.box.intersectsBox(diningBox) &&
     collisionBoxes.some(b=>b.clone().expandByScalar(.11).intersectsBox(r.box)))return true;
   // A thin, tall, isolated FU - 005 at the east-side dining room threshold
   // is not part of the planned six-seat set and obstructs the preview.
   const c=r.box.getCenter(new THREE.Vector3()),s=r.box.getSize(new THREE.Vector3());
   return /^FU\s*-\s*005$/i.test(r.mesh.userData.ifc?.name||'') &&
     Math.abs(c.x-(112.30-origin.x))<.17 &&
     Math.abs(c.z-(-.515-origin.z))<.18 &&s.x<.3&&s.z<.3;
 }));
 root.userData={architecturalRoom:'Dining',area_m2:19,source:'Home.pdf ground-floor plan',
  chairs:6,tableDimensions_m:[2.17,1.10],placement:'provisional_pending_plan_registration'};
 return {root,collisionBoxes,sourceSet,chairs:6,
  source:'Home.pdf 19m² dining',provisional:true,
  summary:{sixChairs:true,chairs:6,table3D:true,sourceOverlapsConcealed:sourceSet.size}};
}
