import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Phase 10: a presentation-only draw batching pass.
 * Original objects remain authoritative for raycasts, collision, source IDs,
 * visibility controls and inspection. A batch replaces drawing, never data.
 * If any original changes, that entire batch falls back immediately.
 */
export const PHASE10_BUDGET=Object.freeze({
 cellMetres:8,maxBatchVertices:100000,maxExtraBytes:32*1024*1024,
 targetRepresentativeDrawCalls:800
});
function bytes(g){
 return Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+
  (g.index?.array.byteLength??0);
}
function eligible(o){
 const g=o.geometry,m=o.material;
 return o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&!o.isBatchedMesh&&
  !o.children.length&&o.visible&&g?.isBufferGeometry&&
  m?.isMeshStandardMaterial&&!m.transparent&&m.opacity===1&&
  m.alphaTest===0&&!m.wireframe&&!m.displacementMap&&
  !m.clippingPlanes?.length&&!m.vertexColors&&!o.morphTargetInfluences&&
  !Object.keys(g.morphAttributes??{}).length&&
  g.drawRange.start===0&&
  g.drawRange.count>=(g.index?.count??g.attributes.position?.count??Infinity)&&
  g.attributes.position?.itemSize===3&&g.attributes.normal?.itemSize===3&&
  Object.values(g.attributes).every(a=>!a.isInterleavedBufferAttribute&&
   !a.isInstancedBufferAttribute&&a.array instanceof Float32Array)&&
  o.onBeforeRender===THREE.Object3D.prototype.onBeforeRender&&
  o.onAfterRender===THREE.Object3D.prototype.onAfterRender&&
  m.onBeforeCompile===THREE.Material.prototype.onBeforeCompile&&
  o.matrixWorld.determinant()>0;
}
const layout=g=>Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b))
 .map(([k,a])=>k+':'+a.itemSize+':'+a.normalized).join('|')+
 ':'+Boolean(g.index);
function visible(o,root){
 for(let p=o;p;p=p.parent){if(!p.visible)return false;if(p===root)return true;}
 return false;
}
function geometryEqual(a,b){
 if(a===b)return true;
 if(layout(a)!==layout(b))return false;
 const arrays=[...Object.keys(a.attributes).map(k=>[a.attributes[k].array,b.attributes[k].array])];
 if(a.index)arrays.push([a.index.array,b.index.array]);
 return arrays.every(([x,y])=>x.length===y.length&&x.every((v,i)=>v===y[i]));
}
function instanceSafe(matrix){
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 a.setFromMatrixColumn(matrix,0).normalize();b.setFromMatrixColumn(matrix,1).normalize();
 c.setFromMatrixColumn(matrix,2).normalize();
 return matrix.determinant()>0&&Math.abs(a.dot(b))<1e-5&&
  Math.abs(a.dot(c))<1e-5&&Math.abs(b.dot(c))<1e-5;
}
function shapeKey(g){
 // Built-in primitive parameters are a cheap grouping hint ONLY: verify
 // exact buffers before sharing. Imported IFC buffers use reference identity.
 const types=['BoxGeometry','CylinderGeometry','SphereGeometry','PlaneGeometry',
  'ConeGeometry','TorusGeometry','RoundedBoxGeometry'];
 return types.includes(g.type)&&g.parameters?
  g.type+JSON.stringify(g.parameters):g.uuid;
}
const signature=o=>[o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,
 o.frustumCulled].join(':');
