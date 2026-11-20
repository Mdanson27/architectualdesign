import * as THREE from 'three';

/**
 * Ground-floor S1 drawing corrections.
 * The plan shows open bays between 200mm structural piers beside the
 * ground stair, and a kitchen/dining door swing at the x=112.3m partition.
 * Exported SW - 017 and SW - 019 first-person collision meshes currently
 * continue through these DRAWN openings. Only remove the aperture volume,
 * never delete the structural wall or supporting piers.
 */
// Client-corrected open-concept interpretation of ground-floor S1.
 // End piers / structural columns are retained, but NO door leaves or full
 // enclosure walls occur between Stair, Sitting, Dining and Kitchen.
export const S1_GROUND_OPENINGS=Object.freeze([
 {id:'stair-sitting-open',label:'Stair to Sitting Room · continuous open bay',
  name:'SW - 017',center:[112.30,-6.545],alongX:false,width:1.69,height:3.29,
  drawing:'Client-corrected S1 · no stair-to-sitting door',
  wallZ:[-7.54,-5.56]},
 {id:'sitting-dining-open',label:'Sitting Room to Dining · fully open',
  name:'SW - 023',center:[114.76,-4.39],alongX:true,width:4.28,height:3.29,
  drawing:'Client-corrected S1 · remove DOO-001 sliding leaf between Sitting and Dining'},
 {id:'kitchen-dining-open',label:'Kitchen to Dining · open between two columns',
  name:'SW - 019',center:[112.30,-2.465],alongX:false,width:5.53,height:3.29,
  drawing:'Client-corrected S1 · column-bounded open Kitchen and Dining, no interior door',
  wallZ:[-5.56,.59]},
]);


function planarBounds(b,origin){
 return {minX:b.min.x+origin.x,maxX:b.max.x+origin.x,
  minZ:b.min.z+origin.z,maxZ:b.max.z+origin.z};
}
/**
 * Fix the actual counter-end obstruction seen in the Kitchen–Dining door.
 * The S1 opening passes through SW-019 at x=112.30, z=-2.35, but three
 * low SLA-002 source slabs (counter top/return/end) overlap the doorway.
 * Cut only the intrusion into the exact S1 doorway rectangle. No IFC vertex
 * is changed or source mesh deleted; adjacent usable counter stays in view.
 *
 * Each selected source slab gets its own material clone so neighboring kitchen
 * counters and all other room floors retain the normal source appearance.
 */
