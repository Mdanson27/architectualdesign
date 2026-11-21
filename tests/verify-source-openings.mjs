import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildSourceApertures,revealObstructedDoors} from '../src/phase2/door-apertures.js';
const wallMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
wallMesh.userData.ifc={name:'SW - 004',guid:'wall-guid'};
const wall={mesh:wallMesh,category:'walls',box:new THREE.Box3(
 new THREE.Vector3(-1.7,0,-.17),new THREE.Vector3(1.7,2.72,.17))};
const windowWallMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
windowWallMesh.userData.ifc={name:'SW - 010',guid:'window-wall-guid'};
const windowWall={mesh:windowWallMesh,category:'walls',box:new THREE.Box3(
 new THREE.Vector3(2.4,0,-.15),new THREE.Vector3(4.2,2.65,.15))};
const furnitureMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
furnitureMesh.userData.ifc={name:'FU - 009',guid:'furnishing-guid'};
const furniture={mesh:furnitureMesh,category:'furniture',box:new THREE.Box3(
 new THREE.Vector3(-.22,.3,-.18),new THREE.Vector3(.22,1.7,.18))};
const door={id:1,position:new THREE.Vector3(0,1.2,0),
 groundY:0,height:2.4,width:.98,alongX:true,current:0,
 visual:{visible:true},source:[{mesh:{userData:{ifc:{guid:'door-guid'}}}}]};
const glassGroup=new THREE.Group();glassGroup.userData.sourceGUIDs=['window-guid'];
const window={position:new THREE.Vector3(3.3,1.55,0),width:1.3,height:1.8,
 alongX:true,group:glassGroup};
const rows=[wall,windowWall,furniture];
const system={doors:[door]},windows={windows:[window]};
const reg=buildSourceApertures(system,rows,()=>true,windows);
assert.equal(reg.doorCutCount,1);
assert.equal(reg.windowCutCount,1);
assert.equal(reg.sourceWallSet.size,2);
const at=(object,x,y,z)=>({object,point:new THREE.Vector3(x,y,z)});
const wallHit=at(wallMesh,.2,1.1,.10);
assert.equal(reg.permitsOpenDoorWallHit(wallHit,0),false,'closed door never lets person pass');
door.current=1;
assert.equal(reg.permitsOpenDoorWallHit(wallHit,0),true,'open door filters verified wall');
assert.equal(reg.permitsOpenDoorWallHit(at(windowWallMesh,3.3,1.1,.11),0),false,'windows remain closed to passage');
assert.equal(reg.permitsOpenDoorWallHit(at(furnitureMesh,0,1.1,.10),0),false,'furniture is not selectively invisible');
assert.equal(reg.permitsOpenDoorWallHit(at(wallMesh,1.5,1.1,.10),0),false,'no removal outside source opening');
assert.equal(reg.permitsOpenDoorWallHit(at(wallMesh,.20,2.67,.1),0),false,'lintel remains solid');
door.current=0;
assert.equal(reg.permitsOpenDoorWallHit(wallHit,0),false,'closing restores collision');
const material=new THREE.MeshStandardMaterial();
const old=[...wallMesh.geometry.attributes.position.array];
const shaderCut=revealObstructedDoors(material,system,rows,()=>true,windows);
assert.equal(shaderCut.obstructedCount,1);
assert.equal(shaderCut.windowObstructedCount,1);
assert.equal(shaderCut.summary.noSourceVerticesModified,true);
assert.deepEqual([...wallMesh.geometry.attributes.position.array],old);
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
wallMesh.material.onBeforeCompile(shader,{});
assert(shader.fragmentShader.includes('uDoorCount'));
assert(shader.fragmentShader.includes('discard'));
assert(shader.vertexShader.includes('vHouseWorldPoint'));
shaderCut.restore();
assert.equal(material.onBeforeCompile,THREE.Material.prototype.onBeforeCompile);
console.log(JSON.stringify({passed:true,
 doorAndWindowCutouts:[reg.doorCutCount,reg.windowCutCount],
 openDoorPasses:true,closedDoorBlocks:true,glassBlocks:true,
 furnitureBlocks:true,adjacentWallRetained:true,lintelRetained:true,
 originalGeometryUnmodified:true}));
