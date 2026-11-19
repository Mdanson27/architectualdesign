import * as THREE from 'three';

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
  const light=new THREE.PointLight(0xffd5a2,0,zone.radius,2);
  light.position.set(0,-.18,0);
  light.castShadow=false;
  light.name='LIGHT_EMITTER_'+zone.id;assembly.add(light);
  emitters.push({light,lens,zone});
 }
 let night=false,enabled=true;
 function update(patch={}){
  if(typeof patch.night==='boolean')night=patch.night;
  if(typeof patch.enabled==='boolean')enabled=patch.enabled;
  for(const e of emitters){
   const scale=night?1:.28;
   e.light.intensity=enabled?e.zone.lumens*scale:0;
   e.lens.material=enabled?fixtureOn:fixtureOff;
  }
  return status();
 }
 function status(){
  return {night,enabled,groupCount:emitters.length,
    activeEmitters:emitters.filter(e=>e.light.intensity>0).length,
    fixtures:emitters.map(e=>({id:e.zone.id,level:e.zone.level,
      intensity:e.light.intensity,shadowCasting:e.light.castShadow}))};
 }
 update();
 return {root,emitters,update,status,
  summary:{fixtureConcepts:LIGHTING_ZONES.length,
   floorZones:LIGHTING_ZONES.filter(z=>z.level!=='exterior').length,
   exteriorSoffits:LIGHTING_ZONES.filter(z=>z.level==='exterior').length,
   source:'Home(3).pdf S1 room arrangement + S2 rendered soffit lighting; conceptual, not electrical design'}};
}
