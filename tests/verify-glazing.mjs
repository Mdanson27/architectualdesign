import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIFCWindowGlazing} from '../src/phase2/window-glazing.js';

let id=0;
function windowProxy(name,x,y,z,w,h,d,level='ground',outside=false){
 const o=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
 o.userData.ifc={name,ifcType:'IFCBUILDINGELEMENTPROXY',guid:'src-'+(++id)};
 const box=new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2));
 return {mesh:o,box,category:'proxies',layer:{level},outside};
}
const source=[
 windowProxy('WD - 007',112,1.55,-3,1.8,2,.08),
 windowProxy('WD - 007',112.05,1.55,-2.81,1.8,2,.08), // duplicate face from source
 windowProxy('WD - 021',119,1.65,-9.4,.7,1.9,.10),
 windowProxy('WD - 022',106,4.95,-5,.1,1.9,.7,'first'),
 windowProxy('WD - 007',190,1.55,-3,1.8,2,.08,'ground',true),
 windowProxy('PILLAR',113,1.55,-3,1.8,2,.08)
];
const scene=new THREE.Scene();
const sys=createIFCWindowGlazing(source,scene,r=>!r.outside);
assert.equal(sys.summary.windowAssemblies,3,'parallel source faces should deduplicate');
assert.equal(sys.summary.replacedProxyComponents,4);
assert.equal(sys.summary.syntheticOpenings,0,'only IFC window positions supported');
assert.equal(sys.sourceSet.size,4);
assert.equal(sys.root.parent,scene);
const panes=[];
sys.root.traverse(o=>{if(o.name==='TRANSPARENT_SOURCE_SIZED_GLAZING')panes.push(o);});
assert.equal(panes.length,3);
assert(panes.every(p=>p.material.transparent&&p.material.opacity<.5&&!p.material.depthWrite));
assert(source.every(r=>r.mesh.visible),'source meshes must not be deleted or changed');
const from=new THREE.Vector3(112,1,-3.85),to=new THREE.Vector3(112,1,-3.10);
assert(sys.blocksTraversal(from,to,0),'window glass must block first-person passage');
assert(!sys.blocksTraversal(to,from,0),'walking away from glazing remains possible');
sys.updateVisibility({floor:'ground',mode:'orbit',sectionEnabled:true});
assert.equal(sys.windows.find(w=>w.level==='first').group.visible,false);
assert.equal(sys.windows.filter(w=>w.level==='ground').every(w=>w.group.visible),true);
sys.updateVisibility({floor:'all',mode:'orbit',sectionEnabled:false});
assert(sys.windows.every(w=>w.group.visible));
console.log(JSON.stringify({passed:true,...sys.summary,sourcePreserved:true,glassBlocksWalking:true,viewModeToggles:true}));
