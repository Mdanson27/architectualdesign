import assert from 'node:assert/strict';
import * as THREE from 'three';
import {removeClientStairKitchenAndResidues} from '../src/phase2/plan-circulation.js';
import {createMainEntranceWallFinish} from '../src/phase2/open-plan-access.js';

const make=(name,guid,category,lo,hi)=> {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0xe8dfd2}));
 mesh.userData.ifc={guid,name};
 return {mesh,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)),
  category,layer:{level:'ground',category}};
};
const source=[
 make('SW - 014','1lVwkcz9XBkQIrsx_xVXUu','walls',
  [107.646,0,-5.558],[112.396,3.3,-5.358]),
 make('SW - 004','2$qga8Ea5CvumTP2BzXjlD','walls',
  [110.815,0,-5.228],[112.196,3.3,-5.223]),
 make('SW - 004','3nJ31WBuP5AQkjGckLOjHr','walls',
  [107.851,0,-5.228],[110.815,1.634,-5.223]),
 make('SW - 004','3uPzCMyXn5FgosjoRS5TBi','walls',
  [107.851,1.634,-5.358],[110.815,3.3,-5.353]),
 make('SW - 004','1phXQF8Qv7jRzXUT4NHrPi','walls',
  [109.479,0,-5.568],[110.894,6.6,-5.548]),
 make('CRE - 001','3kAl0gHyX6ihgy9PBZMVtT','columns',
  [112.176,0,-6.542],[112.196,3.1,-6.522]),
 make('CRE - 001','1xo0ba7TzEN8lQogEQUDNP','columns',
  [112.176,0,-7.552],[112.196,3.1,-7.532]),
 make('SW - 018','genuine-exterior','walls',
  [107.646,0,.563],[112.396,3.3,.763])
];
for(let i=0;i<59;i++){
 const z=-2.18+i*.025;
 source.push(make('CRE - 001','rib-'+i,'columns',
  [112.391,0,z],[112.411,.805,z+.020]));
}
const originalMeshes=source.map(r=>r.mesh.geometry);
const cleaned=removeClientStairKitchenAndResidues(source,new THREE.Vector3());
const count=cleaned.summary;
assert.deepEqual([
 count.groundKitchenStairWallHidden,count.groundKitchenStairFacesHidden,
 count.oldStairRoomPostsHidden,count.kitchenRibColumnsHidden,
 count.upperFaceGroundClipped
],[1,3,2,59,1]);
assert.equal(cleaned.concealed.size,65);
assert([...cleaned.concealed].every(r=>!r.mesh.visible&&
 r.mesh.userData.clientKitchenStairPartitionRemoved));
assert(source.find(r=>r.mesh.userData.ifc.guid==='genuine-exterior').mesh.visible,
 'real exterior kitchen wall must remain fully enclosed');
const tall=cleaned.upperFace;
assert(tall&&tall.mesh.visible&&tall.mesh.userData.clientStairKitchenGroundFaceClipped);
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',
 fragmentShader:'#include <clipping_planes_fragment>'};
tall.mesh.material.onBeforeCompile(shader,{});
assert(shader.vertexShader.includes('vClientStairKitchenWorldY'));
assert(shader.fragmentShader.includes('vClientStairKitchenWorldY<3.295'),
 'ground floor portion of two-storey face must be concealed');
assert.deepEqual(source.map(r=>r.mesh.geometry),originalMeshes,
 'original IFC geometry must never change');

const entranceWall=make('SW - 022','2axYJRzojAfxQ3W1Phspg0',
 'walls',[116.916,0,-4.488],[117.116,3.3,.053]);
const door={
 id:27,level:'ground',alongX:false,
 position:new THREE.Vector3(117.014,1.268,-3.496),
 groundY:0,width:1.574,height:2.537
};
const scene=new THREE.Scene();
const envelope=createMainEntranceWallFinish({doors:[door]},
 [entranceWall],scene,new THREE.Vector3());
assert.equal(envelope.summary.mainDoubleDoorId,27);
assert.equal(envelope.colliders.length,2);
assert.equal(envelope.visuals.length,3);
const doorPoint=new THREE.Vector3(117.014,1.2,-3.496);
const windowPoint=new THREE.Vector3(117.014,1.2,-1.2);
for(const c of envelope.colliders){
 assert(!c.box.containsPoint(doorPoint),'main double doorway must remain open');
 assert(!c.box.containsPoint(windowPoint),'existing dining window must not be walled over');
}
assert(scene.children.includes(envelope.root));
assert(entranceWall.mesh.visible,'genuine entrance source wall must remain intact');
console.log(JSON.stringify({passed:true,removedKitchenPartition:true,
 invisibleStairPosts:2,removedRibColumns:59,groundOnlyFaceClipped:true,
 genuineExteriorAndUpperWallsPreserved:true,mainDoorEnclosed:true,
 door27WalkwayUnobstructed:true}));
