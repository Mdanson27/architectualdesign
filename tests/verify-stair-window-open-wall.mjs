import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIFCWindowGlazing,S1_STAIR_WINDOW} from '../src/phase2/window-glazing.js';
import {buildSourceApertures} from '../src/phase2/door-apertures.js';
import {removeStairSittingWall} from '../src/phase2/plan-circulation.js';
const origin=new THREE.Vector3(90,0,-12);
function rec(name,type,lo,hi,id,cat='proxies',level='ground'){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
 mesh.userData.ifc={name,ifcType:type,guid:id};
 const box=new THREE.Box3(new THREE.Vector3(lo[0]-origin.x,lo[1],lo[2]-origin.z),
 new THREE.Vector3(hi[0]-origin.x,hi[1],hi[2]-origin.z));
 return {mesh,box,category:cat,layer:{level,category:cat}};
}
const wd=rec('WD - 008','IFCBUILDINGELEMENTPROXY',
 [107.02,.32,-7.65],[107.10,5.78,-6.30],'stairwd');
const extWall=rec('SW - 013','IFCWALLSTANDARDCASE',
 [107.05,0,-8.51],[107.25,6.6,-5.36],'exterior','walls');
const walls=[
 rec('SW - 017','IFCWALLSTANDARDCASE',[112.2,0,-9.45],[112.4,3.3,-7.54],'part1','walls'),
 rec('SW - 017','IFCWALLSTANDARDCASE',[112.2,0,-7.54],[112.4,3.3,-6.53],'part2','walls'),
 rec('SW - 017','IFCWALLSTANDARDCASE',[112.2,0,-6.53],[112.4,3.3,-5.56],'part3','walls'),
 rec('SW - 017','IFCWALLSTANDARDCASE',[107.65,0,-5.36],[107.85,3.3,-2.85],'separate','walls')
];
const pristine=[wd,...walls,extWall].map(r=>r.mesh.geometry);
const stair=removeStairSittingWall(walls,origin);
assert.equal(stair.count,3);
assert(walls.slice(0,3).every(r=>r.mesh.userData.clientStairSittingWallRemoved&&!r.mesh.visible));
assert.equal(walls[3].mesh.userData.clientStairSittingWallRemoved,undefined);
const scene=new THREE.Scene();
const sys=createIFCWindowGlazing([wd],scene,()=>true,origin);
assert.equal(sys.summary.windowAssemblies,1);
assert(sys.summary.stairWindow?.groundLevelGlassRemoved);
assert(Math.abs(sys.summary.stairWindow.displayBottomY-S1_STAIR_WINDOW.visibleBottomY)<.01);
const w=sys.windows[0];
assert.equal(w.source[0],wd);
assert(Math.abs((w.position.y-w.height/2)-S1_STAIR_WINDOW.visibleBottomY)<.001);
assert(Math.abs((w.position.y+w.height/2)-5.78)<.001);
assert(Math.abs(w.width-1.35)<.001);
assert(sys.sourceSet.has(wd));
const registry=buildSourceApertures({doors:[]},[extWall],()=>true,sys);
const cut=registry.cuts.find(c=>c.kind==='window');
assert(cut,'corrected window must still have a genuine exterior wall aperture');
assert(cut.height.x>=S1_STAIR_WINDOW.visibleBottomY-.001);
assert(cut.height.y<5.79);
assert(wd.mesh.visible,'original window source must remain unmodified in memory');
assert.deepEqual([wd,...walls,extWall].map(r=>r.mesh.geometry),pristine);
console.log(JSON.stringify({passed:true,removedDividerWalls:stair.count,
 groundLevelWindowGone:true,trimmedSillY:S1_STAIR_WINDOW.visibleBottomY,
 retainedTopY:5.78,stairGlazingStartsAboveLanding:true,
 exteriorWallRevealedBelowWindow:true,sourceGeometryPreserved:true}));
