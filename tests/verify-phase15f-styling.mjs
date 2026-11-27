import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STYLE15,createPhase15Style,stylingStats,canPlaceStyle} from '../src/phase2/phase15-styling.js';
import {createPhase15Dining} from '../src/phase2/phase15-dining.js';
const bounds=o=>new THREE.Box3().setFromObject(o,true),rows=[];
for(const id of Object.keys(STYLE15)){
 const pair=[];
 for(const detail of ['high','low']){
  const g=createPhase15Style(id,{detail}),s=stylingStats(g);pair.push(s);
  assert(s.triangles>0&&s.triangles<75000,id+' triangle budget');
  assert.equal(g.userData.anchor,STYLE15[id].anchor);
  g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));if(o.geometry.attributes.normal)assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  if(id.includes('rug')){
   assert(Math.abs(s.min[1])<.001&&s.max[1]<.016,'low profile grounded rug');
   assert(Math.abs(s.dimensions[0]-STYLE15[id].width)<.01);
   assert(Math.abs(s.dimensions[2]-STYLE15[id].depth)<.01);
   const pile=g.getObjectByName('woven-rug-pile');assert(pile.material.map&&pile.material.bumpMap);
   assert(pile.geometry.attributes.normal.getY(0)>.9);
   assert(bounds(pile).min.y-bounds(g.getObjectByName('low-profile-rug-backing')).max.y>=.0025,'rug layers must not be coplanar');
  }
  if(id==='layered-curtains'){
   const l=g.getObjectByName('left-full-height-linen-drape'),r=g.getObjectByName('right-full-height-linen-drape'),ls=g.getObjectByName('left-translucent-sheer'),rs=g.getObjectByName('right-translucent-sheer');
   assert(l&&r&&ls&&rs);assert(bounds(l).max.x<-.8&&bounds(r).min.x>.8);
   assert(bounds(ls).max.x<-.20&&bounds(rs).min.x>.20,'open curtain centre');
   for(const o of [l,r,ls,rs]){const b=bounds(o);assert(b.min.y>=.01&&b.min.y<.03&&b.max.y>2.63);assert(b.max.z-b.min.z>.06,'physical pleats');}
   assert(ls.material.transparent&&ls.material.opacity<.6&&!ls.material.depthWrite);
   assert.equal(g.children.filter(o=>o.name==='concealed-curtain-track-glider').length,20);
   assert(g.userData.installationRequiresOpeningAudit);
  }
  if(id==='cushion-set'){
   const cushions=g.children.filter(o=>o.name==='tailored-throw-cushion');assert.equal(cushions.length,3);
   assert(cushions.some(o=>o.material.map));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(!bounds(cushions[i]).intersectsBox(bounds(cushions[j])));
  }
  if(id==='olive-planter'){
   const pot=bounds(g.getObjectByName('tapered-ceramic-planter')),trunk=bounds(g.getObjectByName('olive-trunk')),bed=bounds(g.getObjectByName('soil-supported-root-bed')),leaves=g.getObjectByName('instanced-olive-leaves');
   assert(Math.abs(pot.min.y)<.001&&trunk.min.y<bed.max.y&&trunk.max.y>1.8);
   assert(leaves.isInstancedMesh&&leaves.count>100);assert(bounds(leaves).max.y>1.7);
  }
  if(id==='vases-and-books'){
   for(const n of ['tall-plum-vase','small-taupe-vase'])assert(Math.abs(bounds(g.getObjectByName(n)).min.y)<.001);
   assert.equal(g.children.filter(o=>o.name==='linen-book-cover').length,3);
   assert(g.getObjectByName('brass-bird-body'));
  }
  if(id==='organic-mirror'){
   const mirror=g.getObjectByName('organic-real-planar-reflection');
   assert(mirror?.isReflector===true||mirror?.type==='Reflector');
   assert.equal(mirror.getRenderTarget().width,detail==='high'?512:256);
   const normal=new THREE.Vector3(0,0,1).transformDirection(mirror.matrixWorld);assert(normal.z<-.999,'Reflector object plane must face the room, not merely its geometry');
   assert(g.getObjectByName('concealed-mirror-halo').material.emissiveIntensity>0);
   assert(g.userData.mountingRequired);
  }
  if(id==='contour-artwork'){const a=g.getObjectByName('sculptural-wavy-art-relief');assert(a.material.vertexColors&&a.geometry.attributes.color);assert.equal(a.geometry.groups.length,0);}
  g.userData.dispose();
 }
 assert(pair[0].triangles>pair[1].triangles,id+' LOD reduction');rows.push(...pair);
}
// Test rug support of all 26 contact centres in the proposed isolated dining
// set. Do not equate this with support of pulled-out chairs in the actual room.
const dining=createPhase15Dining('six-seat-set',{detail:'low'}),rug=createPhase15Style('dining-woven-rug',{detail:'low'});
dining.updateWorldMatrix(true,true);const rb=bounds(rug);let contacts=0,onRug=0;
dining.traverse(o=>{if(o.isMesh&&['floor-contact-foot','pedestal-recessed-foot'].includes(o.name)){const c=bounds(o).getCenter(new THREE.Vector3());contacts++;if(c.x>=rb.min.x&&c.x<=rb.max.x&&c.z>=rb.min.z&&c.z<=rb.max.z)onRug++;}});
assert.equal(contacts,26);assert.equal(onRug,26);
const db=bounds(dining),restMargin={x:(rb.max.x-db.max.x),z:(rb.max.z-db.max.z)};
const evidence={sourceSupportVerified:true,openingClear:true,ventilationClear:true,collisionClear:true,withinRoom:true,anchorVerified:true};
assert(canPlaceStyle(evidence));for(const k of Object.keys(evidence))assert(!canPlaceStyle({...evidence,[k]:false}));assert(!canPlaceStyle());
dining.userData.dispose();rug.userData.dispose();
console.log('PHASE15F_STYLE_GEOMETRY',JSON.stringify({variants:rows,diningRugContacts:{passed:onRug,total:contacts},restMargin,fullPullOutOnRugCertified:false,liveInstalled:false}));