export function repairKitchenDoorCounterIntrusion(records,origin,plan,inside=()=>true){
 const cx=plan.center[0]-origin.x,cz=plan.center[1]-origin.z;
 const halfWidth=plan.width/2+.035;
 const xLo=cx-.48,xHi=cx+.48,zLo=cz-halfWidth,zHi=cz+halfWidth;
 const selected=records.filter(r=>{
  if(!inside(r)||r.category!=='slabs'||r.layer?.level!=='ground')return false;
  if(String(r.mesh.userData.ifc?.name||'').toUpperCase().trim()!=='SLA - 002')return false;
  const b=r.box,s=b.getSize(new THREE.Vector3());
  // Only small countertop geometry, never a structural room floor.
  return b.max.y<1.10&&b.min.y>=-.08&&b.max.y-b.min.y>.025&&
   s.x<.65&&s.x>.012 &&
   b.max.x>xLo&&b.min.x<xHi&&b.max.z>zLo&&b.min.z<zHi;
 });
 const original=new Map(),cut=new Map();
 for(const rec of selected){
  const material=rec.mesh.material;
  // The source material is not modified; this unique clone clips a small
  // localized volume out of just this counter segment at drawing-based door.
  const derived=material.clone();
  const prev=derived.onBeforeCompile;
  const region=new THREE.Vector4(xLo,xHi,zLo,zHi);
  const height=new THREE.Vector2(-.08,1.10);
  derived.onBeforeCompile=(shader,renderer)=>{
   prev?.(shader,renderer);
   shader.uniforms.uKitchenCounterCutXZ={value:region};
   shader.uniforms.uKitchenCounterCutY={value:height};
   shader.vertexShader='varying vec3 vKitchenCounterWorld;\n'+
    shader.vertexShader.replace('#include <begin_vertex>',
     '#include <begin_vertex>\n vKitchenCounterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 vKitchenCounterWorld;\n'+
    'uniform vec4 uKitchenCounterCutXZ;\n'+
    'uniform vec2 uKitchenCounterCutY;\n'+
    shader.fragmentShader.replace('#include <clipping_planes_fragment>',
     '#include <clipping_planes_fragment>\n'+
     'if(vKitchenCounterWorld.x>uKitchenCounterCutXZ.x &&'+
     ' vKitchenCounterWorld.x<uKitchenCounterCutXZ.y &&'+
     ' vKitchenCounterWorld.z>uKitchenCounterCutXZ.z &&'+
     ' vKitchenCounterWorld.z<uKitchenCounterCutXZ.w &&'+
     ' vKitchenCounterWorld.y>uKitchenCounterCutY.x &&'+
     ' vKitchenCounterWorld.y<uKitchenCounterCutY.y)discard;');
  };
  derived.customProgramCacheKey=()=> 'kitchen-counter-door-cut-v1-'+
   String(rec.mesh.userData.ifc?.guid||'source-slab');
  original.set(rec,material);cut.set(rec,derived);
  rec.mesh.material=derived;
  rec.mesh.userData.kitchenCounterDoorCut=true;
 }
 let enabled=true;
 function setEnabled(value){
  enabled=Boolean(value);
  for(const rec of selected)rec.mesh.material=enabled?cut.get(rec):original.get(rec);
 }
 function pointInCut(point){
  return point.x>xLo&&point.x<xHi&&point.z>zLo&&point.z<zHi&&
   point.y>-.08&&point.y<1.10;
 }
 // A detailed physical collision detector may query source low slabs. Align
 // it with the same aperture as the fragment shader while preserving walls.
 function permitsCounterHit(hit){
  return enabled&&selected.some(r=>r.mesh===hit?.object)&&pointInCut(hit.point);
 }
 return {
  selected,original,cut,setEnabled,permitsCounterHit,pointInCut,
  get enabled(){return enabled;},
  summary:{
   source:'S1 Kitchen-Dining opening and source SLA-002 counter edges',
   matchedSourceSlabs:selected.length,
   matchedGuids:selected.map(r=>r.mesh.userData.ifc?.guid),
   cutRectangle:[xLo,xHi,zLo,zHi],
   cutHeight:[-.08,1.10],
   sourceMeshesAndVertexBuffersPreserved:true,
   counterOutsideDoorRetained:true,
   doorClearanceNotFabricated:true
  }
 };
}

export function createPlanCirculationCorrections(records,scene,origin={x:0,z:0},inside=()=>true){
 const supported=[];
 let kitchenCounterRepair=null;
 const root=new THREE.Group();root.name='S1_CONFIRMED_OPEN_ROOM_CIRCULATION';scene.add(root);
 for(const plan of S1_GROUND_OPENINGS){
  const walls=records.filter(r=>{
   if(!inside(r)||r.category!=='walls'||r.layer.level!=='ground')return false;
   if(String(r.mesh.userData.ifc?.name||'').trim().toUpperCase()!==plan.name)return false;
   const b=planarBounds(r.box,origin),size=r.box.getSize(new THREE.Vector3());
   return b.minX<plan.center[0]+.12&&b.maxX>plan.center[0]-.12&&
    b.minZ<plan.center[1]+plan.width/2&&b.maxZ>plan.center[1]-plan.width/2&&
    size.y>2.2;
  });
  if(!walls.length){supported.push({id:plan.id,verified:false,reason:'Expected source wall not found'});continue;}
  const localX=plan.center[0]-origin.x,localZ=plan.center[1]-origin.z;
  const sourceGuids=walls.map(r=>r.mesh.userData.ifc?.guid);
  supported.push({
   id:plan.id,verified:true,kind:'plan',cx:localX,cz:localZ,
   groundY:0,width:plan.width,height:plan.height,alongX:plan.alongX,
   drawing:plan.drawing,sourceWallGuids:sourceGuids,sourceWallMeshes:new Set(walls.map(w=>w.mesh)),
   autoOpen:true
  });
  // Build the real swinging display door at the source-backed plan opening,
  // with live keyboard interaction and solid closed-door collision.
  if(plan.id==='kitchen-dining-open'){
   // Retain kitchen counter surfaces outside the inter-room clear span;
   // locally clip the old counter-end intrusion only at the removed wall.
   kitchenCounterRepair=repairKitchenDoorCounterIntrusion(records,origin,plan,inside);
  }
 }
 return {root,kitchenDoor:null,kitchenCounterRepair,apertures:supported.filter(r=>r.verified),
  summary:{sourceConfirmedOpenings:supported.filter(x=>x.verified).length,
   kitchenDoorFunctional:false,openConcept:true,internalDoorCount:0,
   structuralEndPiersPreserved:true,
   kitchenCounterClearance:kitchenCounterRepair?.summary??null,
   expected:S1_GROUND_OPENINGS.length,
   connections:supported.map(({sourceWallMeshes,...rest})=>rest),
   noStructuralWallMeshModified:true}};
}
