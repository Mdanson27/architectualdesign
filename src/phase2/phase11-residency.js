import * as THREE from 'three';
export const PHASE11_POLICY=Object.freeze({maxConcurrent:2,nearMetres:5,retentionMs:20000,maxEvictionsPerFrame:2});
export function loadingConcurrency(memory){return Number.isFinite(memory)&&memory<=4?1:2;}
export async function loadLayersInOrder(entries,{load,attach,onError,concurrency=2}){
 const width=Math.max(1,Math.min(2,Math.floor(concurrency)||1)),pending=new Map();
 let next=0,peak=0,loaded=0,failed=0;
 function fill(){while(next<entries.length&&pending.size<width){
  const i=next++;pending.set(i,Promise.resolve().then(()=>load(entries[i])).then(value=>({ok:true,value}),error=>({ok:false,error})));
  peak=Math.max(peak,pending.size);
 }}
 fill();
 for(let i=0;i<entries.length;i++){
  const result=await pending.get(i);pending.delete(i);
  try{if(!result.ok)throw result.error;await attach(entries[i],result.value);loaded++;}
  catch(error){failed++;await onError?.(entries[i],error);}
  fill();
 }
 return {loaded,failed,peak,concurrency:width};
}
// Only privately owned merged buffers may be reclaimed. Source arrays and
// all original collision and visibility data stay resident.
export function createPhase11Residency({policy=PHASE11_POLICY,now=()=>performance.now()}={}){
 const entries=new Map(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),worldBox=new THREE.Box3(),cameraPos=new THREE.Vector3();
 let evictions=0,reentries=0,reclaimedBytes=0,nearCount=0,viewCount=0,remaining=0,time=0,enabled=false;
 function begin(camera,renderer){
  enabled=Boolean(camera?.isCamera&&!renderer.shadowMap?.enabled);if(!enabled)return;
  camera.updateMatrixWorld(true);camera.getWorldPosition(cameraPos);
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projection,camera.coordinateSystem);
  time=now();remaining=policy.maxEvictionsPerFrame;nearCount=0;viewCount=0;
 }
 function observe(batch,{owned=false,active=false,bytes=0}={}){
  if(!enabled||!owned||!batch.frustumCulled||!batch.geometry?.boundingBox)return;
  let entry=entries.get(batch);
  if(!entry){entry={resident:false,evicted:false,lastNear:time};entries.set(batch,entry);}
  worldBox.copy(batch.geometry.boundingBox).applyMatrix4(batch.matrixWorld);
  const inView=frustum.intersectsObject(batch),near=worldBox.distanceToPoint(cameraPos)<=policy.nearMetres;
  if(inView)viewCount++;if(near)nearCount++;
  if(inView||near)entry.lastNear=time;
  if(active&&inView){if(entry.evicted){reentries++;entry.evicted=false;}entry.resident=true;}
  else if(!inView&&!near&&entry.resident&&remaining>0&&time-entry.lastNear>=policy.retentionMs){
   batch.geometry.dispose();entry.resident=false;entry.evicted=true;
   evictions++;reclaimedBytes+=bytes;remaining--;
  }
 }
 function status(){return {automatic:true,tracked:entries.size,near:nearCount,inView:viewCount,
  resident:[...entries.values()].filter(e=>e.resident).length,evictions,reentries,cumulativeEvictedBufferBytes:reclaimedBytes,
  retentionMs:policy.retentionMs,sourceGeometryRetained:true,sharedAssetsUntouched:true};}
 return {begin,observe,status,clear(){entries.clear();}};
}
