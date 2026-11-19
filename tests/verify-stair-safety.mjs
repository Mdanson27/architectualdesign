import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSourceStairSafety} from '../src/phase2/stair-safety.js';

const scene=new THREE.Scene();
const records=[];
function put(name,bounds,category='proxies',guid=name){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
 mesh.userData.ifc={name,guid};
 const box=new THREE.Box3(new THREE.Vector3(...bounds[0]),new THREE.Vector3(...bounds[1]));
 const rec={mesh,box,category,layer:{level:'none'}};
 records.push(rec);return rec;
}
const orig=[];
// Two source flights: 9 lower treads and 9 upper treads, with one IFC landing.
for(let i=0;i<9;i++){
 const y=.15+i*.174,x=110.6-i*.272;
 orig.push(put('SF TREAD - '+String(i+59).padStart(3,'0'),[[x,y,-6.83],[x+.30,y+.025,-5.56]],'proxies','lower'+i));
}
orig.push(put('SL TREAD - 005',[[107.25,1.71,-8.51],[108.48,1.74,-5.56]],'proxies','landing'));
for(let i=0;i<9;i++){
 const y=1.89+i*.173,x=108.45+i*.272;
 orig.push(put('SF TREAD - '+String(i+68).padStart(3,'0'),[[x,y,-8.51],[x+.30,y+.025,-7.24]],'proxies','upper'+i));
}
// Detached original stair must remain unmodified and must not be duplicated.
put('SF TREAD - 076',[[31.1,3.27,-27.0],[31.4,3.3,-25.6]],'proxies','detached');
const before=orig.map(r=>r.box.clone());
const sys=createSourceStairSafety(records,scene,r=>r.box.getCenter(new THREE.Vector3()).x>100);
assert(sys.sourceVerified);
assert.equal(sys.summary.sourceTreads,18);
assert.equal(sys.summary.originalLanding,1);
assert(Math.abs(sys.summary.upperFloorMetres-3.3)<.03);
assert(Math.abs(sys.summary.intermediateLandingMetres-1.74)<.03);
assert.equal(sys.summary.firstFloorVoidGuard,1);
assert.equal(sys.summary.wallHandrails,3);
assert.equal(sys.summary.engineeredOrCodeCertified,false);
assert.equal(sys.summary.existingIFCChanged,false);
assert.equal(sys.summary.upperStairExitUnobstructed,true);
assert.equal(sys.summary.guardHeightMetres,1.05);
assert.equal(sys.root.parent,scene);
assert(sys.root.children.some(o=>o.name.startsWith('CONTINUOUS_HANDRAIL_CENTRE_U_FLIGHTS')));
assert(sys.root.children.some(o=>o.name.startsWith('VERTICAL_GUARD_BALUSTER')));
assert(sys.root.children.some(o=>o.name.startsWith('WALL_HANDRAIL')));
assert(sys.root.children.some(o=>o.name.startsWith('GUARD_POST_FIRST_FLOOR_VOID_EDGE')));
assert.equal(sys.transitionDeck.name,'SOURCE_STAIR_FIRST_FLOOR_TRANSITION_NOSING');
assert(Math.abs(sys.walkSurfaceBox.max.y-3.3)<.03);
assert(sys.walkSurfaceBox.max.x>110.9&&sys.walkSurfaceBox.max.x<111.12);
for(let i=0;i<orig.length;i++)assert(before[i].equals(orig[i].box));
const crossing=()=>sys.blocksTraversal(
 new THREE.Vector3(111.26,4.3,-6.2),
 new THREE.Vector3(111.00,4.3,-6.2),3.3,.32);
assert(crossing(),'Guard must block walking from first-floor corridor into stairwell void');
assert(!sys.blocksTraversal(
 new THREE.Vector3(110.85,4.3,-7.86),
 new THREE.Vector3(111.08,4.3,-7.86),3.3,.32),
 'Upper flight to first-floor hallway remains open');
assert(!sys.blocksTraversal(
 new THREE.Vector3(109.25,2.15,-7.86),
 new THREE.Vector3(109.33,2.20,-7.85),1.1,.32),
 'Walking down the actual upper flight must remain possible');
const empty=createSourceStairSafety([],new THREE.Scene());
assert.equal(empty.sourceVerified,false);
assert.equal(empty.root,null);
assert.equal(empty.blocksTraversal(),false);
console.log(JSON.stringify({
 passed:true,originalStairsPreserved:true,treads:sys.summary.sourceTreads,
 landing:sys.summary.originalLanding,guardHeightMetres:1.05,
 firstFloorVoidProtected:true,stairEgressOpen:true,walkBarrier:true,
 jointTrim:sys.summary.transitionJointMetres,
 guardSegments:sys.colliders.length,sourceRequired:true,
 certifiedStructuralSafety:false
}));
