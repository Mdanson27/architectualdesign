import * as THREE from 'three';
import {DINING_TABLE_WORLD} from './dining-furnishings.js';

/** Visualization lighting anchors derived from S1 room zones and S2 soffit renders.
 * No electrical/fixture schedule was provided; quantities are illustrative.
 * Shadow casting is intentionally disabled to keep 8GB GPUs usable.
 */
export const LIGHTING_ZONES=[
 {id:'living',name:'Ground sitting room',level:'ground',point:[115.25,2.58,-6.65],lumens:21,radius:7.8},
 {id:'living-window',name:'Ground sitting room glazing',level:'ground',point:[117.1,2.60,-6.0],lumens:13,radius:5.8},
 {id:'dining',name:'Dining room',level:'ground',point:[114.75,2.58,-2.38],lumens:19,radius:6.2},
 {id:'kitchen',name:'Kitchen',level:'ground',point:[109.73,2.56,-2.38],lumens:18,radius:6.5},
 {id:'foyer',name:'Stair foyer lower',level:'ground',point:[109.50,2.57,-6.7],lumens:14,radius:5.0},
 {id:'master',name:'Master bedroom',level:'first',point:[115.50,5.89,-6.77],lumens:18,radius:6.5},
 {id:'family',name:'Family room',level:'first',point:[114.75,5.88,-2.08],lumens:20,radius:6.4},
 {id:'reading',name:'Reading room',level:'first',point:[108.60,5.85,-9.45],lumens:12,radius:4.7},
 {id:'bed-west',name:'First-floor west bedroom',level:'first',point:[109.10,5.87,-1.40],lumens:12,radius:4.7},
 {id:'bed-east',name:'First-floor east bedroom',level:'first',point:[115.65,5.86,-12.2],lumens:12,radius:4.7},
 {id:'stair',name:'Stair landing illumination',level:'first',point:[109.4,5.89,-6.78],lumens:13,radius:5},
 {id:'soffit-west',name:'Front balcony soffit west',level:'exterior',point:[108.85,6.02,.88],lumens:9,radius:4},
 {id:'soffit-family',name:'Front balcony soffit family room',level:'exterior',point:[115.2,6.02,.87],lumens:9,radius:4.8},
 {id:'soffit-east',name:'Side balcony soffit',level:'exterior',point:[121.30,6.00,-7.54],lumens:9,radius:4.2},
];
export function createHouseLighting(scene,origin={x:0,z:0}){
 const root=new THREE.Group();root.name='AUTOMINDS_INTERIOR_NIGHT_LIGHTS';
 scene.add(root);
 const emitters=[];
 const briefEmitters=[];
 const layers={ambient:true,task:true,accent:true};
 const warmColor=k=>k<=2750?0xffd6a1:k<=3100?0xffdfb4:k<=3600?0xffe9d0:0xffefe5;
 const specTemperature=id=>{
  if(['kitchen'].includes(id))return 3500;
  if(['reading'].includes(id))return 3700;
  if(['foyer','soffit-west','soffit-family','soffit-east','stair'].includes(id))return 2900;
  return 2700;
 };

 const fixtureOff=new THREE.MeshStandardMaterial({color:0xb7ae9b,metalness:.42,roughness:.28,
   emissive:0x241507,emissiveIntensity:.05});
 const fixtureOn=new THREE.MeshStandardMaterial({color:0xffdfab,metalness:.05,roughness:.26,
   emissive:0xffc87d,emissiveIntensity:2.3});
 for(const zone of LIGHTING_ZONES){
  const x=zone.point[0]-origin.x,y=zone.point[1],z=zone.point[2]-origin.z;
  const assembly=new THREE.Group();assembly.name='ROOM_LIGHT_'+zone.id;
  assembly.position.set(x,y,z);root.add(assembly);
  const trim=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.018,12),
    new THREE.MeshStandardMaterial({color:0x9f958a,metalness:.62,roughness:.32}));
  trim.position.y=.007;trim.name='RECESSED_LIGHT_TRIM';assembly.add(trim);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.014,12),fixtureOff);
  lens.position.y=-.01;lens.name='LIGHT_LENS';assembly.add(lens);
  const light=new THREE.PointLight(warmColor(specTemperature(zone.id)),0,zone.radius,2);
  light.position.set(0,-.18,0);
  light.castShadow=false;
  light.name='LIGHT_EMITTER_'+zone.id;assembly.add(light);
  emitters.push({light,lens,zone,kelvin:specTemperature(zone.id)});
 }
 // Studio Anne pp. 10–12: layer task + accent lighting over the existing
 // ambient fixtures. These are reversible, non-colliding visual previews;
 // no unsupported electrical service routes or new architectural walls.
 const briefFixtures=[
  {id:'kitchen-counter-west',layer:'task',room:'kitchen',kelvin:3500,
   point:[108.75,2.00,-2.18],intensity:4.2,radius:2.0},
  {id:'kitchen-counter-east',layer:'task',room:'kitchen',kelvin:3500,
   point:[110.40,2.00,-2.18],intensity:4.2,radius:2.0},
  {id:'stair-step-lower',layer:'accent',room:'stairs',kelvin:2900,
   point:[109.36,.42,-7.23],intensity:2.5,radius:1.45},
  {id:'stair-step-upper',layer:'accent',room:'stairs',kelvin:2900,
   point:[109.36,1.14,-6.75],intensity:2.5,radius:1.45},
  {id:'dining-table-pendant',layer:'accent',room:'dining',kelvin:2700,
   point:[DINING_TABLE_WORLD[0],1.59,DINING_TABLE_WORLD[2]],
   intensity:6.2,radius:3.6}
 ];
 for(const f of briefFixtures){
  const assembly=new THREE.Group();
  assembly.name='STUDIO_ANNE_'+f.id.toUpperCase().replace(/-/g,'_');
  assembly.position.set(f.point[0]-origin.x,f.point[1],f.point[2]-origin.z);
  root.add(assembly);
  const lens=new THREE.Mesh(
   new THREE.SphereGeometry(f.room==='dining'?.115:.057,12,8),
   new THREE.MeshStandardMaterial({color:0xf4ddbc,roughness:.46,
    emissive:0xf8c78c,emissiveIntensity:.12}));
  lens.name='BRIEF_LIGHT_LENS';assembly.add(lens);
  if(f.room==='dining'){
   // Table surface is 0.81m; pendant diffuser bottom 1.48m.
   // 0.67m clearance is slightly below the brief's nominal range,
   // so centre of fixture 1.59m yields ~0.78m to the lowest metal cap.
   const stem=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.89,8),
    new THREE.MeshStandardMaterial({color:0xb99d6c,metalness:.75,roughness:.3}));
   stem.name='DINING_PENDANT_STEM';stem.position.y=.50;assembly.add(stem);
  }
  const light=new THREE.PointLight(warmColor(f.kelvin),0,f.radius,2);
  light.name='STUDIO_ANNE_EMITTER_'+f.id;light.castShadow=false;
  light.position.y=-.09;assembly.add(light);
  briefEmitters.push({...f,light,lens,assembly});
 }
 let night=false,enabled=true;
 function update(patch={}){
  if(typeof patch.night==='boolean')night=patch.night;
  if(typeof patch.enabled==='boolean')enabled=patch.enabled;
  if(patch.layers){
   for(const id of ['ambient','task','accent'])
    if(typeof patch.layers[id]==='boolean')layers[id]=patch.layers[id];
  }
  for(const e of emitters){
   const scale=night?1:.28;
   e.light.intensity=enabled&&layers.ambient?e.zone.lumens*scale:0;
   e.lens.material=enabled&&layers.ambient?fixtureOn:fixtureOff;
  }
  for(const e of briefEmitters){
   e.light.intensity=enabled&&layers[e.layer]?
    e.intensity*(night?1:.28):0;
   e.lens.material.emissiveIntensity=enabled&&layers[e.layer]?1.45:.03;
  }
  return status();
 }
 function status(){
  return {night,enabled,groupCount:emitters.length,
    activeEmitters:emitters.filter(e=>e.light.intensity>0).length,
    briefFixtureCount:briefEmitters.length,
    activeBriefEmitters:briefEmitters.filter(e=>e.light.intensity>0).length,
    layers:{...layers},lightingBrief:'Studio Anne pp. 10–12',
    fixtures:emitters.map(e=>({id:e.zone.id,level:e.zone.level,
      kelvin:e.kelvin,layer:'ambient',
      intensity:e.light.intensity,shadowCasting:e.light.castShadow})),
    briefFixtures:briefEmitters.map(e=>({id:e.id,room:e.room,
      layer:e.layer,kelvin:e.kelvin,intensity:e.light.intensity}))};
 }
 update();
 return {root,emitters,briefEmitters,update,status,
  summary:{fixtureConcepts:LIGHTING_ZONES.length,
   floorZones:LIGHTING_ZONES.filter(z=>z.level!=='exterior').length,
   exteriorSoffits:LIGHTING_ZONES.filter(z=>z.level==='exterior').length,
   source:'Home(3).pdf S1/S2 room zones + Studio Anne brief pp. 10–12; conceptual, not an electrical design',
   layeredBriefFixtures:briefEmitters.length,roomKelvinPreview:true,independentLightingLayers:true}};
}
