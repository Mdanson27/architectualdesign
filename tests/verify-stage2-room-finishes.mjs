import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStage2RoomFloorPreview,STAGE2_PREVIEW_ROOMS,STAGE2_SAMPLE_STYLES}
 from '../src/phase2/stage2-room-finishes.js';
import {STAGE1_PLAN_SKETCHES,insidePolygon} from '../src/phase2/stage1-plan-crosswalk.js';
const scene=new THREE.Scene();
const source=new THREE.Mesh(new THREE.BoxGeometry(12,.2,15),
 new THREE.MeshStandardMaterial({color:0xeeeeee}));
source.position.set(112,.0,-5);scene.add(source);
source.updateMatrixWorld(true);
const sourceGeometry=source.geometry,sourceMaterial=source.material;
const matrixBefore=source.matrixWorld.clone(),sourceCountBefore=scene.children.length;
let sampled=0;
const mats={marble:new THREE.Texture(),ash:new THREE.Texture(),caramel:new THREE.Texture()};
const preview=createStage2RoomFloorPreview(scene,{x:0,z:0},
 (x,z,level)=>{
  sampled++;
  return {y:level};
 },mats);
assert.equal(scene.children.length,sourceCountBefore+1);
assert.equal(preview.root.visible,false);
assert.deepEqual(STAGE2_PREVIEW_ROOMS.map(x=>x.id),
 ['G-DINING','G-SITTING','F-FAMILY']);
assert.deepEqual(Object.keys(STAGE2_SAMPLE_STYLES),
 ['porcelain','ash','caramel']);
assert.equal(preview.status().placedTiles,0);
assert.equal(preview.status().sourceGeometryUnmodified,true);
for(const room of STAGE2_PREVIEW_ROOMS)for(const style of Object.keys(STAGE2_SAMPLE_STYLES)){
 const result=preview.choose(room.id,style);
 assert(result.placedTiles>=20,'Should create actual 3D tiles for '+room.id+' '+style);
 assert(result.sampledAreaM2>0);
 assert.equal(preview.root.visible,true);
 assert.equal(preview.root.children.length,1);
 const mesh=preview.root.children[0];
 assert(mesh.isInstancedMesh,'physical instance meshes, not simulated metadata');
 assert(mesh.count===result.placedTiles);
 assert.equal(mesh.userData.notAnIFCSurface,true);
 assert.equal(mesh.userData.collidable,false);
 assert.equal(mesh.userData.stage1RoomPolygonVerified,false);
 const poly=STAGE1_PLAN_SKETCHES[room.id].vertices;
 const instanced=new THREE.Matrix4(),pos=new THREE.Vector3();
 for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,instanced);pos.setFromMatrixPosition(instanced);
  assert(insidePolygon([pos.x,pos.z],poly),'every tile must remain inside draft room');
  assert(Math.abs(pos.y-(room.level==='first'?3.312:.012))<.001);
 }
 preview.updateVisibility(room.level,false);assert.equal(preview.root.visible,true);
 preview.updateVisibility(room.level==='ground'?'first':'ground',false);
 assert.equal(preview.root.visible,false);
 preview.updateVisibility('all',false);assert.equal(preview.root.visible,true);
 assert.equal(preview.status().clientFinishApproved,false);
 assert.strictEqual(source.geometry,sourceGeometry);
 assert.strictEqual(source.material,sourceMaterial);
 assert(source.matrixWorld.equals(matrixBefore));
}
assert(sampled>100);
assert.throws(()=>preview.choose('UNKNOWN','ash'),/Unregistered/);
assert.throws(()=>preview.choose('G-DINING','unsupported'),/Unsupported/);
const noFloor=createStage2RoomFloorPreview(new THREE.Scene(),{x:0,z:0},()=>null,mats);
const empty=noFloor.choose('G-DINING','porcelain');
assert.equal(empty.placedTiles,0);
assert.equal(noFloor.root.visible,false);
const restored=preview.choose('G-DINING','source');
assert.equal(restored.style,'source');
assert.equal(preview.root.children.length,0);
assert.equal(preview.root.visible,false);
assert.strictEqual(source.geometry,sourceGeometry);
console.log('STAGE2_ROOM_FINISHES_PASSED',JSON.stringify({
 pilotRooms:STAGE2_PREVIEW_ROOMS.map(x=>x.id),
 styles:Object.keys(STAGE2_SAMPLE_STYLES),
 sourceIFCUnmodified:true,sourceCollisionsUnmodified:true,
 real3DTileInstances:true,originalFloorRestored:true,
 approvalStillPending:true
}));