export function createPhase10Renderer({scene,roots=[],sourceRecords=[],budget=PHASE10_BUDGET}={}){
 if(!scene)throw Error('Phase 10 needs the production scene');
 const source=new Map(sourceRecords.map(r=>[r.mesh,r]));
 const batches=[],stats={sourceMeshes:0,generatedMeshes:0,mergedBatches:0,
  instancedBatches:0,extraBytes:0,eligibleMeshes:0,skippedBudget:0,
  lastActiveBatches:0,lastReplacedDraws:0,lastSavedSubmissions:0};
 let disposed=false;
 scene.updateMatrixWorld(true);
 const box=new THREE.Box3(),center=new THREE.Vector3();
 function addBatch(root,objects,instanced=false){
  if(objects.length<2)return;
  const first=objects[0],inverse=root.matrixWorld.clone().invert();
  const transforms=objects.map(o=>inverse.clone().multiply(o.matrixWorld));
  if(instanced&&!transforms.every(instanceSafe))return;
  const estimate=instanced?objects.length*64:objects.reduce((n,o)=>n+bytes(o.geometry),0);
  if(stats.extraBytes+estimate>budget.maxExtraBytes){stats.skippedBudget+=objects.length;return;}
  let batch;
  if(instanced){
   batch=new THREE.InstancedMesh(first.geometry,first.material,objects.length);
   transforms.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();
  }else{
   const copies=objects.map((o,i)=>o.geometry.clone().applyMatrix4(transforms[i]));
   let g;
   try{g=mergeGeometries(copies,false);}finally{copies.forEach(c=>c.dispose());}
   if(!g)return;
   g.computeBoundingBox();g.computeBoundingSphere();
   const actual=bytes(g);
   if(stats.extraBytes+actual>budget.maxExtraBytes){g.dispose();stats.skippedBudget+=objects.length;return;}
   batch=new THREE.Mesh(g,first.material);
  }
  batch.name='PHASE10_RENDER_ONLY_BATCH';
  batch.userData={phase10RenderOnly:true,collidable:false};
  batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
  batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
  batch.frustumCulled=first.frustumCulled;batch.visible=false;
  root.add(batch);
  const members=objects.map(o=>({
   o,parent:o.parent,geometry:o.geometry,material:o.material,
   world:o.matrixWorld.clone(),flags:signature(o),
   attributeVersions:Object.entries(o.geometry.attributes).map(([k,a])=>[k,a,a.version]),
   index:o.geometry.index,indexVersion:o.geometry.index?.version
  }));
  batches.push({root,batch,members,instanced});
  stats.extraBytes+=instanced?estimate:bytes(batch.geometry);
  stats[instanced?'instancedBatches':'mergedBatches']++;
  for(const o of objects)stats[source.has(o)?'sourceMeshes':'generatedMeshes']++;
 }
 const unique=[...new Set(roots.filter(Boolean))].filter(r=>
  !roots.some(other=>other&&other!==r&&(()=>{for(let p=r.parent;p;p=p.parent)if(p===other)return true;return false;})()));
 for(const root of unique){
  const groups=new Map();
  root.traverse(o=>{
   if(!eligible(o)||!visible(o,root))return;
   // Keep source level/category visibility cohorts together; sector bins
   // avoid defeating frustum culling with one building-wide giant mesh.
   o.geometry.computeBoundingBox();
   box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).getCenter(center);
   const rec=source.get(o);
   const key=[o.material.uuid,layout(o.geometry),signature(o),
    rec?rec.layer.level+':'+rec.category:'generated',
    Math.floor(center.x/budget.cellMetres),Math.floor(center.y/3.3),
    Math.floor(center.z/budget.cellMetres)].join('/');
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(o);stats.eligibleMeshes++;
  });
  // Prefer exact shared primitives (no duplicated vertex buffers).
  for(const objects of groups.values()){
   const shapes=new Map(),consumed=new Set();
   for(const o of objects){
    const k=shapeKey(o.geometry);
    if(!shapes.has(k))shapes.set(k,[]);shapes.get(k).push(o);
   }
   for(const same of shapes.values()){
    if(same.length<3||!same.every(o=>geometryEqual(same[0].geometry,o.geometry)))continue;
    const n=batches.length;addBatch(root,same,true);
    if(batches.length>n)same.forEach(o=>consumed.add(o));
   }
   let chunk=[],vertices=0;
   for(const o of objects){
    if(consumed.has(o))continue;
    const count=o.geometry.attributes.position.count;
    if(count>budget.maxBatchVertices)continue;
    if(vertices+count>budget.maxBatchVertices){addBatch(root,chunk);chunk=[];vertices=0;}
    chunk.push(o);vertices+=count;
   }
   addBatch(root,chunk);
  }
 }
 function valid(m,root){
  const o=m.o,g=o.geometry;
  return o.parent===m.parent&&g===m.geometry&&o.material===m.material&&
   o.matrixWorld.equals(m.world)&&signature(o)===m.flags&&
   visible(o,root)&&o.material.visible&&g.index===m.index&&
   g.index?.version===m.indexVersion&&
   m.attributeVersions.every(([k,a,v])=>a.version===v&&g.attributes[k]===a)&&
   !o.children.length&&!o.morphTargetInfluences&&
   g.drawRange.start===0&&g.drawRange.count>=(g.index?.count??g.attributes.position.count)&&
   o.onBeforeRender===THREE.Object3D.prototype.onBeforeRender&&
   o.onAfterRender===THREE.Object3D.prototype.onAfterRender;
 }
 function render(renderer,camera,{optimized=true}={}){
  if(disposed||!optimized){renderer.render(scene,camera);return;}
  // Synchronize matrices before validating batches. Objects are hidden ONLY
  // during the synchronous render call; raycast and scene queries see originals.
  scene.updateMatrixWorld();
  const active=[];
  stats.lastActiveBatches=0;stats.lastReplacedDraws=0;stats.lastSavedSubmissions=0;
  try{
   for(const b of batches){
    const m=b.batch.material;
    if(!b.root.visible||m.transparent||m.opacity!==1||m.alphaTest!==0||
     m.wireframe||m.displacementMap||m.clippingPlanes?.length||
     m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||
     !b.members.every(member=>valid(member,b.root)))continue;
    b.batch.visible=true;active.push(b);
    for(const m of b.members)m.o.visible=false;
    stats.lastActiveBatches++;stats.lastReplacedDraws+=b.members.length;
    stats.lastSavedSubmissions+=b.members.length-1;
   }
   renderer.render(scene,camera);
  }finally{
   for(const b of active){
    b.batch.visible=false;for(const m of b.members)m.o.visible=true;
   }
  }
 }
 function status(){return {...stats,automatic:true,originalMeshesRetained:true,
  maxExtraBytes:budget.maxExtraBytes,batches:batches.length};}
 function dispose(){
  if(disposed)return;disposed=true;
  for(const b of batches){
   b.root.remove(b.batch);
   if(b.instanced)b.batch.dispose();else b.batch.geometry.dispose();
  }
 }
 return {render,status,dispose};
}

