import assert from 'node:assert/strict';
import * as THREE from 'three';
import {S1_GROUND_OPENINGS,createPlanCirculationCorrections} from '../src/phase2/plan-circulation.js';
import {buildSourceApertures} from '../src/phase2/door-apertures.js';
import {implementOpenPlanMaidAccess} from '../src/phase2/open-plan-access.js';
function rec(name,lo,hi,id){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,guid:id};
 return {mesh,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)),
  category:'walls',layer:{level:'ground',category:'walls'}};
}
const walls=[
 rec('SW - 017',[112.2,0,-7.54],[112.4,3.3,-6.53],'stair-upper'),
 rec('SW - 017',[112.2,0,-6.53],[112.4,3.3,-5.56],'stair-lower'),
 rec('SW - 019',[112.2,0,-5.56],[112.4,3.3,.59],'kitchen'),
 rec('SW - 023',[112.4,0,-4.49],[117.12,3.3,-4.29],'sitting-dining'),
 rec('SW - 019',[115.2,0,-5.56],[115.4,3.3,.59],'other-wall')
];
const originals=walls.map(r=>r.mesh.geometry);
const source=createPlanCirculationCorrections(walls,new THREE.Scene(),new THREE.Vector3());
assert.equal(S1_GROUND_OPENINGS.length,3);
assert.equal(source.summary.sourceConfirmedOpenings,3);
assert.equal(source.summary.internalDoorCount,0);
assert.equal(source.summary.openConcept,true);
assert.equal(source.kitchenDoor,null);
assert.equal(source.apertures.length,3);
assert(source.apertures.every(p=>p.width>1.6));
assert(source.apertures.find(p=>p.id==='kitchen-dining-open').width>5);
assert(source.apertures.find(p=>p.id==='sitting-dining-open').width>4);
const registry=buildSourceApertures({doors:[]},walls,()=>true,null,null,source);
assert.equal(registry.planCutCount,3);
for(const plan of S1_GROUND_OPENINGS){
 const aperture=source.apertures.find(p=>p.id===plan.id);
 const cut=registry.cuts.find(c=>c.id===plan.id&&c.kind==='plan');
 assert(cut&&cut.sourceWallMeshes.size>0,plan.id+' needs actual source wall');
 const hit={object:[...aperture.sourceWallMeshes][0],
   point:new THREE.Vector3(plan.center[0],1.55,plan.center[1])};
 assert(registry.permitsOpenDoorWallHit(hit,0),plan.id+' must be walkable at its centre');
 if(plan.alongX)hit.point.x+=plan.width/2+.5;
 else hit.point.z+=plan.width/2+.5;
 assert.equal(registry.permitsOpenDoorWallHit(hit,0),false,'end pier must remain solid');
 hit.point=new THREE.Vector3(plan.center[0],4.6,plan.center[1]);
 assert.equal(registry.permitsOpenDoorWallHit(hit,3.3),false,'upstairs floor must not be cut');
}
assert.equal(registry.permitsOpenDoorWallHit(
 {object:walls[4].mesh,point:new THREE.Vector3(115.3,1,-2.35)},0),false);
assert.deepEqual(walls.map(r=>r.mesh.geometry),originals);
function mockDoor(id,x,z,level='ground'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(1,2.5,.2));
 m.userData.ifc={guid:'door-'+id};
 return {id,level,position:new THREE.Vector3(x,1.3,z),visual:new THREE.Group(),
  source:[{mesh:m}],current:0,target:0};
}
const shifted=new THREE.Vector3(90,0,-12);
const sourceDoor=(id,x,z)=>mockDoor(id,x-shifted.x,z-shifted.z);
const group={doors:[sourceDoor(19,108.22,-13.8),sourceDoor(22,111.76,-11.14),
 sourceDoor(25,114.635,-4.39),sourceDoor(21,111.68,-5.31)]};
const maid=implementOpenPlanMaidAccess(group,new THREE.Scene(),shifted);
assert.deepEqual(maid.removed.map(x=>x.id),[25,22]);
assert(!group.doors[0].removedFromPlan,'exterior maid balcony door must remain intact');
assert(maid.collider.box.containsPoint(new THREE.Vector3(111.76-shifted.x,1.0,-11.14-shifted.z)));
assert(maid.summary.maidInteriorSealed);
assert.equal(maid.summary.activeDoorCount,2);
assert.equal(maid.summary.originalIFCUnmodified,true);
assert.equal(maid.maidWall.geometry.parameters.width,1.02);
console.log(JSON.stringify({passed:true,openZones:source.apertures.length,
 noInteriorDoors:true,maidDoorSealed:true,maidExteriorAccessPreserved:true,
 structuralEndPiersRetained:true,originalIfcUntouched:true}));
