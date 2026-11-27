import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LIGHT15,DINING_LIGHT15,createPhase15Light,lightingStats,createPhase15LightingController,canInstallPhase15Light} from '../src/phase2/phase15-lighting.js';
import {DINING15_PLAN,createPhase15Dining} from '../src/phase2/phase15-dining.js';
const box=o=>new THREE.Box3().setFromObject(o,true),near=(a,b,t=.002)=>assert(Math.abs(a-b)<=t,a+' != '+b);
const rows=[],dining=createPhase15Dining('six-seat-set',{detail:'low'});
assert.deepEqual(DINING_LIGHT15.tableCentre,DINING15_PLAN.centre);
near(box(dining.getObjectByName('rounded-dark-timber-tabletop')).max.y,DINING_LIGHT15.tableHeight);dining.userData.dispose();
for(const id of Object.keys(LIGHT15)){
 const pair=[];
 for(const detail of ['high','low']){
  const g=createPhase15Light(id,{detail}),s=lightingStats(g);pair.push(s);
  assert(s.triangles>0&&s.triangles<40000);assert(s.lights>=1&&s.lights<=2);
  assert(s.kelvin>=2700&&s.kelvin<=3000);
  g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  if(g.userData.anchor==='ceiling')near(s.max[1],0);
  if(g.userData.anchor==='floor'||g.userData.anchor==='tabletop')near(s.min[1],0);
  if(id==='folded-glass-chandelier'){
   assert.equal(g.children.filter(o=>o.name.startsWith('FOLDED_GLASS_LEAF_')).length,6);
   assert.equal(g.children.filter(o=>o.name==='individual-suspension-wire').length,6);
   for(const o of g.children.filter(o=>o.name.startsWith('FOLDED_GLASS_LEAF_'))){assert(o.getObjectByName('sculptural-folded-glass').material.transparent);assert(o.getObjectByName('leaf-brass-mount'));assert(o.getObjectByName('glass-leaf-light-source'));}
  }
  if(id==='dining-pendant-cluster'){
   const drops=g.children.filter(o=>o.name.startsWith('DINING_DROP_'));assert.equal(drops.length,4);
   assert.equal(g.children.filter(o=>o.name==='ceiling-to-shade-suspension').length,4);
   for(const [i,d] of drops.entries()){
    const shade=box(d.getObjectByName('elongated-open-bottom-shade')),gap=shade.min.y+DINING_LIGHT15.referenceCeiling-DINING_LIGHT15.tableHeight;
    near(gap,DINING_LIGHT15.shadeGaps[i]);assert(gap>=.7499&&gap<=.9001);
    assert(Math.abs(d.position.x)<DINING15_PLAN.table[0]/2&&Math.abs(d.position.z)<DINING15_PLAN.table[2]/2);
   }
   near(drops.reduce((v,d)=>v+d.position.x,0),0);near(drops.reduce((v,d)=>v+d.position.z,0),0);
   assert.equal(s.kelvin,2700);
   assert.throws(()=>createPhase15Light(id,{ceilingHeight:NaN}));
  }
  const check=v=>{for(const l of g.userData.lights)near(l.intensity,l.userData.nominalIntensity*v);for(const m of g.userData.emitters)near(m.emissiveIntensity,1.15*v);};
  for(const v of [0,.25,.5,1]){g.userData.setLevel(v);check(v);}g.userData.dispose();
 }
 assert(pair[0].triangles>=pair[1].triangles);rows.push(...pair);
}
const fs=['folded-glass-chandelier','brass-arc-floor-lamp','double-branch-wall-sconce','dining-pendant-cluster'].map(id=>createPhase15Light(id,{detail:'low'}));
fs.push(createPhase15Light('recessed-downlight',{detail:'low',zone:'dining'}),createPhase15Light('linear-cove-light',{detail:'low',zone:'dining'}));
const controller=createPhase15LightingController(fs);
controller.setLevel('sitting','task',.25);controller.setLevel('dining','task',.60);controller.setLevel('dining','accent',.10);
for(const f of fs){const u=f.userData;for(const l of u.lights)near(l.intensity,l.userData.nominalIntensity*controller.status().levels[u.zone][u.layer]);}
controller.setMaster(false);assert(fs.every(f=>f.userData.lights.every(l=>l.intensity===0)&&f.userData.emitters.every(m=>m.emissiveIntensity===0)));
controller.setLevel('sitting','ambient',.45);controller.setMaster(true);
for(const f of fs){const u=f.userData;for(const l of u.lights)near(l.intensity,l.userData.nominalIntensity*controller.status().levels[u.zone][u.layer]);}
assert.throws(()=>controller.setLevel('kitchen','task',1));assert.throws(()=>controller.setLevel('dining','task',NaN));
const support={sourceSupportVerified:true,anchorVerified:true,openingClear:true,headClearanceVerified:true,collisionClear:true};
assert(canInstallPhase15Light(support));for(const k of Object.keys(support))assert(!canInstallPhase15Light({...support,[k]:false}));assert(!canInstallPhase15Light());
fs.forEach(f=>f.userData.dispose());
console.log('PHASE15G_LIGHT_GEOMETRY',JSON.stringify({variants:rows,diningRimGapsM:DINING_LIGHT15.shadeGaps,diningCentre:DINING_LIGHT15.tableCentre,independentZones:2,layersPerZone:3,masterPreservesLevels:true,liveInstalled:false,electricalCertified:false}));