/** Exact broad-phase equivalent of the existing nearby() filter. Large boxes
 * are indexed in every intersected cell, or put in a small overflow list.
 * Stable input order preserves raycast tie-breaking. Visibility stays live. */
export function createPhase10SpatialIndex(records,cellSize=2){
 const cells=new Map(),overflow=[],ord=new Map();
 const key=(x,z)=>x+','+z;
 records.forEach((r,i)=>{
  ord.set(r,i);const b=r.box;
  if(!b||![b.min.x,b.max.x,b.min.z,b.max.z].every(Number.isFinite)){overflow.push(r);return;}
  const a=Math.floor(b.min.x/cellSize),c=Math.floor(b.max.x/cellSize);
  const d=Math.floor(b.min.z/cellSize),e=Math.floor(b.max.z/cellSize);
  if((c-a+1)*(e-d+1)>256){overflow.push(r);return;}
  for(let x=a;x<=c;x++)for(let z=d;z<=e;z++){
   const k=key(x,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(r);
  }
 });
 let queries=0,examined=0,fullScanEquivalent=0;
 function query(x,y,z,dist,visibleRecord){
  const found=new Set(overflow);
  for(let i=Math.floor((x-dist)/cellSize);i<=Math.floor((x+dist)/cellSize);i++)
   for(let j=Math.floor((z-dist)/cellSize);j<=Math.floor((z+dist)/cellSize);j++)
    for(const r of cells.get(key(i,j))??[])found.add(r);
  queries++;examined+=found.size;fullScanEquivalent+=records.length;
  return [...found].sort((a,b)=>ord.get(a)-ord.get(b)).filter(r=>{
   if(!r.box||!visibleRecord(r))return false;
   const b=r.box;
   return x>=b.min.x-dist&&x<=b.max.x+dist&&z>=b.min.z-dist&&
    z<=b.max.z+dist&&y>=b.min.y-2&&y<=b.max.y+3;
  });
 }
 return {query,status:()=>({records:records.length,cells:cells.size,
  overflow:overflow.length,queries,examined,fullScanEquivalent})};
}
