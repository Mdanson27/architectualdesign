import * as THREE from 'three';

// Only named, generated Stage 8 decorative foliage qualifies in the current
// house. No IFC mesh, door, collider, light or architecture is simplified.
export const FOLIAGE_LOD_POLICY=Object.freeze({enterMetres:18,exitMetres:14,widthSegments:6,heightSegments:4});
export function isDecorativeFoliage(o){
 return o?.name==='STAGE8_TROPICAL_FOLIAGE_GROUP'&&o.userData?.stage8===true&&
  o.userData?.visualConceptOnly===true&&o.geometry?.type==='SphereGeometry'&&
  o.geometry.parameters?.widthSegments>=9&&o.geometry.parameters?.heightSegments>=7;
}
export function foliageLodChoice(distance,previous,allow=true){
 if(!allow||!Number.isFinite(distance))return false;
 return previous?distance>FOLIAGE_LOD_POLICY.exitMetres:distance>=FOLIAGE_LOD_POLICY.enterMetres;
}
const triangleCount=g=>(g.index?.count??g.attributes.position.count)/3;
export function createFoliageLodProxy(objects,transforms,sourceRecords,remainingBytes){
 if(objects.length<2||objects.some(o=>sourceRecords.has(o)||!isDecorativeFoliage(o)))return null;
 const first=objects[0],radius=first.geometry.parameters.radius;
 if(!Number.isFinite(radius)||radius<=0||objects.some(o=>o.geometry.parameters.radius!==radius||o.material!==first.material))return null;
 const geometry=new THREE.SphereGeometry(radius,FOLIAGE_LOD_POLICY.widthSegments,FOLIAGE_LOD_POLICY.heightSegments);
 const cost=Object.values(geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(geometry.index?.array.byteLength??0)+objects.length*64;
 const trianglesSaved=objects.reduce((n,o)=>n+triangleCount(o.geometry),0)-objects.length*triangleCount(geometry);
 if(cost>remainingBytes||trianglesSaved<=0){geometry.dispose();return null;}
 const proxy=new THREE.InstancedMesh(geometry,first.material,objects.length);
 transforms.forEach((m,i)=>proxy.setMatrixAt(i,m));proxy.instanceMatrix.needsUpdate=true;
 proxy.computeBoundingBox();proxy.computeBoundingSphere();
 proxy.name='PHASE13_DECORATIVE_FOLIAGE_LOD';proxy.userData={phase10RenderOnly:true,phase13RenderOnly:true,collidable:false};
 proxy.visible=false;proxy.castShadow=first.castShadow;proxy.receiveShadow=first.receiveShadow;
 proxy.renderOrder=first.renderOrder;proxy.layers.mask=first.layers.mask;proxy.frustumCulled=first.frustumCulled;
 return {proxy,geometry,cost,trianglesSaved,instances:objects.length,active:false};
}
