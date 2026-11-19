import * as THREE from 'three';

/**
 * First-floor sitting-room circulation correction. IFC FU - 007 sits directly
 * behind the opening of the source sliding balcony doors (DOO - 003).
 * Preview the SAME IFC sofa mesh 1.35m farther right, .70m into the room.
 * Source mesh/GLB is never altered; the old presentation is only concealed.
 */
export function organizeSourceSittingFurniture(records,scene,origin={x:0,z:0},inside=()=>true){
 const source=records.find(r=>{
  if(!inside(r)||r.layer?.level!=='first'||r.category!=='furniture')return false;
  if(String(r.mesh.userData.ifc?.name||'').toUpperCase().trim()!=='FU - 007')return false;
  const c=r.box.getCenter(new THREE.Vector3()),sz=r.box.getSize(new THREE.Vector3());
  return Math.abs(c.x+origin.x-115.02)<.32&&Math.abs(c.z+origin.z+1.445)<.37 &&
   sz.x>2.15&&sz.x<3.3&&sz.z>1.3&&sz.z<2;
 });
 const root=new THREE.Group();root.name='SOURCE_ALIGNED_UPSTAIRS_SOFA_CIRCULATION_CORRECTION';
 scene.add(root);
 if(!source)return {root,sourceSet:new Set(),colliders:[],summary:{sourceMatched:false,originalUnmodified:true}};
 source.mesh.updateWorldMatrix(true,false);
 const preview=source.mesh.clone();
 // Bake the old world matrix before placing clone under the corrected scene root.
 preview.matrix.copy(source.mesh.matrixWorld);
 preview.matrix.decompose(preview.position,preview.quaternion,preview.scale);
 const correction=new THREE.Vector3(1.35,0,-.70);
 preview.position.add(correction);
 preview.name='SITTING_ROOM_SOFA_REPOSITIONED_FROM_IFC';
 preview.userData={...preview.userData,circulationPreview:true,originalGUID:source.mesh.userData.ifc?.guid};
 root.add(preview);
 root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(preview);
 const sourceSet=new Set([source]);
 const moved={mesh:preview,box,category:'furniture',layer:source.layer};
 const summary={sourceMatched:true,sourceGUID:source.mesh.userData.ifc?.guid,
  offsetMetres:correction.toArray(),originalUnmodified:true,previewFootprint:box.getSize(new THREE.Vector3()).toArray(),
  rationale:'Allow passage past DOO - 003 into upstairs sitting room without crossing sofa'};
 return {root,sourceSet,colliders:[moved],summary};
}
