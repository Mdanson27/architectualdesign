import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIFCWindowGlazing} from '../src/phase2/window-glazing.js';
import {revealObstructedDoors} from '../src/phase2/door-apertures.js';
import {repairKitchenDoorCounterIntrusion,S1_GROUND_OPENINGS} from '../src/phase2/plan-circulation.js';

const shared=new THREE.MeshStandardMaterial({color:0xe8dfd2});
function record(name,guid,category,lo,hi,level='ground',material=shared){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
 mesh.userData.ifc={name,guid,ifcType:category==='proxies'?'IFCBUILDINGELEMENTPROXY':'IFCWALL'};
 return {mesh,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)),
  category,layer:{level}};
}
// These are the two exact browser-verified floating glass frames, not genuine
// exterior windows. Keep one exterior opening to catch accidental over-removal.
const first=record('WD - 201','stair-glass-1','proxies',[112.253,.375,-8.177],[112.339,2.525,-7.527]);
const second=record('WD - 202','stair-glass-2','proxies',[112.253,.375,-6.547],[112.339,2.525,-5.897]);
const exterior=record('WD - 003','genuine-kitchen-window','proxies',[109.419,.8,.558],[111.219,2.5,.647]);
const windows=createIFCWindowGlazing([first,second,exterior],new THREE.Scene(),()=>true);
assert.equal(windows.summary.stairSittingOpenGlassAssembliesRemoved,2);
assert.equal(windows.windows.length,1);
assert.equal(windows.sourceSet.size,3);
assert.equal(first.mesh.visible,false);
assert.equal(second.mesh.visible,false);
assert.equal(windows.windows[0].source[0],exterior);
const walkFrom=new THREE.Vector3(111.9,1.5,-7.85),
      walkTo=new THREE.Vector3(112.55,1.5,-7.85);
assert.equal(windows.blocksTraversal(walkFrom,walkTo,0),false);
assert.equal(windows.summary.removedInteriorGlassSourceGuids.length,2);

// Original kitchen partition and perpendicular front-facing exterior wall.
const kitchen=record('SW - 019','kitchen-divider','walls',
 [112.2,0,-5.56],[112.4,3.3,.59]);
const front=record('SW - 021','real-front-exterior','walls',
 [112.4,0,-.15],[117.12,3.3,.05]);
const originalExteriorMaterial=front.mesh.material;
const opening=S1_GROUND_OPENINGS.find(x=>x.id==='kitchen-dining-open');
const plan={apertures:[{id:opening.id,kind:'plan',cx:112.3,cz:-2.465,
 groundY:0,width:opening.width,height:opening.height,alongX:false,
 sourceWallGuids:['kitchen-divider']}]};
const audit=revealObstructedDoors(shared,{doors:[]},[kitchen,front],()=>true,null,null,plan);
assert.equal(audit.summary.planConfirmedCirculationOpenings,1);
assert.equal(audit.visualCuts[0].sourceWallGuids.includes('real-front-exterior'),false);
assert.equal(audit.visualCuts[0].sourceWallGuids.includes('kitchen-divider'),true);
assert.notStrictEqual(kitchen.mesh.material,shared,'only internal wall receives aperture shader');
assert.strictEqual(front.mesh.material,originalExteriorMaterial,'real exterior wall must remain fully enclosed');
assert.equal(front.mesh.material.onBeforeCompile,THREE.Material.prototype.onBeforeCompile);
audit.restore();
assert.strictEqual(kitchen.mesh.material,shared,'viewer correction must be reversible');

// The obsolete low ribbed SLA-002 pieces have no place in the open bay.
// The remaining full kitchen worktop MUST stay visible.
const divider=[
 record('SLA - 002','rib-1','slabs',[111.94,-.03,-2.23],[111.97,.84,.51]),
 record('SLA - 002','rib-2','slabs',[111.97,-.03,-2.36],[112.46,.84,-2.13]),
 record('SLA - 002','rib-3','slabs',[111.97,.77,-2.26],[112.46,.84,.55])
];
const worktop=record('SLA - 002','genuine-kitchen-worktop','slabs',
 [107.85,.81,-1.49],[111.94,.84,.52]);
const removed=repairKitchenDoorCounterIntrusion([...divider,worktop],
 new THREE.Vector3(),opening);
assert.equal(removed.selected.length,3);
assert(divider.every(r=>r.mesh.userData.clientKitchenDiningDividerRemoved&&!r.mesh.visible));
assert.equal(worktop.mesh.visible,true);
console.log(JSON.stringify({passed:true,floatingStairGlassRemoved:2,
 realExteriorWindowsPreserved:1,kitchenDividerStripsRemoved:3,
 frontFacadeUncut:true,sourceGeometryPreserved:true}));
