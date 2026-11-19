import assert from 'node:assert/strict';
import * as THREE from 'three';
import {organizeSourceSittingFurniture} from '../src/phase2/circulation-furniture.js';
import {buildBedroomDecorations} from '../src/phase2/house-enhancements.js';

const scene=new THREE.Scene(),records=[];
function mockSource(name,category,level,center,size){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial());
 m.position.set(...center);m.updateWorldMatrix(true,false);
 m.userData.ifc={name,guid:'IFC-'+records.length};
 scene.add(m);
 const record={mesh:m,box:new THREE.Box3().setFromObject(m),category,layer:{level}};
 records.push(record);return record;
}
const sofa=mockSource('FU - 007','furniture','first',[115.02,3.6,-1.445],[2.5,.6,1.65]);
const groundSofa=mockSource('FU - 007','furniture','ground',[113.9,.3,-6.6],[1.65,.6,2.5]);
const groundBefore=groundSofa.box.clone();
const sofaSnapshot=sofa.mesh.matrixWorld.clone(),sofaBounds=sofa.box.clone();
const sofaBefore=sofa.box.getCenter(new THREE.Vector3());
const moved=organizeSourceSittingFurniture(records,scene,new THREE.Vector3(),()=>true);
assert.equal(moved.summary.sourceMatched,true);
assert.equal(moved.sourceSet.has(sofa),true);
assert.deepEqual(moved.summary.offsetMetres,[1.35,0,-.7]);
assert(sofaSnapshot.equals(sofa.mesh.matrixWorld));
assert(sofaBounds.equals(sofa.box));
assert.equal(moved.colliders.length,2);
assert.equal(moved.summary.groundSittingRoom?.sourceMatched,true);
assert(moved.sourceSet.has(groundSofa));
assert(groundBefore.equals(groundSofa.box),'original sitting-room sofa unchanged');
const groundPreview=moved.colliders.find(r=>r.layer.level==='ground');
assert(groundPreview.box.min.x-groundSofa.box.min.x>.8-.001,'sitting entry unblocked');
assert(moved.colliders[0].box.min.z<sofa.box.min.z-.65);
const sofaAfter=moved.colliders[0].box.getCenter(new THREE.Vector3());
assert(Math.abs(sofaAfter.x-sofaBefore.x-1.35)<.001);
assert(Math.abs(sofaAfter.z-sofaBefore.z+.7)<.001);
assert.equal(moved.root.children.length,2);

const room=new THREE.Scene(),home=[];
const bedGeometry=new THREE.BoxGeometry(1.45,.9,2.18);
const bedMesh=new THREE.Mesh(bedGeometry,new THREE.MeshStandardMaterial());
bedMesh.position.set(109.28,3.75,-1.585);
bedMesh.updateWorldMatrix(true,false);
bedMesh.userData.ifc={name:'FU - 010',guid:'BED'};
room.add(bedMesh);
const bedRecord={mesh:bedMesh,box:new THREE.Box3().setFromObject(bedMesh),category:'furniture',layer:{level:'first'}};
home.push(bedRecord);
const door=new THREE.Mesh(new THREE.BoxGeometry(1.58,2.54,.24));
door.position.set(108.80,4.57,-.06);door.updateWorldMatrix(true,false);
door.userData.ifc={name:'DOO - 003',guid:'DOOR'};
home.push({mesh:door,box:new THREE.Box3().setFromObject(door),category:'proxies',layer:{level:'first'}});
const bedBoxBefore=bedRecord.box.clone(),originalTransform=bedMesh.matrixWorld.clone();
const styled=buildBedroomDecorations(home,room);
assert.equal(styled.visualBeds.length,1);
assert(styled.visualBeds[0].userData.footprint_m[0]<=1.68);
assert(styled.visualBeds[0].userData.footprint_m[1]<=2.06);
assert(styled.circulationCorrections.length>=1,'bed must be repositioned away from source doorway');
assert(styled.circulationCorrections[0].shiftMetres<0);
assert(styled.circulationCorrections[0].doorwayClearanceMetres>=1.17,
 'balcony-facing bedroom doorway must have over 1.17m of approach clearance');
assert(styled.collisionBoxes[0].max.z<bedBoxBefore.max.z);
assert(originalTransform.equals(bedMesh.matrixWorld));
assert(bedRecord.box.equals(bedBoxBefore));
console.log(JSON.stringify({passed:true,sourceSofaUnmodified:true,
 sofaShift:moved.summary.offsetMetres,groundSofaShift:moved.summary.groundSittingRoom.offsetMetres,sourceBedUnmodified:true,
 bedShift:styled.circulationCorrections[0].shiftMetres,
 bedDimensions:styled.visualBeds[0].userData.footprint_m,
 originalIFCGeometryPreserved:true}));
