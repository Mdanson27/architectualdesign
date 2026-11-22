import * as THREE from 'three';
import {STAGE1_PLAN_SKETCHES,insidePolygon,polygonBounds} from './stage1-plan-crosswalk.js';

/**
 * Stage 2 / Studio Anne page 7: room-local, source-floor-snapped TILE SAMPLE.
 * This is a reversible visual comparison, not a verified room finish schedule.
 *
 * Geometry is strictly display-only. No IFC source mesh/triangle/material is
 * mutated, no slabs are replaced, and no collision or walk-surface reference is
 * added. Space polygons are the Stage 1 preliminary outlines; never infer that
 * a tile sample means the room is architect-certified or client-approved.
 */
export const STAGE2_PREVIEW_ROOMS=Object.freeze([
 Object.freeze({id:'G-DINING',label:'Ground-floor Dining',level:'ground',page:7}),
 Object.freeze({id:'G-SITTING',label:'Ground-floor Sitting',level:'ground',page:7}),
 Object.freeze({id:'F-FAMILY',label:'First-floor Family Room',level:'first',page:7})
]);
export const STAGE2_SAMPLE_STYLES=Object.freeze({
 porcelain:Object.freeze({name:'Porcelain / ceramic',texture:'marble',roughness:.43}),
 ash:Object.freeze({name:'Ash wood-look tile',texture:'ash',roughness:.68}),
 caramel:Object.freeze({name:'Caramel wood-look tile',texture:'caramel',roughness:.62})
});
const TILE_METRES=.58;
const JOINT_METRES=.012;
const INSET_METRES=.13;
const FLOOR_LEVELS={ground:0,first:3.3};
const materialSpec=(textures,style)=>{
 const conf=STAGE2_SAMPLE_STYLES[style];
 if(!conf||!textures?.[conf.texture])throw Error('Unknown or missing Stage 2 floor texture: '+style);
 const mat=new THREE.MeshStandardMaterial({
  color:0xffffff,map:textures[conf.texture],roughness:conf.roughness,
  metalness:0,side:THREE.DoubleSide
 });
 return mat;
};
const num=x=>Math.round(x*1000)/1000;
const cornersInside=(x,z,poly)=>{
 const h=TILE_METRES/2+INSET_METRES;
 return [[x-h,z-h],[x+h,z-h],[x+h,z+h],[x-h,z+h]]
 .every(p=>insidePolygon(p,poly));
};
export function createStage2RoomFloorPreview(scene,origin={x:0,z:0},floorSampler,textureMaps){
 if(typeof floorSampler!=='function')throw Error('Source floor sampler is required');
 const root=new THREE.Group();
 root.name='STAGE2_OPTIONAL_NON_COLLIDING_ROOM_FLOOR_FINISH';
 root.visible=false;scene.add(root);
 let current=null,activeMesh=null,activeMaterial=null;
 function clear(){
  if(activeMesh){
   root.remove(activeMesh);activeMesh.geometry.dispose();activeMesh=null;
  }
  if(activeMaterial){activeMaterial.dispose();activeMaterial=null;}
  current=null;root.visible=false;
 }
 function choose(roomId='G-DINING',style='source'){
  if(!STAGE2_PREVIEW_ROOMS.some(x=>x.id===roomId))throw Error('Unregistered Stage 2 pilot room: '+roomId);
  if(style!=='source'&&!STAGE2_SAMPLE_STYLES[style])throw Error('Unsupported flooring sample: '+style);
  clear();
  if(style==='source'){
   return status(roomId,'source');
  }
  const room=STAGE2_PREVIEW_ROOMS.find(x=>x.id===roomId),sketch=STAGE1_PLAN_SKETCHES[roomId];
  if(!sketch||room.level!==sketch.floor)throw Error('Missing matched Stage 1 provisional room outline');
  const poly=sketch.vertices;
  const bounds=polygonBounds(poly);
  const points=[];
  const floorDatum=FLOOR_LEVELS[room.level];
  for(let x=bounds.minX+TILE_METRES/2;x<=bounds.maxX-TILE_METRES/2+1e-5;x+=TILE_METRES){
   for(let z=bounds.minZ+TILE_METRES/2;z<=bounds.maxZ-TILE_METRES/2+1e-5;z+=TILE_METRES){
    if(!cornersInside(x,z,poly))continue;
    const sampled=floorSampler(x-(origin.x||0),z-(origin.z||0),floorDatum);
    const y=sampled?.y;
    if(!Number.isFinite(y)||Math.abs(y-floorDatum)>.17)continue;
    points.push([x-(origin.x||0),y+.012,z-(origin.z||0)]);
   }
  }
  const geo=new THREE.BoxGeometry(TILE_METRES-JOINT_METRES,.008,TILE_METRES-JOINT_METRES);
  const material=materialSpec(textureMaps,style);
  const count=points.length;
  if(count){
   const tiles=new THREE.InstancedMesh(geo,material,count);
   const transform=new THREE.Object3D();
   for(let i=0;i<count;i++){
    transform.position.set(...points[i]);
    transform.updateMatrix();
    tiles.setMatrixAt(i,transform.matrix);
   }
   tiles.instanceMatrix.needsUpdate=true;
   tiles.frustumCulled=false;tiles.castShadow=false;tiles.receiveShadow=false;
   tiles.name='STAGE2_NONCOLLIDING_TILE_SAMPLE_'+roomId+'_'+style;
   tiles.userData={
    previewOnly:true,notAnIFCSurface:true,collidable:false,
    stage1RoomPolygonVerified:false,studioAnnePage:7,roomId,style
   };
   root.add(tiles);activeMesh=tiles;activeMaterial=material;root.visible=true;
  }else{
   geo.dispose();material.dispose();
  }
  current={roomId,style,count,sampledAreaM2:num(count*(TILE_METRES-JOINT_METRES)**2)};
  return status();
 }
 function status(roomId=null,style=null){
  const selectedRoom=roomId||current?.roomId||'G-DINING';
  const selectedStyle=style||current?.style||'source';
  return {
   roomId:selectedRoom,style:selectedStyle,
   placedTiles:current?.count??0,
   sampledAreaM2:current?.sampledAreaM2??0,
   visible:root.visible,
   sourceGeometryUnmodified:true,
   sourceCollisionUnmodified:true,
   stage1RoomPolygonVerified:false,
   clientFinishApproved:false,
   visualComparisonOnly:true,
   page:7
  };
 }
 function updateVisibility(level='all',isWalk=false){
  if(!current||current.count===0){root.visible=false;return;}
  const room=STAGE2_PREVIEW_ROOMS.find(x=>x.id===current.roomId);
  root.visible=isWalk||level==='all'||level===room.level;
 }
 return {root,choose,status,clear,updateVisibility};
}
