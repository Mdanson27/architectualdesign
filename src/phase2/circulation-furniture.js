import * as THREE from 'three';

/**
 * Preserve original IFC furniture and preview its placement off the
 * source-confirmed internal circulation routes from Home(3).pdf.
 * Actual 3D source meshes are cloned; original geometry, GUID and position
 * stay unchanged and can be inspected with furniture previews disabled.
 */
const CORRECTIONS=[
 {key:'first-floor',label:'Upstairs family-room sofa',level:'first',
  center:[115.02,-1.445],size:[2.15,3.3,1.3,2],
  offset:[1.35,0,-.70],
  reason:'DOO - 003 sliding balcony-door approach'},
 {key:'ground-sitting',label:'Ground Sitting Room west-facing sofa',level:'ground',
  center:[113.9,-6.6],size:[1.45,1.9,2.3,2.7],
  offset:[.82,0,0],
  reason:'Open access from stair bay into 35m² Sitting Room'}
];
export function organizeSourceSittingFurniture(records,scene,origin={x:0,z:0},inside=()=>true){
 const root=new THREE.Group();root.name='IFC_SOURCE_SOFAS_REPOSITIONED_FOR_PLAN_CIRCULATION';
 scene.add(root);
 const sourceSet=new Set(),colliders=[],placements=[];
 for(const spec of CORRECTIONS){
  const source=records.find(r=>{
   if(!inside(r)||r.layer?.level!==spec.level||r.category!=='furniture')return false;
   if(String(r.mesh.userData.ifc?.name||'').toUpperCase().trim()!=='FU - 007')return false;
   const c=r.box.getCenter(new THREE.Vector3()),sz=r.box.getSize(new THREE.Vector3());
   return Math.abs(c.x+origin.x-spec.center[0])<.32&&
     Math.abs(c.z+origin.z-spec.center[1])<.37 &&
     sz.x>spec.size[0]&&sz.x<spec.size[1]&&
     sz.z>spec.size[2]&&sz.z<spec.size[3];
  });
  if(!source){
   placements.push({id:spec.key,sourceMatched:false,
     reason:'Missing source IFC FU - 007 at the expected location'});continue;
  }
  source.mesh.updateWorldMatrix(true,false);
  const preview=source.mesh.clone();
  preview.matrix.copy(source.mesh.matrixWorld);
  preview.matrix.decompose(preview.position,preview.quaternion,preview.scale);
  const delta=new THREE.Vector3(...spec.offset);
  preview.position.add(delta);
  preview.name='REPOSITIONED_IFC_SOFA_'+spec.key;
  preview.userData={...preview.userData,circulationPreview:true,
    originalGUID:source.mesh.userData.ifc?.guid,sourceRegion:spec.key};
  root.add(preview);root.updateWorldMatrix(true);
  const box=new THREE.Box3().setFromObject(preview);
  sourceSet.add(source);
  colliders.push({mesh:preview,box,category:'furniture',layer:source.layer});
  placements.push({id:spec.key,label:spec.label,sourceMatched:true,
    sourceGUID:source.mesh.userData.ifc?.guid,
    offsetMetres:delta.toArray(),originalUnmodified:true,
    previewFootprint:box.getSize(new THREE.Vector3()).toArray(),
    rationale:spec.reason});
 }
 const upstairs=placements.find(p=>p.id==='first-floor');
 return {root,sourceSet,colliders,placements,
  summary:{sourceMatched:upstairs?.sourceMatched??false,
   sourceGUID:upstairs?.sourceGUID,offsetMetres:upstairs?.offsetMetres,
   originalUnmodified:true,
   previewFootprint:upstairs?.previewFootprint,
   rationale:upstairs?.rationale,
   groundSittingRoom:placements.find(p=>p.id==='ground-sitting')??null,
   presentations:placements}};
}
