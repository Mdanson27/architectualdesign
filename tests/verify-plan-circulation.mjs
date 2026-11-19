import assert from 'node:assert/strict';
import * as THREE from 'three';
import {S1_GROUND_OPENINGS,createPlanCirculationCorrections} from '../src/phase2/plan-circulation.js';
import {buildSourceApertures} from '../src/phase2/door-apertures.js';
function rec(name,lo,hi,id){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,guid:id};
 return {mesh,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)),
  category:'walls',layer:{level:'ground'}};
}
const walls=[
 rec('SW - 017',[112.2,0,-7.54],[112.4,3.3,-6.53],'stair-upper-source'),
 rec('SW - 017',[112.2,0,-6.53],[112.4,3.3,-5.56],'stair-lower-source'),
 rec('SW - 019',[112.2,0,-5.56],[112.4,3.3,.59],'kitchen-partition-source'),
 rec('SW - 019',[115.2,0,-5.56],[115.4,3.3,.59],'other-wall')
];
const snapshots=walls.map(r=>[...r.mesh.geometry.attributes.position.array]);
const scene=new THREE.Scene();
const source=createPlanCirculationCorrections(walls,scene,new THREE.Vector3());
assert.equal(S1_GROUND_OPENINGS.length,3);
assert.equal(source.summary.sourceConfirmedOpenings,3);
assert.equal(source.apertures.length,3);
assert(source.apertures.some(p=>p.id==='kitchen-dining-door'));
const registry=buildSourceApertures({doors:[]},walls,()=>true,null,null,source);
assert.equal(registry.planCutCount,3);
assert.equal(registry.summary.planConfirmedCirculationOpenings,3);
for(const location of S1_GROUND_OPENINGS){
 const local=source.apertures.find(x=>x.id===location.id);
 const cut=registry.cuts.find(x=>x.id===location.id);
 assert(cut&&cut.kind==='plan');
 assert(cut.sourceWallMeshes.size>=1);
 const hit={object:local.sourceWallMeshes.values().next().value,
  point:new THREE.Vector3(location.center[0],1.15,location.center[1])};
 assert.equal(registry.permitsOpenDoorWallHit(hit,0),true,'drawing-backed opening must be walkable');
 hit.point.z+=1.35;
 assert.equal(registry.permitsOpenDoorWallHit(hit,0),false,'adjacent structural wall remains solid');
 hit.point.z=location.center[1];
 assert.equal(registry.permitsOpenDoorWallHit(hit,3.3),false,'first-floor wall cannot be made passable');
}
assert.equal(registry.permitsOpenDoorWallHit({object:walls[3].mesh,point:new THREE.Vector3(115.3,1,-2.35)},0),false);
assert.deepEqual(walls.map(r=>[...r.mesh.geometry.attributes.position.array]),snapshots);
console.log(JSON.stringify({passed:true,sourcePlanOpenings:source.apertures.length,
 sourceWallMatches:registry.planCutCount,upperStoreyUntouched:true,
 adjacentWallsSolid:true,originalSourceVerticesUnchanged:true}));
