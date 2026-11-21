import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STUDIO_ANNE_SCHEMES,DESIGN_BRIEF_LIGHTING,
 applyStudioAnneScheme} from '../src/phase2/studio-anne-brief.js';
import {LIGHTING_ZONES,createHouseLighting} from '../src/phase2/lighting-system.js';
import {DINING_TABLE_WORLD} from '../src/phase2/dining-furnishings.js';

assert.deepEqual(Object.keys(STUDIO_ANNE_SCHEMES),['mint','taupe','powder']);
for(const [id,scheme] of Object.entries(STUDIO_ANNE_SCHEMES)){
 assert.deepEqual(scheme.ratios,[60,30,10],id+' ratio from PDF');
 assert(scheme.pages[0]>=3&&scheme.pages[0]<=5);
}
assert.deepEqual(DESIGN_BRIEF_LIGHTING.kitchen.kelvin,[3000,4000]);
assert.deepEqual(DESIGN_BRIEF_LIGHTING.entrance.kelvin,[2700,3000]);
assert.deepEqual(DESIGN_BRIEF_LIGHTING.bathroom.kelvin,[3000,4000]);
assert.deepEqual(DESIGN_BRIEF_LIGHTING.office.kelvin,[3500,4000]);
assert.equal(DESIGN_BRIEF_LIGHTING.dining.kelvin[0],2700);
const material=hex=>new THREE.MeshStandardMaterial({color:hex});
const m={wall:material('#f4e8da'),feature:material('#e8dcc9'),
 floor:material('#f4ede2'),cream:material('#e8dccc'),taupe:material('#ac9381'),
 sage:material('#92a18b'),oak:material('#d5b392'),walnut:material('#7f5036'),
 accent:material('#d0ae82')};
const sourceWallShader=material('#f4e8da');
sourceWallShader.onBeforeCompile=shader=>shader.uniforms.testUniform={value:1};
const shaderBefore=sourceWallShader.onBeforeCompile;
const geo=new THREE.BoxGeometry(1,1,1);
const mesh=new THREE.Mesh(geo,sourceWallShader),sourceRec={
 mesh,category:'walls',layer:{level:'ground'}};
const geometryBefore=mesh.geometry,srcColor=m.wall.color.clone();
for(const id of Object.keys(STUDIO_ANNE_SCHEMES)){
 const report=applyStudioAnneScheme(m,[sourceRec],id);
 assert.equal(report.previewOnly,true);
 assert.equal(report.sourceIFCUnmodified,true);
 assert.equal(report.sourceWallClones,1);
 assert.equal(m.wall.color.getHexString(),
  new THREE.Color(STUDIO_ANNE_SCHEMES[id].colors.wall).getHexString());
 assert.equal(sourceWallShader.color.getHexString(),m.wall.color.getHexString());
 assert.strictEqual(mesh.geometry,geometryBefore,'no IFC geometry replacement');
 assert.strictEqual(sourceWallShader.onBeforeCompile,shaderBefore,
  'existing source wall clipping shader unchanged');
}
const restored=applyStudioAnneScheme(m,[sourceRec],'source');
assert.equal(restored.scheme,'source');
assert(m.wall.color.equals(srcColor),'original source preview colour restored');
assert.equal(sourceWallShader.color.getHexString(),'f4e8da');
assert.throws(()=>applyStudioAnneScheme(m,[],'unapproved-custom-scheme'));

const scene=new THREE.Scene(),origin={x:0,z:0};
const lights=createHouseLighting(scene,origin);
assert.equal(LIGHTING_ZONES.length,14);
assert.equal(lights.emitters.length,14,'legacy architectural ambient fixtures stay intact');
assert.equal(lights.briefEmitters.length,5,'separate kitchen dining and stair accents');
const first=lights.status();
assert.equal(first.activeEmitters,14);
assert.equal(first.activeBriefEmitters,5);
assert(first.briefFixtures.some(x=>x.id==='dining-table-pendant'&&x.kelvin===2700));
const pendant=lights.briefEmitters.find(x=>x.id==='dining-table-pendant');
assert.equal(pendant.point[0],DINING_TABLE_WORLD[0]);
assert.equal(pendant.point[2],DINING_TABLE_WORLD[2]);
assert(Math.abs((pendant.point[1]-.765)-.825)<.001,
 'dining pendant should be above the actual tabletop, not room centre');
assert(first.fixtures.find(x=>x.id==='kitchen').kelvin>=3000);
assert(first.fixtures.find(x=>x.id==='dining').kelvin===2700);
assert(first.fixtures.find(x=>x.id==='reading').kelvin>=3500);
const allOff=lights.update({layers:{ambient:false,task:false,accent:false}});
assert.equal(allOff.activeEmitters,0);
assert.equal(allOff.activeBriefEmitters,0);
const taskOnly=lights.update({layers:{ambient:false,task:true,accent:false}});
assert.equal(taskOnly.activeEmitters,0);
assert.equal(taskOnly.activeBriefEmitters,2);
assert(taskOnly.briefFixtures.filter(x=>x.intensity>0).every(x=>x.room==='kitchen'));
const ambientOnly=lights.update({layers:{ambient:true,task:false,accent:false}});
assert.equal(ambientOnly.activeEmitters,14);
assert.equal(ambientOnly.activeBriefEmitters,0);
assert.equal(lights.update({enabled:false}).activeEmitters,0);
assert.equal(lights.update({enabled:false}).activeBriefEmitters,0);
lights.update({enabled:true,layers:{ambient:true,task:true,accent:true}});
assert.equal(lights.status().activeBriefEmitters,5);
assert.equal(lights.status().activeEmitters,14);
assert(lights.briefEmitters.every(x=>!x.light.castShadow),
 'low memory GPUs must not enable expensive lighting shadows');
console.log(JSON.stringify({passed:true,schemes:Object.keys(STUDIO_ANNE_SCHEMES),
 sourceIFCUnmodified:true,originalFinishRestored:true,legacyLights:14,
 briefFixtures:5,diningPendantOnTable:true,layerSwitchesIndependent:true}));
