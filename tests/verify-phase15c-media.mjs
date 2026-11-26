import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MEDIA15,createPhase15Media,mediaStats} from '../src/phase2/phase15-media.js';
const bounds=o=>new THREE.Box3().setFromObject(o,true);
const near=(a,b,t=.008)=>assert(Math.abs(a-b)<t,'support mismatch '+a+' '+b);
const rows=[];
for(const id of Object.keys(MEDIA15)){
 const variants=[];
 for(const detail of ['high','low']){
  const g=createPhase15Media(id,{detail});g.updateMatrixWorld(true);
  const s=mediaStats(g);variants.push(s);
  assert(g.userData.forward[2]===-1);
  assert(s.triangles>0&&s.triangles<50000);
  g.traverse(o=>{if(o.isMesh){for(const key of ['position','normal','uv'])assert(o.geometry.attributes[key]);assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  if(id==='paired-coffee-tables'){
   const lo=g.getObjectByName('LOW_MARBLE_TABLE'),hi=g.getObjectByName('TALL_COCOA_TABLE');
   const lt=bounds(g.getObjectByName('low-veined-marble-organic-top')),ht=bounds(g.getObjectByName('tall-polished-organic-top')),lb=bounds(g.getObjectByName('low-dark-drum-pedestal')),hb=bounds(g.getObjectByName('tall-dark-drum-pedestal'));
   assert(lo.position.x>hi.position.x,'p15 viewer-left marble table');near(bounds(lo).min.y,0);near(bounds(hi).min.y,0);near(lb.max.y,lt.min.y);near(hb.max.y,ht.min.y);
   assert(ht.min.y>lt.max.y+.04,'tabletop vertical separation');
   assert(!lb.intersectsBox(hb),'drum bases collide');assert(!lt.intersectsBox(hb),'low top collides with tall base');
   assert(lt.max.x>ht.min.x&&ht.max.x>lt.min.x&&lt.max.z>ht.min.z&&ht.max.z>lt.min.z,'nesting tabletop projections');
   const d=lt.getSize(new THREE.Vector3()),e=ht.getSize(new THREE.Vector3());assert(d.x>.7&&e.x>.7);
   const book=g.getObjectByName('linen-book');near(bounds(book).min.y,ht.max.y);near(bounds(g.getObjectByName('SCULPTURAL_ORNAMENT')).min.y,bounds(book).max.y);
   assert(g.getObjectByName('low-veined-marble-organic-top').material.map);
  }
  if(id==='pedestal-side-table'){
   const b=bounds(g.getObjectByName('sculpted-timber-pedestal')),t=bounds(g.getObjectByName('rounded-stone-side-top'));near(b.min.y,0);near(b.max.y,t.min.y);
   assert(s.dimensions[0]>.40&&s.dimensions[0]<.49);
  }
  if(id==='entertainment-wall'){
   const p=bounds(g.getObjectByName('ivory-feature-wall-panel')),tv=bounds(g.getObjectByName('tv-screen')),c=bounds(g.getObjectByName('floating-console-top'));
   assert(g.getObjectByName('left-walnut-niche-back').position.x>g.getObjectByName('tv-screen').position.x,'viewer-left niche');assert(g.getObjectByName('right-tall-ceramic-vase').position.x<g.getObjectByName('tv-screen').position.x,'viewer-right vase');assert(tv.max.z<p.min.z,'screen must face room in front of backing');assert(tv.min.y>c.max.y+.4);
   assert(c.min.y>.25&&g.userData.wallMountRequired&&!g.userData.cableAndElectricalCertified);
   assert.equal(g.children.filter(o=>o.name.startsWith('handleless-concealed-storage-front')).length,4);
   assert(g.getObjectByName('niche-warm-light-strip').material.emissiveIntensity>0);
   near(bounds(g.getObjectByName('right-tall-ceramic-vase')).min.y,c.max.y);
   assert(s.dimensions[0]>=3.3&&s.dimensions[0]<3.5);
  }
  g.userData.dispose();
 }
 assert(variants[0].triangles>variants[1].triangles,'LOD reduction');
 assert(variants[1].triangles<15000,'low detail budget');
 rows.push(...variants);
}
console.log('PHASE15C_MEDIA_GEOMETRY',JSON.stringify(rows));
