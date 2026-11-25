import * as THREE from 'three';
import {createFurnitureAsset,fitFurnitureEnvelope} from './phase14-furniture-library.js';
// Catalogue seating uses local -Z as its forward direction.
export function faceTarget(x,z,tx,tz){
 if(Math.hypot(tx-x,tz-z)<1e-6)throw Error('Facing target coincides with furniture');
 return Math.atan2(x-tx,z-tz);
}
export function facingDot(yaw,x,z,tx,tz){
 const n=Math.hypot(tx-x,tz-z);return n?(-Math.sin(yaw)*(tx-x)-Math.cos(yaw)*(tz-z))/n:0;
}
export function fittedAsset(id,min,max,materials){
 const g=createFurnitureAsset(id,materials?{materials}:{});
 fitFurnitureEnvelope(g,new THREE.Vector3(...min),new THREE.Vector3(...max));
 for(const mesh of g.children)mesh.userData.phase14Asset=id;
 return g;
}
// Replace only generated presentation components, never an IFC mesh.
export function installFittedAsset(group,id,min,max,{mark,materials}={}){
 const asset=fittedAsset(id,min,max,materials),prior=[...group.children].map(o=>({o,visible:o.visible}));
 for(const {o} of prior)o.visible=false;
 for(const mesh of [...asset.children]){
  if(mark)mark(mesh,mesh.userData.component);
  mesh.userData.phase14Asset=id;group.add(mesh);
 }
 group.userData.phase14Asset=id;
 return ()=>{for(const o of [...group.children])if(o.userData.phase14Asset===id){group.remove(o);o.geometry.dispose();}
  for(const {o,visible} of prior)o.visible=visible;delete group.userData.phase14Asset;};
}
export function auditFurniture(roots,records){
 const count={};
 for(const [name,root] of Object.entries(roots)){
  if(!root)continue;
  const row={libraryMeshes:0,legacyMeshes:0,libraryInstances:0,assets:{},rootVisible:root.visible};
  // Count installed objects irrespective of the currently selected floor,
  // but exclude hidden legacy children retained only for reversible disposal.
  root.traverse(o=>{
   if(o.isMesh&&!o.visible)return;
   if(o.isMesh){if(o.userData.phase14Asset)row.libraryMeshes++;else row.legacyMeshes++;}
   if(o.isGroup&&o.userData.phase14Asset){row.libraryInstances++;const id=o.userData.phase14Asset;row.assets[id]=(row.assets[id]??0)+1;}
  });count[name]=row;
 }
 const sourceFurniture=records.filter(r=>r.category==='furniture');
 return {systems:count,sourceFurnitureRecords:sourceFurniture.length,visibleSourceFurnitureRecords:sourceFurniture.filter(r=>r.mesh.visible&&r.mesh.parent?.visible!==false).length,
 unresolved:['IFC/repositioned sectional sofas and coffee tables','bed and wardrobe treatments','kitchen single-worktop concept and retained original cabinetry','wet-area fittings and unverified room boundaries'],clientApproved:false};
}
