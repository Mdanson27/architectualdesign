import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import './actual-house.css';
import {buildBedroomDecorations} from './house-enhancements.js';
import {createCuratedSiteContext,auditSourceContext} from './site-context.js';
import {createIFCWindowGlazing} from './window-glazing.js';
import {createSourceStairSafety} from './stair-safety.js';
import {auditFacadeInfills} from './facade-infills.js';
import {sourceSlabSeamSupport} from './threshold-support.js';
import {createDoorSystem} from './functional-doors.js';
import {revealObstructedDoors} from './door-apertures.js';
import {createPlanDiningFurniture} from './dining-furnishings.js';

/**
 * Actual-house interactive viewer.
 * Models use original architect IFC coordinates. Appearance is an approximate
 * material treatment of source geometry. Do NOT confuse render styling with IFC truth.
 */
const $ = id => document.getElementById(id);
// Use Vite's base URL for all static assets (project-root deployment on GitHub Pages).
const assetURL = file => import.meta.env.BASE_URL + String(file).replace(/^\/+/, '');
const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true';
if(publicPreview){
 // Private plans and client render references are intentionally excluded from the public site.
 for(const id of ['drawingsBtn','referenceBtn'])$(id).style.display='none';
 document.title='AutoMinds Spaces | Interactive House Preview';
}
const sourceLevels = {ground:0, first:3.3, second:6.6};
const levelNames = {ground:'GROUND FLOOR',first:'FIRST FLOOR',second:'ROOF LEVEL'};
const refs = [
 ['R01','Foyer Staircase'],['R02','Open-Plan Kitchen, Dining & Living'],
 ['R03','Main Living Room'],['R04','Second Living Room'],['R05','Master Bedroom'],
 ['R06','Master Walk-In Closet'],['R07','Master Dressing Room'],
 ['R08','Master Bathroom · Double Vanity'],['R09','Master Bathroom · Shower'],
 ['R10','Ground-Floor Bedroom 1'],['R11','First-Floor Bedroom 2'],
 ['R12','First-Floor Bedroom 3 Sleeping'],['R13','Bedroom 3 Dressing Retreat'],
 ['R14','Study Room Area']
];
const renderer = new THREE.WebGLRenderer({
 antialias:true,
 powerPreference:'high-performance',
 alpha:false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=false; // performance-appropriate for DANSON's 8GB RAM
$('viewport').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bcd8dd');
scene.fog = new THREE.Fog('#bcd8dd',125,380);
const camera = new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.07,700);
camera.position.set(36,31,48);
const orbit = new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;
orbit.dampingFactor=.06;
orbit.minDistance=2.1;
orbit.maxDistance=300;
orbit.maxPolarAngle=Math.PI-.07;
const fps = new PointerLockControls(camera,renderer.domElement);
const sourceRoot=new THREE.Group();scene.add(sourceRoot);
const hemi=new THREE.HemisphereLight(0xf9ffff,0xa99982,1.55);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dd,2.25);sun.position.set(-32,50,25);scene.add(sun);
const fill=new THREE.DirectionalLight(0xc7e8f0,.55);fill.position.set(31,16,-38);scene.add(fill);
const earth=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({
 color:'#849b7e',roughness:1,metalness:0
}));
earth.rotation.x=-Math.PI/2;
earth.position.y=-5.75;earth.receiveShadow=true;scene.add(earth);
const grid=new THREE.GridHelper(260,130,0x90a8a2,0xc6d1c9);grid.position.y=-5.69;
grid.material.opacity=.16;grid.material.transparent=true;scene.add(grid);
const raycaster=new THREE.Raycaster();
const downcaster=new THREE.Raycaster();
const clock=new THREE.Clock();
const loader=new GLTFLoader();
const keys={};
const world=new THREE.Vector3();
const state={
 sourceManifest:null,elements:{},origin:new THREE.Vector3(),
 layers:new Map(),meshes:[],floors:[],solids:[],doors:[],
 center:new THREE.Vector3(),bounds:new THREE.Box3(),architectureBounds:new THREE.Box3(),
 mode:'orbit',floor:'all',showDetails:true,showFurniture:true,
 showSurroundings:false,sectionEnabled:false,
 enhancedFurniture:true,decor:null,windows:null,stairSafety:null,showStairSafety:true,gatePreview:null,siteContext:null,sourceContextAudit:null,facadeAudit:null,doorSystem:null,doorApertureAudit:null,dining:null,repairDoorApertures:true,showGatePreview:false,roomListVisible:false,measureMode:false,measureStart:null,measureLine:null,
 night:false,initialReady:false,referenceIndex:0,referenceOpen:false,mapOpen:false,drawingsOpen:false,drawingIndex:0,
 footY:0,lookPointer:null,lastLook:null,keys,joyX:0,joyY:0,walkEnabled:false,
 nextLayerIndex:0,totalLayers:0,loadedLayers:0,visibleMeshes:0
};
let toastTimer=null,lastMapUpdate=0,lastHudUpdate=0;
function toast(message){
 $('toast').textContent=message;$('toast').classList.add('show');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);
}
function progress(value,label){
 $('progressBar').style.width=Math.max(2,Math.min(100,value))+'%';
 $('progressLabel').textContent=label;
}
function fatal(message){
 console.error('[IFC House]',message);
 $('errorMessage').textContent=String(message);
 $('loading').classList.add('hidden');
 $('intro').classList.add('hidden');
 $('error').classList.remove('hidden');
}
function texture(type){
 const c=document.createElement('canvas');c.width=c.height=512;
 const p=c.getContext('2d');p.clearRect(0,0,512,512);
 if(type==='marble'){
  p.fillStyle='#e9e3db';p.fillRect(0,0,512,512);
  for(let i=0;i<29;i++){
   let x=(i*127)%600-60, y=(i*81)%640-75;
   p.strokeStyle=(i%4?'rgba(133,115,97,.18)':'rgba(201,163,120,.40)');
   p.lineWidth=i%6?1.2:2.7;
   p.beginPath();p.moveTo(x-65,y-95);p.bezierCurveTo(x+55,y+30,x-50,y+150,x+65,y+230);p.stroke();
  }
 } else if(type==='wood'){
  p.fillStyle='#ab876b';p.fillRect(0,0,512,512);
  for(let x=0;x<512;x+=38){
   p.fillStyle=['#c29b75','#a87c60','#bb9472','#a47d5e'][(x/38)%4|0];
   p.fillRect(x+1,0,36,512);
   p.fillStyle='#694b39';p.fillRect(x+37,0,1.2,512);
   for(let t=0;t<4;t++){
    p.strokeStyle='rgba(80,52,37,.16)';p.lineWidth=.75;p.beginPath();
    p.moveTo(x+t*8,0);p.bezierCurveTo(x+7+t*8,145,x-2+t*8,320,x+t*8,512);p.stroke();
   }
  }
 }else if(type==='stone'){
  p.fillStyle='#e6dccb';p.fillRect(0,0,512,512);
  for(let row=0;row<24;row++)for(let col=0;col<10;col++){
   let x=col*56-(row%2)*28,y=row*22;
   p.fillStyle=['#e6dfd4','#cbc4b7','#f1ebde','#d7d0c6'][(col+3*row)%4];
   p.fillRect(x+1,y+1,54,20);
  }
 }else{
  p.fillStyle='#eee7db';p.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
   const a=(i*87)%512,b=(i*193)%512;
   p.fillStyle=i%2?'rgba(120,104,81,.020)':'rgba(255,255,255,.035)';
   p.fillRect(a,b,2,2);
  }
 }
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
 return t;
}
const maps={plaster:texture('plaster'),marble:texture('marble'),wood:texture('wood'),stone:texture('stone')};
function material(color,roughness=.7,metalness=0,map=null,extra={}){
 return new THREE.MeshStandardMaterial({color,roughness,metalness,map,side:THREE.DoubleSide,...extra});
}
const mat={
 wall:material('#f4e8da',.94,0),
 feature:material('#e8dcc9',.94,0),
 floor:material('#f4ede2',.29,0,maps.marble),
 roof:material('#737c63',.88,0),
 structure:material('#ded7cd',.91,0),
 oak:material('#d5b392',.75,0,maps.wood),
 walnut:material('#7f5036',.58,0,maps.wood),
 taupe:material('#ac9381',.88),
 cream:material('#e8dccc',.95),
 sage:material('#92a18b',.95),
 olive:material('#65735c',.88),
 accent:material('#d0ae82',.44,.55),
 steel:material('#9eb5bd',.26,.78),
 glass:material('#b0d6df',.15,0,null,{transparent:true,opacity:.36,depthWrite:false}),
 black:material('#28363b',.47,.35),
 highlight:material('#e7c096',.55)
};
const occupiedAreas=new Map(); // optional broad-phase colliders
// Preliminary spatial boundary found by source-mesh clustering (NOT a legal site boundary).
// Other IFC models remain intact and can be re-enabled at any time.
const residenceEnvelope={minX:104.9,maxX:123.7,minZ:-16.2,maxZ:2.6,maxSpanX:22,maxSpanZ:22};
const clipCeiling=new THREE.Plane(new THREE.Vector3(0,-1,0),2.48);
const centerScratch=new THREE.Vector3(),sizeScratch=new THREE.Vector3();
function isResidenceRecord(rec){
 rec.box.getCenter(centerScratch);
 rec.box.getSize(sizeScratch);
 const x=centerScratch.x+state.origin.x,z=centerScratch.z+state.origin.z;
 return x>=residenceEnvelope.minX&&x<=residenceEnvelope.maxX &&
   z>=residenceEnvelope.minZ&&z<=residenceEnvelope.maxZ &&
   sizeScratch.x<residenceEnvelope.maxSpanX && sizeScratch.z<residenceEnvelope.maxSpanZ;
}
function setClipping(){
 const height={ground:2.48,first:5.78,second:9.08}[state.floor];
 clipCeiling.constant=height??10;
 renderer.clippingPlanes=(state.mode==='orbit' && state.sectionEnabled && height!==undefined)?[clipCeiling]:[];
}
function visibleSourceRecord(rec){
 if(!layerIsVisible(rec.layer))return false;
 // Phase 1: source elements outside the residential envelope are retained in
 // memory for audit but NEVER rendered as raw scattered compound geometry.
 // Both toggle states keep the verified core, while Phase 2 supplies curated site context.
 if(!isResidenceRecord(rec))return false;
 if(state.mode==='orbit'&&state.sectionEnabled&&state.floor!=='all'){
  const top={ground:2.48,first:5.78,second:9.08}[state.floor];
  // Hide wholly higher components; global clipping cuts through crossing walls and roofs.
  if(rec.box.min.y>top+.03)return false;
 }
 return true;
}
function ensureUV(geometry,mode){
 if(geometry.attributes.uv || !geometry.attributes.position)return;
 const p=geometry.attributes.position;
 const n=geometry.attributes.normal;
 const uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(mode==='floor'){
   uv[i*2]=x*.44;uv[i*2+1]=z*.44;
  }else if(mode==='wood'){
   uv[i*2]=x*.65;uv[i*2+1]=y*.65;
  }else {
   const nx=n?n.getX(i):0, nz=n?n.getZ(i):1;
   uv[i*2]=Math.abs(nx)>Math.abs(nz)?z*.36:x*.36;
   uv[i*2+1]=y*.36;
  }
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
function interpretMaterial(meta,category){
 const name=String(meta?.name||'').toUpperCase();
 const kind=String(meta?.type||'').toUpperCase();
 if(kind==='IFCWALLSTANDARDCASE'||kind==='IFCWALL'||category==='walls')return {material:mat.wall,projection:'wall'};
 if(kind==='IFCSLAB'||category==='slabs')return {material:mat.floor,projection:'floor'};
 if(kind==='IFCDOOR'||name.startsWith('DOO')||category==='doors')return {material:mat.walnut,projection:'wood'};
 if(kind==='IFCWINDOW'||category==='windows')return {material:mat.glass,projection:'wall'};
 // Narrow IFC WD window frame pieces should not inherit opaque plaster.
 if(/^WD\s*-/i.test(name))return {material:mat.steel,projection:'wall'};
 if(kind==='IFCRAILING'||category==='railings')return {material:mat.steel,projection:'wall'};
 if(kind==='IFCCOLUMN'||category==='columns')return {material:mat.structure,projection:'wall'};
 if(name.includes('STAIR')||name.includes('TREAD')||name.startsWith('STA -'))return {material:mat.oak,projection:'wood'};
 if(name.startsWith('SW -'))return {material:mat.wall,projection:'wall'};
 if(name.startsWith('SLA -'))return {material:mat.floor,projection:'floor'};
 if(name.startsWith('FU -')||kind==='IFCFURNISHINGELEMENT'){
  const number=Number(name.match(/\d+/)?.[0]||0);
  return {material:[mat.cream,mat.taupe,mat.oak,mat.sage,mat.cream,mat.walnut][number%6],projection:'wall'};
 }
 if(name.includes('BATH')||name.includes('WC'))return {material:mat.cream,projection:'wall'};
 return {material:mat.structure,projection:'wall'};
}
function layerIsVisible(layer){
 if(!state.showDetails&&['columns','proxies'].includes(layer.category))return false;
 if(!state.showFurniture&&layer.category==='furniture')return false;
 return true;
}
function refreshVisibility(){
 let count=0;
 for(const {group,meta} of state.layers.values()){
  group.visible=layerIsVisible(meta);
 }
 for(const rec of state.meshes){
  const visible=visibleSourceRecord(rec);
  rec.mesh.visible=visible;
  if(state.doorSystem&&rec.mesh.userData.functionallyReplacedDoorId)rec.mesh.visible=false;
  if(state.windows?.sourceSet.has(rec))rec.mesh.visible=false;
  if(rec.mesh.userData.facadeDuplicateHidden)rec.mesh.visible=false;
  if(state.decor?.sources.includes(rec)&&state.enhancedFurniture&&state.showFurniture)rec.mesh.visible=false;
  if(state.dining?.sourceSet?.has(rec)&&state.showFurniture)rec.mesh.visible=false;
  if(rec.mesh.visible)count++;
 }
 if(state.decor)state.decor.group.visible=state.enhancedFurniture&&state.showFurniture;
 if(state.dining)state.dining.root.visible=state.showFurniture&&
  (state.floor==='ground'||state.floor==='all'||(state.mode==='walk'&&state.footY<1.5));
 if(state.stairSafety?.root)state.stairSafety.root.visible=state.showStairSafety;
 if(state.windows)state.windows.updateVisibility({
  floor:state.floor,mode:state.mode,sectionEnabled:state.sectionEnabled
 });
 if(state.doorSystem)state.doorSystem.updateVisibility({
  floor:state.floor,mode:state.mode,sectionEnabled:state.sectionEnabled,
  showSurroundings:state.showSurroundings,inside:isResidenceRecord
 });
 if(state.siteContext){
  state.siteContext.root.visible=state.showSurroundings &&
    (state.floor==='all'||state.floor==='ground'||!state.sectionEnabled);
 }
 grid.visible=!state.showSurroundings;
 // Align the exterior reference ground to the compound, not 5m beneath it.
 earth.position.y=state.showSurroundings?-.405:-5.75;
 state.visibleMeshes=count;
 setClipping();
 $('hudStatus').textContent=state.showSurroundings?
  'S1 SITE CONTEXT · '+count.toLocaleString()+' SOURCE ELEMENTS':
  'SOURCE GEOMETRY · '+count.toLocaleString()+' VISIBLE';
}
// ---------- Geometry intake, layering and source provenance ----------
const priority={walls:0,slabs:1,doors:2,windows:3,railings:4,columns:5,proxies:6,furniture:7};
function localSourceBox(b){
 return new THREE.Box3(
  new THREE.Vector3(b[0][0]-state.origin.x,b[0][1],b[0][2]-state.origin.z),
  new THREE.Vector3(b[1][0]-state.origin.x,b[1][1],b[1][2]-state.origin.z)
 );
}
function determineOrigin(manifest){
 let structural=manifest.layers.filter(x=>x.category==='walls'&&x.bounds);
 if(!structural.length)structural=manifest.layers.filter(x=>x.bounds);
 const min=new THREE.Vector3(Infinity,Infinity,Infinity);
 const max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
 for(const layer of structural){
  const b=layer.bounds;
  min.min(new THREE.Vector3(...b[0]));max.max(new THREE.Vector3(...b[1]));
 }
 const center=min.clone().add(max).multiplyScalar(.5);
 state.origin.set(center.x,0,center.z);
 sourceRoot.position.set(-center.x,0,-center.z);
 state.center.set(0,2,0);
 state.architectureBounds=new THREE.Box3(min,max);
 let zCenter=(manifest.sceneBounds[0][2]+manifest.sceneBounds[1][2])/2;
 console.info('[AutoMinds Source] architectural center',center,'full model geographic Z centre',zCenter);
 const s=max.clone().sub(min);
 orbit.target.set(0,Math.min(4,s.y/2),0);
 const d=Math.max(25,Math.max(s.x,s.z)*.74);
 camera.position.set(d*.85,d*.55+8,d*.88);
 camera.lookAt(orbit.target);
 orbit.update();
}
function annotateMesh(mesh,layer){
 const metadata=state.elements[mesh.name]||null;
 const info=interpretMaterial(metadata,layer.category);
 // IFC GLB triangles frequently omit NORMAL attributes; without normals,
 // physically based lighting renders the entire house almost black.
 if(!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
 ensureUV(mesh.geometry,info.projection);
 mesh.material=info.material;
 mesh.castShadow=false;
 mesh.receiveShadow=true;
 mesh.userData.ifc={name:metadata?.name||mesh.name,ifcType:metadata?.type||layer.category,guid:mesh.name,storey:layer.level};
 mesh.geometry.computeBoundingBox();
 mesh.updateWorldMatrix(true,false);
 const box=new THREE.Box3().setFromObject(mesh);
 // Sloping / uppermost slabs read as a roof in the source, not as marble tiles.
 const extent=box.getSize(new THREE.Vector3());
 if(layer.category==='slabs' && box.min.y>5.4 && extent.x>1.1 && extent.z>1.1){
  mesh.material=mat.roof;
 }
 const record={mesh,layer,box,category:layer.category};
 state.meshes.push(record);
 if(layer.category==='slabs' ||
   (layer.category==='proxies'&&/TREAD|STAIR|SLA -|LANDING|STEP/i.test(metadata?.name||''))){
  state.floors.push(record);
 }
 if(['walls','doors','columns','proxies','furniture','railings'].includes(layer.category)){
  state.solids.push(record);
  if(layer.category==='doors'||
    (layer.category==='proxies'&&/^DOO/i.test(metadata?.name||'')))state.doors.push(record);
 }
}
async function addSourceLayer(layer){
 const gltf=await loader.loadAsync(assetURL(layer.glb));
 const group=gltf.scene;
 group.name=layer.name;
 sourceRoot.add(group);
 sourceRoot.updateMatrixWorld(true);
 group.updateMatrixWorld(true);
 state.layers.set(layer.name,{group,meta:layer});
 let count=0;
 group.traverse(o=>{
  if(!o.isMesh)return;
  annotateMesh(o,layer);count++;
 });
 group.visible=layerIsVisible(layer);
 state.loadedLayers++;
 return count;
}
function bestArchitecturalBounds(floor='all'){
 if(state.showSurroundings&&floor==='all'&&state.siteContext)return state.siteContext.bounds.clone();
 const b=new THREE.Box3();
 const cutoff={ground:2.48,first:5.78,second:9.08}[floor];
 for(const r of state.meshes){
  if(r.category!=='walls'&&r.category!=='slabs')continue;
  if(!isResidenceRecord(r))continue;
  if(cutoff!==undefined&&r.box.min.y>cutoff)continue;
  b.union(r.box);
 }
 if(!b.isEmpty())return b;
 if(!state.showSurroundings){
  return new THREE.Box3(
   new THREE.Vector3(residenceEnvelope.minX-state.origin.x,-.8,residenceEnvelope.minZ-state.origin.z),
   new THREE.Vector3(residenceEnvelope.maxX-state.origin.x,7.5,residenceEnvelope.maxZ-state.origin.z)
  );
 }
 return state.architectureBounds.clone().translate(state.origin.clone().negate());
}
function focusMainBuilding(){
 if(state.mode==='walk')exitWalk();
 state.showGatePreview=false;
 $('gateBtn').textContent='▣ INSPECT SLIDING GATE / BOUNDARY';
 // The detected residence envelope is a REVERSIBLE viewer selection, not altered BIM geometry.
 state.showSurroundings=false;
 $('surroundingsToggle').checked=false;
 refreshVisibility();
 const box=bestArchitecturalBounds(state.floor);
 const target=box.getCenter(new THREE.Vector3());
 const size=box.getSize(new THREE.Vector3());
 orbit.enabled=true;
 orbit.target.copy(target);
 const distance=Math.max(13,Math.max(size.x,size.z)*1.07);
 camera.position.set(target.x+distance*.67,target.y+distance*.57+2.5,target.z+distance*.76);
 camera.lookAt(target);
 orbit.update();
 $('locationText').textContent='RESIDENCE · IFC STRUCTURE';
 $('levelText').textContent=state.floor==='all'?'ALL LEVELS':levelNames[state.floor];
}
function setupEnhancements(){
 if(state.decor)return;
 state.decor=buildBedroomDecorations(state.meshes.filter(isResidenceRecord),scene);
 state.facadeAudit=auditFacadeInfills(state.meshes,isResidenceRecord,state.origin);
 console.info('[AutoMinds First-Floor Verified Glazing]',state.facadeAudit.summary);
 state.windows=createIFCWindowGlazing(state.meshes,scene,isResidenceRecord);
 console.info('[AutoMinds Window Audit]',state.windows.summary);
 state.stairSafety=createSourceStairSafety(state.meshes,scene,isResidenceRecord);
 console.info('[AutoMinds Stair Safety Concept]',state.stairSafety.summary);
 const stairStatus=$('stairSafetyStatus');
 if(stairStatus)stairStatus.textContent=state.stairSafety.sourceVerified?
  'Source-anchored flights and landing · handrails + upper void guard · concept only, not engineer certified':
  'Stair source incomplete. No unsupported safety geometry fabricated.';
 state.doorSystem=createDoorSystem(state.doors,scene,isResidenceRecord);
 state.doorApertureAudit=revealObstructedDoors(mat.wall,state.doorSystem,state.meshes,isResidenceRecord,state.windows,state.facadeAudit);
 const details=state.doorSystem.doors.length;
 console.info('[AutoMinds Aperture Audit]',state.doorApertureAudit.obstructedCount,
  'door and',state.doorApertureAudit.windowObstructedCount,'window wall occlusions repaired visually');
 $('doorSystemCount').textContent=details+' interactive doorways · '+state.doorSystem.sourceCount+' IFC parts · '+state.doorApertureAudit.obstructedCount+' door obstructions · '+state.doorApertureAudit.windowObstructedCount+' window occlusions checked';
 console.info('[AutoMinds Spaces Doors] source records',state.doorSystem.sourceCount,'interactive doorways',details);
 state.siteContext=createCuratedSiteContext(scene,state.origin);
 state.gatePreview=state.siteContext.gate;
 state.sourceContextAudit=auditSourceContext(state.meshes,isResidenceRecord);
 console.info('[AutoMinds Site Audit] residence/source elements',state.sourceContextAudit.insideResidence,
  'suppressed unrelated source elements',state.sourceContextAudit.suppressedSurroundings,
  'curated site components',state.siteContext.summary.approvedComponents);
 $('siteAuditStatus').textContent='S1 plan · 48.5 × 25 m · 3 bays, paving, grass, trees and a 4m gate. '+
  state.sourceContextAudit.suppressedSurroundings+' unrelated IFC pieces suppressed. Location is a visual alignment, not a survey.';
 state.dining=createPlanDiningFurniture(scene,state.origin,state.meshes.filter(isResidenceRecord));
 buildBedroomNavigator();
 buildDoorNavigator();
 refreshVisibility();
 console.info('[AutoMinds SPACES] IFC furniture anchors',state.decor.entries.length,
  'site location is plan-aligned but requires survey verification');
}
function buildBedroomNavigator(){
 const panel=$('bedroomList');panel.textContent='';
 for(const item of state.decor.entries){
  const btn=document.createElement('button');btn.type='button';btn.className='bedroomItem';
  const level=item.level==='first'?'First floor':'Ground floor';
  btn.innerHTML='<strong>'+level+' · Bed '+(item.id+1)+'</strong><span>IFC furniture footprint · '+item.area.x.toFixed(2)+' × '+item.area.z.toFixed(2)+' m</span>';
  btn.addEventListener('click',()=>{
   if(state.mode==='walk')exitWalk();
   applyFloorSelection(item.level);
   const floor=sourceLevels[item.level];
   const spawn=findSpawn(floor,item.center.x,item.center.z,true);
   if(!spawn){toast('No safe walkway found beside this bed yet. Inspect this source location from above.');return;}
   enterWalk(spawn,item.center);$('bedroomPanel').classList.add('hidden');state.roomListVisible=false;
  });
  panel.appendChild(btn);
 }
 $('bedroomCount').textContent=state.decor.entries.length+' IFC bed positions located';
}
function buildDoorNavigator(){
 const container=$('doorList');container.textContent='';
 for(const door of state.doorSystem.doors){
  const btn=document.createElement('button');
  btn.type='button';btn.className='bedroomItem';
  const level=door.level==='ground'?'Ground floor':'First floor';
  const description=door.style==='slide'?'Wide sliding preview':door.style==='double'?'Double hinged preview':'Hinged preview';
  btn.innerHTML='<strong>Door '+door.id+' · '+level+'</strong><span>'+description+' · IFC '+door.width.toFixed(2)+' m opening</span>';
  btn.addEventListener('click',()=>{
   if(state.mode==='walk')exitWalk();
   applyFloorSelection(door.level);
   const y=sourceLevels[door.level],normal=door.alongX?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);
   let spawn=null;
   for(const sign of [-1,1]){
    for(const dist of [1.4,1.8,2.3]){
     spawn=findSpawn(y,door.position.x+normal.x*sign*dist,door.position.z+normal.z*sign*dist,false);
     if(spawn)break;
    }
    if(spawn)break;
   }
   if(!spawn){
    const target=door.position.clone();
    orbit.target.copy(target);camera.position.set(target.x+3,target.y+2.9,target.z+3);
    camera.lookAt(target);orbit.update();
    toast('No safe floor for this doorway. Showing overhead IFC position instead.');
   }else enterWalk(spawn,door.position);
   $('doorPanel').classList.add('hidden');
  });
  container.appendChild(btn);
 }
 $('doorTotal').textContent=state.doorSystem.doors.length+' interactive doorways grouped from '+state.doorSystem.sourceCount+' IFC parts';
}
function beginMeasure(){
 state.measureMode=!state.measureMode;
 state.measureStart=null;
 if(state.measureLine){scene.remove(state.measureLine);state.measureLine.geometry.dispose();state.measureLine=null;}
 $('measureBtn').textContent=state.measureMode?'✕ EXIT MEASUREMENT':'⌁ MEASURE ROOM DISTANCE';
 $('measureStatus').textContent=state.measureMode?'Click two floor or wall points to measure the actual IFC metres.':'Measurement tool is off.';
 if(state.mode==='walk')exitWalk();
}
function measureSourceClick(e){
 if(!state.measureMode||state.mode!=='orbit')return;
 const b=renderer.domElement.getBoundingClientRect();
 const p=new THREE.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);
 raycaster.setFromCamera(p,camera);
 const meshes=state.meshes.filter(x=>x.mesh.visible && ['walls','slabs','furniture','proxies'].includes(x.category)).map(x=>x.mesh);
 const hit=raycaster.intersectObjects(meshes,false)[0];
 if(!hit){toast('Click a visible architectural surface to measure.');return;}
 if(!state.measureStart){
  state.measureStart=hit.point.clone();
  $('measureStatus').textContent='Start point saved. Click a second point.';
  return;
 }
 const end=hit.point.clone(),from=state.measureStart;
 const d2=Math.hypot(end.x-from.x,end.z-from.z),d3=end.distanceTo(from);
 if(state.measureLine){scene.remove(state.measureLine);state.measureLine.geometry.dispose();}
 const lineGeometry=new THREE.BufferGeometry().setFromPoints([from,end]);
 state.measureLine=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0xd8ae7c,depthTest:false}));
 state.measureLine.renderOrder=99;scene.add(state.measureLine);
 $('measureStatus').textContent='Horizontal: '+d2.toFixed(2)+' m · 3D: '+d3.toFixed(2)+' m. Click again for a new start.';
 state.measureStart=null;
}
function clearStairHighlight(){
 for(const rec of state.meshes){
  if(rec.mesh.userData.structuralOriginalMaterial){
   rec.mesh.material=rec.mesh.userData.structuralOriginalMaterial;
   delete rec.mesh.userData.structuralOriginalMaterial;
  }
 }
 state.stairHighlight=false;
 const b=$('stairFocusBtn');
 if(b)b.textContent='↗ INSPECT REAL STAIRCASE';
}
function focusSourceStairs(){
 if(state.stairHighlight){clearStairHighlight();focusMainBuilding();return;}
 if(state.mode==='walk')exitWalk();
 const stairs=state.meshes.filter(r=>
  isResidenceRecord(r)&&/TREAD|STAIR|LANDING|STEP/i.test(String(r.mesh.userData.ifc?.name||''))&&
  r.category==='proxies');
 if(!stairs.length){toast('The actual source stair objects have not loaded yet.');return;}
 state.floor='first';
 state.sectionEnabled=true;
 state.showSurroundings=false;
 $('sectionToggle').checked=true;
 $('surroundingsToggle').checked=false;
 for(const b of document.querySelectorAll('#floorButtons button'))b.classList.toggle('active',b.dataset.floor==='first');
 refreshVisibility();
 const bounds=new THREE.Box3();
 for(const r of stairs){
  bounds.union(r.box);
  r.mesh.userData.structuralOriginalMaterial=r.mesh.material;
  r.mesh.material=mat.highlight;
 }
 state.stairHighlight=true;
 $('stairFocusBtn').textContent='✕ END STAIR INSPECTION';
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 const dist=Math.max(7,Math.max(size.x,size.z)*2.8);
 orbit.target.copy(center);
 camera.position.set(center.x+dist*.72,center.y+dist*.55+2,center.z+dist*.81);
 camera.lookAt(center);orbit.update();
 $('locationText').textContent='REAL IFC STAIRCASE · SOURCE TREADS';
 $('levelText').textContent='GROUND → FIRST FLOOR';
 toast('Source staircase highlighted. Guardrails and landing treatment are reversible safety concepts, not engineered details.');
}

function focusGatePreview(){
 if(state.mode==='walk')exitWalk();
 if(!state.gatePreview){toast('Site model still loading.');return;}
 const next=!state.showGatePreview;
 state.showGatePreview=next;
 state.showSurroundings=next;
 $('surroundingsToggle').checked=next;
 state.sectionEnabled=false;$('sectionToggle').checked=false;
 state.floor='all';
 for(const b of document.querySelectorAll('#floorButtons button'))b.classList.toggle('active',b.dataset.floor==='all');
 $('gateBtn').textContent=next?'✕ END GATE PREVIEW':'▣ INSPECT GATE / BOUNDARY';
 refreshVisibility();
 if(next){
  const target=state.siteContext.gateWorld.clone();
  orbit.target.copy(target);
  camera.position.set(target.x+6.6,target.y+4.0,target.z+8.6);camera.lookAt(target);orbit.update();
  $('locationText').textContent='S1 SITE PLAN · 4M SLIDING GATE';
  toast('Site-plan aligned compound preview · confirm final plot registration against survey.');
 }else focusMainBuilding();
}
function frameBuilding(floor=state.floor){
 if(state.mode==='walk')exitWalk();
 const bounds=bestArchitecturalBounds(floor);
 const target=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 orbit.enabled=true;
 orbit.target.copy(target);
 const distance=Math.max(13,Math.max(size.x,size.z,9)*.9);
 camera.position.set(target.x+distance*.65,target.y+Math.max(10,size.y*.6+6),target.z+distance*.85);
 camera.lookAt(target);
 orbit.update();
 $('locationText').textContent=state.showSurroundings?
  'S1 SITE-PLAN COMPOUND · PREVIEW ALIGNMENT':'ACTUAL IFC ARCHITECTURE';
 $('levelText').textContent=floor==='all'?'ALL LEVELS':levelNames[floor];
}
function applyFloorSelection(choice){
 clearStairHighlight();
 const wasWalking=state.mode==='walk';
 state.floor=choice;
 state.sectionEnabled=choice!=='all';
 $('sectionToggle').checked=state.sectionEnabled;
 for(const el of document.querySelectorAll('#floorButtons button')){
  el.classList.toggle('active',el.dataset.floor===choice);
 }
 refreshVisibility();
 if(wasWalking){
  const desired=choice==='all'?state.footY:(sourceLevels[choice]??0);
  const position=choice==='all'?new THREE.Vector3(camera.position.x,state.footY,camera.position.z):findSpawn(desired);
  if(position){setWalkCamera(position);if(!matchMedia('(pointer:coarse)').matches)fps.lock();}
  else{exitWalk();toast('No confirmed floor surface found at this storey.');}
 }else frameBuilding(choice);
 if(choice==='second')toast('Roof level (+6.60m). This is not a third occupied floor.');
 else toast(choice==='all'?'Showing the source model across all storeys':levelNames[choice]+' selected');
}
async function syncNewLayers(){
 const res=await fetch(assetURL('/ifc/house/manifest.json')+'?cache='+Date.now(),{cache:'no-store'});
 if(!res.ok)throw new Error('Cannot fetch source geometry manifest ('+res.status+').');
 const manifest=await res.json();
 state.sourceManifest=manifest;
 const entries=manifest.layers.filter(x=>x.glb && x.bounds)
  .sort((a,b)=>priority[a.category]-priority[b.category] || (sourceLevels[a.level]??10)-(sourceLevels[b.level]??10) || a.part-b.part);
 // The source includes three known conversion exclusions. These are not
 // available GLB layers, so do not falsely report 76 of 79 loaded as incomplete.
 state.totalLayers=entries.length;
 let newEntries=entries.filter(x=>!state.layers.has(x.name));
 if(!newEntries.length){
  if(!state.decor&&state.layers.size)setupEnhancements();
  if(!state.initialReady)startIntro();
  return;
 }
 for(const layer of newEntries){
  try{
   const elements=await addSourceLayer(layer);
   // Hold introduction until all structural and furnishing files have loaded.
   // The earlier 3-layer trigger framed the camera before surrounding walls arrived.
   let numerator=state.layers.size,denominator=state.totalLayers;
   progress((numerator/Math.max(1,denominator))*100,
      numerator+'/'+denominator+' source layers loaded · '+layer.category+' · '+elements+' objects');
   refreshVisibility();
   if(state.loadedLayers%5===0)await new Promise(resolve=>setTimeout(resolve,0));
  }catch(err){
   console.warn('[AutoMinds Source] Layer failed',layer.name,err);
   toast('Some source components could not be displayed: '+layer.name);
  }
 }
 setupEnhancements();
 if(!state.initialReady)startIntro();
 else if(state.mode==='orbit'&&!state.stairHighlight&&!state.showGatePreview)focusMainBuilding();
 progress(100,state.layers.size+'/'+state.totalLayers+' IFC geometry tiles ready · 5 source bed positions enriched');
 // Dedicated source stair QA deep link, activated once proxy components exist.
 if(!state.stairPreviewDone && new URLSearchParams(location.search).get('focus')==='stairs'){
  const hasStairs=state.meshes.some(r=>isResidenceRecord(r) && /TREAD|STAIR|LANDING|STEP/i.test(String(r.mesh.userData.ifc?.name||'')));
  if(hasStairs){state.stairPreviewDone=true;focusSourceStairs();}
 }
 $('hudStatus').textContent=state.visibleMeshes.toLocaleString()+' SOURCE ELEMENTS';
 console.info('[AutoMinds Source] loaded source layers',state.layers.size,'/',manifest.layers.length,
  'conversion failures',manifest.missingOrFailed?.length||0);
}
function startIntro(){
 if(state.initialReady)return;
 state.initialReady=true;
 $('loading').classList.add('hidden');
 if(new URLSearchParams(location.search).has('preview')){
  $('intro').classList.add('hidden');
  focusMainBuilding();
  const requestedDrawing=new URLSearchParams(location.search).get('drawing');
  if(requestedDrawing){
   const i=clientDrawings.findIndex(d=>d.floor===requestedDrawing || d.label.toLowerCase().includes(requestedDrawing.toLowerCase()));
   if(i>=0){state.drawingIndex=i;showArchitecturalDrawing(true);}
  }
 }else{
  $('intro').classList.remove('hidden');
 }
}
async function begin(){
 try{
  const [metaResp,elementResp]=await Promise.all([
   fetch(assetURL('/ifc/house/manifest.json')+'?x='+Date.now(),{cache:'no-store'}),
   fetch(assetURL('/ifc/house/source-elements.json'),{cache:'force-cache'})
  ]);
  if(!metaResp.ok)throw new Error('Missing IFC model manifest.');
  if(!elementResp.ok)throw new Error('Missing IFC source element classification.');
  const [manifest,map]=await Promise.all([metaResp.json(),elementResp.json()]);
  state.elements=map;
  state.sourceManifest=manifest;
  const requestedFloor=new URLSearchParams(location.search).get('floor');
  if(['ground','first','second'].includes(requestedFloor)){
   state.floor=requestedFloor;
   state.sectionEnabled=true;
   $('sectionToggle').checked=true;
   for(const b of document.querySelectorAll('#floorButtons button'))b.classList.toggle('active',b.dataset.floor===requestedFloor);
  }
  determineOrigin(manifest);
  $('elementTotal').textContent=Object.keys(map).length.toLocaleString();
  progress(7,'Read real IFC element index');
  await syncNewLayers();
  // A source file may be converted while the browser remains open. Refresh layers periodically.
  setInterval(()=>syncNewLayers().catch(err=>console.warn('Layer manifest poll failed',err)),35000);
 }catch(e){fatal(e?.message||e)}
}
begin();

// ---------- Architectural map derived from real element bounds ----------
function mapDraw(){
 const c=$('mapCanvas');
 const ctx=c.getContext('2d');const W=c.width,H=c.height;
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#0c252a';ctx.fillRect(0,0,W,H);
 let bounds=bestArchitecturalBounds(state.floor);
 let size=bounds.getSize(new THREE.Vector3());
 let margin=20,s=Math.min((W-margin*2)/Math.max(10,size.x),(H-margin*2)/Math.max(10,size.z));
 const ox=W/2 - (bounds.min.x+bounds.max.x)*.5*s;
 const oz=H/2 - (bounds.min.z+bounds.max.z)*.5*s;
 const xp=x=>x*s+ox,zp=z=>z*s+oz;
 ctx.strokeStyle='rgba(160,202,193,.13)';
 for(let x=0;x<W;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
 for(let y=0;y<H;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 const records=state.meshes.filter(x=>
  ['walls','slabs'].includes(x.category) &&
  (state.floor==='all'||x.layer.level===state.floor) &&
  isRecordVisible(x)
 );
 for(const r of records){
  const b=r.box;
  const dx=Math.max(.6,b.max.x-b.min.x),dz=Math.max(.6,b.max.z-b.min.z);
  ctx.strokeStyle=r.category==='walls'?'rgba(238,202,160,.65)':'rgba(180,203,196,.16)';
  ctx.lineWidth=r.category==='walls'?1.3:.5;
  ctx.strokeRect(xp(b.min.x),zp(b.min.z),dx*s,dz*s);
 }
 if(state.mode==='walk'){
  const x=xp(camera.position.x),y=zp(camera.position.z);
  ctx.fillStyle='#edc38c';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  ctx.strokeStyle='#ffd6a1';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dir.x*17,y+dir.z*17);ctx.stroke();
 }
 ctx.fillStyle='#aec5bf';ctx.font='bold 9px DM Sans';ctx.fillText('SOURCE IFC · METRE SCALE',13,H-10);
}
function isRecordVisible(rec){
 let group=state.layers.get(rec.layer.name);
 return Boolean(group?.group.visible && rec.mesh.visible && visibleSourceRecord(rec));
}

// ---------- Collision-aware first-person navigation on imported IFC geometry ----------
const eyeHeight=1.64;
const visitorRadius=.32; // comfortable minimum wall clearance in real IFC metres
const axisDown=new THREE.Vector3(0,-1,0);
const normalMatrix=new THREE.Matrix3();
const candidatePos=new THREE.Vector3();
function nearby(list,x,y,z,dist=1.8){
 return list.filter(record=>{
  if(!isRecordVisible(record))return false;
  const b=record.box;
  return x>=b.min.x-dist && x<=b.max.x+dist &&
   z>=b.min.z-dist && z<=b.max.z+dist &&
   y>=b.min.y-2 && y<=b.max.y+3;
 });
}
function sampleGround(x,z,targetY,maxRise=.9,maxFall=1.25){
 const starts=new THREE.Vector3(x,targetY+maxRise,z);
 downcaster.set(starts,axisDown);
 downcaster.far=maxRise+maxFall;
 const candidates=nearby(state.floors,x,targetY,z,.15).map(r=>r.mesh);
 const stairDeck=state.stairSafety?.transitionDeck;
 const stairBox=state.stairSafety?.walkSurfaceBox;
 if(state.stairSafety?.root?.visible&&stairDeck?.visible&&stairBox&&
   x>=stairBox.min.x-.02&&x<=stairBox.max.x+.02&&
   z>=stairBox.min.z-.02&&z<=stairBox.max.z+.02)candidates.push(stairDeck);
 if(!candidates.length)return null;
 const hits=downcaster.intersectObjects(candidates,false);
 for(const h of hits){
  const y=h.point.y;
  const rise=y-targetY;
  if(rise>maxRise-.02 || rise<-maxFall)continue;
  if(h.face){
   normalMatrix.getNormalMatrix(h.object.matrixWorld);
   const n=h.face.normal.clone().applyMatrix3(normalMatrix);
   if(Math.abs(n.y)<.56)continue;
  }
  return {x:h.point.x,z:h.point.z,y,object:h.object};
 }
 const seam=sourceSlabSeamSupport(state.floors,x,z,targetY,maxRise,maxFall,isRecordVisible);
 if(seam)return {x,z,y:seam.y,object:seam.record.mesh,sourceSlabSeam:true};
 return null;
}
function findSpawn(level=0,x=null,z=null,nearFurniture=false){
 const bounds=bestArchitecturalBounds('all');
 const mid=bounds.getCenter(new THREE.Vector3());
 // The central IFC doorway cluster provides a more useful starting viewpoint
 // than the midpoint between multiple geographically separated source groups.
 const point=level>=3.0?[114.1,-11.1]:[111.68,-7.10];
 const xx=x??(point[0]-state.origin.x),zz=z??(point[1]-state.origin.z);
 const offsets=nearFurniture?[[1.8,0],[-1.8,0],[0,1.8],[0,-1.8],[2.3,0],[-2.3,0],[0,2.3],[0,-2.3],[2,1.1],[-2,1.1],[2,-1.1],[-2,-1.1],[1.4,1.7],[-1.4,1.7],[1.4,-1.7],[-1.4,-1.7]]:
 [[0,0],[1.2,0],[-1.2,0],[0,1.2],[0,-1.2],[2,1],[-2,0],[0,3],[0,-3],[4,0],[-4,0],[3,-3],[-3,3],[5,4],[-5,-4],[6,0],[-6,0],[0,6],[0,-6],[8,3],[-8,-3]];
 let best=null,bestScore=-Infinity;
 for(const [a,b] of offsets){
  const candidate=sampleGround(xx+a,zz+b,level,2.4,2.0);
  if(!candidate || Math.abs(candidate.y-level)>1.45)continue;
  const hazard=nearby(state.solids,candidate.x,candidate.y+1,candidate.z,.65)
   .filter(r=>{
    if(!['walls','columns','doors','furniture','proxies'].includes(r.category))return false;
    const name=String(r.mesh.userData.ifc?.name||'').toUpperCase();
    if(r.category==='proxies'&&(/TREAD|STAIR|SLA -|LANDING|STEP/.test(name)))return false;
    const b=r.box;
    if(candidate.y+.28>b.max.y||candidate.y+1.56<b.min.y)return false;
    return candidate.x>b.min.x-visitorRadius&&candidate.x<b.max.x+visitorRadius&&candidate.z>b.min.z-visitorRadius&&candidate.z<b.max.z+visitorRadius;
   });
  if(hazard.length)continue;
  if(state.dining?.root.visible&&state.dining.collisionBoxes.some(b=>
   candidate.y+1.2>b.min.y&&candidate.y+.2<b.max.y &&
   candidate.x>b.min.x-.3 && candidate.x<b.max.x+.3 &&
   candidate.z>b.min.z-.3 && candidate.z<b.max.z+.3))continue;
  if(nearFurniture&&state.decor?.sources.some(r=>{
   const b=r.box;
   return candidate.y+1.45>b.min.y && candidate.y+.22<b.max.y &&
    candidate.x>b.min.x-visitorRadius && candidate.x<b.max.x+visitorRadius &&
    candidate.z>b.min.z-visitorRadius && candidate.z<b.max.z+visitorRadius;
  }))continue;
  const position=new THREE.Vector3(candidate.x,candidate.y,candidate.z);
  if(!nearFurniture)return position;
  // Choose the widest confirmed open area around original furniture rather than a closet corner.
  let wallClearance=3;
  for(const r of nearby(state.solids,candidate.x,candidate.y+1,candidate.z,3)){
   if(!['walls','columns','doors'].includes(r.category))continue;
   const b=r.box;
   if(candidate.y+1.3<b.min.y || candidate.y+.3>b.max.y)continue;
   const dx=Math.max(b.min.x-candidate.x,0,candidate.x-b.max.x);
   const dz=Math.max(b.min.z-candidate.z,0,candidate.z-b.max.z);
   wallClearance=Math.min(wallClearance,Math.hypot(dx,dz));
  }
  const score=Math.min(wallClearance,2.2) - Math.abs(Math.hypot(a,b)-2.1)*.25;
  if(score>bestScore){bestScore=score;best=position;}
 }
 return best; // No safe floor points are fabricated.
}
function setWalkCamera(position){
 state.footY=position.y;
 camera.position.set(position.x,position.y+eyeHeight,position.z);
 camera.rotation.set(0,Math.PI,0,'YXZ');
 camera.fov=73;camera.updateProjectionMatrix();
 orbit.target.copy(new THREE.Vector3(position.x,position.y+eyeHeight,position.z-3));
}
function enterWalk(position=null,lookTarget=null){
 if(state.layers.size===0){toast('Architectural geometry is still loading.');return;}
 const elevation=sourceLevels[state.floor]??0;
 let spawn=position??findSpawn(elevation);
 if(!spawn){toast('No verified walkable floor found here. Select a modelled floor or double-click a floor slab.');return;}
 setWalkCamera(spawn);
 if(lookTarget)camera.lookAt(new THREE.Vector3(lookTarget.x,spawn.y+eyeHeight-.12,lookTarget.z));
 state.mode='walk';state.walkEnabled=true;orbit.enabled=false;
 refreshVisibility(); // restore entire roof and source ceiling for full-height first person
 $('walkBtn').textContent='✕ EXIT WALK';
 if(!matchMedia('(pointer:coarse)').matches)fps.lock();
 $('crosshair').classList.remove('hidden');
 $('locationText').textContent='INTERACTIVE WALKTHROUGH';
 updateDoorHint();
 toast('Walk with WASD · look around with your mouse · Esc releases the pointer.');
}
function exitWalk(){
 if(state.mode!=='walk')return;
 state.mode='orbit';state.walkEnabled=false;
 camera.fov=66;camera.updateProjectionMatrix();
 refreshVisibility();
 $('walkBtn').textContent='⌖ WALK INSIDE';
 fps.unlock();
 orbit.enabled=true;
 const dir=new THREE.Vector3();camera.getWorldDirection(dir);
 orbit.target.copy(camera.position.clone().addScaledVector(dir,4));
 orbit.update();
 $('crosshair').classList.add('hidden');
 $('locationText').textContent='SOURCE MODEL · ORBIT';
 updateDoorHint();
}
fps.addEventListener('unlock',()=>{
 if(state.mode==='walk'&&!matchMedia('(pointer:coarse)').matches){
  toast('Mouse released. Click the house again to continue walking, or select a floor.');
 }
});
renderer.domElement.addEventListener('click',()=>{
 if(state.mode==='walk'&&!fps.isLocked&&!matchMedia('(pointer:coarse)').matches)fps.lock();
});
function detectObstacle(oldX,oldZ,nextX,nextZ,footY){
 state.lastCollisionBlocker=null;
 const diff=new THREE.Vector3(nextX-oldX,0,nextZ-oldZ);
 const distance=diff.length();
 if(distance<.0001)return false;
 const direction=diff.clone().normalize();
 if(state.doorSystem?.blocksTraversal(
  new THREE.Vector3(oldX,footY+1,oldZ),
  new THREE.Vector3(nextX,footY+1,nextZ),footY,visitorRadius))return true;
 if(state.windows?.blocksTraversal(
  new THREE.Vector3(oldX,footY+1,oldZ),
  new THREE.Vector3(nextX,footY+1,nextZ),footY,visitorRadius)){
  state.lastCollisionBlocker={kind:'solid glazed window'};return true;
 }
 if(state.facadeAudit?.blocksTraversal(
  new THREE.Vector3(oldX,footY+1,oldZ),
  new THREE.Vector3(nextX,footY+1,nextZ),footY,visitorRadius)){
  state.lastCollisionBlocker={kind:'fixed facade glass'};return true;
 }
 if(state.showStairSafety&&state.stairSafety?.blocksTraversal(
  new THREE.Vector3(oldX,footY+1,oldZ),
  new THREE.Vector3(nextX,footY+1,nextZ),footY,visitorRadius)){
  state.lastCollisionBlocker={kind:'protected staircase guard'};return true;
 }
 const candidates=nearby(state.solids,nextX,footY+1.05,nextZ,1.3);
 const rayMeshes=candidates.filter(r=>{
  if(!r.mesh.visible||r.mesh.userData.functionallyReplacedDoorId)return false;
  const type=r.category;
  if(type==='railings')return true;
  if(type==='proxies'){
   const name=String(r.mesh.userData.ifc?.name||'').toUpperCase();
   if(name.includes('TREAD')||name.includes('SLAB')||name.startsWith('SLA'))return false;
  }
  return true;
 }).map(r=>r.mesh);
 if(state.doorSystem)rayMeshes.push(...state.doorSystem.collisionMeshes());
 if(state.enhancedFurniture&&state.showFurniture&&state.decor){
  // Optional detailed beds retain real-geometry physical obstructions.
  for(const b of state.decor.collisionBoxes??[]){
   if(footY+1.45<b.min.y||footY+.25>b.max.y)continue;
   if(nextX>b.min.x-visitorRadius && nextX<b.max.x+visitorRadius &&
      nextZ>b.min.z-visitorRadius && nextZ<b.max.z+visitorRadius){
      state.lastCollisionBlocker={kind:'resized bedroom furniture',bounds:[b.min.toArray(),b.max.toArray()]};
      return true;
    }
  }
 }
 if(state.dining?.root.visible){
  const boxes=state.dining.collisionBoxes;
  if(boxes.some(b=>footY+.9>b.min.y&&footY+.22<b.max.y &&
   nextX>b.min.x-visitorRadius && nextX<b.max.x+visitorRadius &&
   nextZ>b.min.z-visitorRadius && nextZ<b.max.z+visitorRadius)){
   state.lastCollisionBlocker={kind:'six-seat dining furniture'};
   return true;
  }
 }
 if(!rayMeshes.length)return false;
 const headHeights=[.37,.86,1.35,1.57];
 // Narrow source door leaves can be only ~0.57 m across. Briefly tighten the
 // visitor's collision envelope while crossing an OPEN door; retain normal
 // comfortable clearance everywhere else without changing architect dimensions.
 const passageDoor=state.doorSystem?.nearest(new THREE.Vector3(nextX,footY+1,nextZ),footY,1.1);
 const clearanceRadius=passageDoor?.current>.85
  ?Math.min(visitorRadius,Math.max(.16,passageDoor.width/2-.10))
  :visitorRadius;
 const cast=new THREE.Raycaster();
 cast.far=distance+.29;
 const sideways=new THREE.Vector3(-direction.z,0,direction.x);
 for(const h of headHeights)for(const offset of [-clearanceRadius,0,clearanceRadius]){
  const origin=new THREE.Vector3(oldX,footY+h,oldZ).addScaledVector(sideways,offset);
  cast.set(origin,direction);
  const hits=cast.intersectObjects(rayMeshes,false);
  const blocking=hits.find(hit=>{
   if(hit.distance>=distance+.19)return false;
   // An open IFC door is genuinely passable only through a wall aperture tied
   // to THAT door's source location. Do not ignore arbitrary furniture or walls.
   if(hit.object.userData.doorId)return true;
   if(state.repairDoorApertures &&
      state.doorApertureAudit?.permitsOpenDoorWallHit(hit,footY))return false;
   return true;
  });
  if(blocking){
    state.lastCollisionBlocker={kind:'IFC source mesh',name:blocking.object?.userData?.ifc?.name??blocking.object?.name??null,
      guid:blocking.object?.userData?.ifc?.guid??null,
      point:blocking.point.toArray().map(x=>+x.toFixed(3)),distance:+blocking.distance.toFixed(3)};
    return true;
  }
 }
 return false;
}
function advanceWalk(dt){
 if(state.mode!=='walk')return;
 const mobile=matchMedia('(pointer:coarse)').matches;
 if(!mobile && !fps.isLocked)return;
 let ahead=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-state.joyY;
 let sideways=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+state.joyX;
 const magnitude=Math.hypot(ahead,sideways);
 if(magnitude<.05)return;
 const speed=(keys.ShiftLeft||keys.ShiftRight)?4.4:2.7;
 const scale=speed*Math.min(.05,dt)/Math.max(1,magnitude);
 ahead*=scale;sideways*=scale;
 const beforeX=camera.position.x,beforeZ=camera.position.z;
 function trial(kind,value){
  const x=camera.position.x,z=camera.position.z;
  if(kind==='forward')fps.moveForward(value);
  else fps.moveRight(value);
  if(detectObstacle(x,z,camera.position.x,camera.position.z,state.footY)){
   camera.position.x=x;camera.position.z=z;return;
  }
  const ground=sampleGround(camera.position.x,camera.position.z,state.footY,.27,.67);
  if(!ground){
   // No source-derived walkable surface: do not silently float out of the building.
   camera.position.x=x;camera.position.z=z;return;
  }
  if(ground.y-state.footY<=.26 && state.footY-ground.y<=.67)state.footY=ground.y;
  else{camera.position.x=x;camera.position.z=z;}
 }
 if(ahead)trial('forward',ahead);
 if(sideways)trial('right',sideways);
 // Vertically follow the real floor and tread elevations; avoid camera jumps.
 const targetY=state.footY+eyeHeight;
 camera.position.y=THREE.MathUtils.lerp(camera.position.y,targetY,Math.min(1,dt*15));
 if(Math.hypot(camera.position.x-beforeX,camera.position.z-beforeZ)>.01){
  const alt=state.footY;
  $('levelText').textContent=alt<1.5?'GROUND FLOOR':alt<4.75?'FIRST FLOOR':'ROOF LEVEL';
 }
}
function toggleNearestDoor(){
 if(!state.doorSystem){toast('Door geometry is still loading.');return;}
 const targeted=state.doorSystem.raycastDoorFromCamera(camera,2.8);
 const nearbyDoor=state.doorSystem.nearest(camera.position,state.footY,2.0);
 const chosen=(targeted&&Math.abs(state.footY-targeted.groundY)<1.24)?targeted:nearbyDoor;
 const result=state.doorSystem.toggle(chosen,camera.position);
 if(!result.ok){toast(result.reason);return;}
 toast((result.open?'Opening':'Closing')+' '+(result.door.style==='slide'?'sliding':'hinged')+' door '+result.door.id);
 updateDoorHint();
}
function updateDoorHint(){
 const container=$('doorInteract');
 if(state.mode!=='walk'||!state.doorSystem){
  container.classList.add('hidden');return;
 }
 const door=state.doorSystem.nearest(camera.position,state.footY,1.9);
 if(!door){container.classList.add('hidden');return;}
 const open=door.target>.5;
 container.classList.remove('hidden');
 $('doorHint').textContent='Door '+door.id+' · '+(open?'Open':'Closed')+' · Press E to '+(open?'close':'open')+' · '+(door.style==='slide'?'sliding':door.style==='double'?'double':'hinged');
 $('doorActionBtn').textContent=open?'CLOSE DOOR':'OPEN DOOR';
}

// ---------- Controls, references and interface ----------
function toggleLighting(){
 state.night=!state.night;
 hemi.intensity=state.night?.50:1.55;
 sun.intensity=state.night?.18:2.25;
 fill.intensity=state.night?.42:.55;
 scene.background.set(state.night?'#18323c':'#bcd8dd');
 scene.fog.color.set(state.night?'#18323c':'#bcd8dd');
 renderer.toneMappingExposure=state.night?1.10:1.02;
 $('lightBtn').querySelector('.long').textContent=state.night?'Evening':'Daylight';
 toast(state.night?'Evening lighting':'Daylight restored');
}
const clientDrawings=[
 {label:'Ground-floor plan',file:'Home-Ground-plan.jpg',floor:'ground'},
 {label:'First-floor plan',file:'Home-First-plan.jpg',floor:'first'},
 {label:'Roof plan',file:'Home-Roof-plan.jpg',floor:'second'},
 {label:'Site layout',file:'Home-Site-plan.jpg',floor:null},
 {label:'Building elevations',file:'Home-Elevations.jpg',floor:null}
];
function updateArchitecturalDrawing(){
 const d=clientDrawings[state.drawingIndex];
 $('drawingTitle').textContent=d.label;
 $('drawingImage').src=assetURL('/architectural-drawings/'+d.file);
 $('drawingCount').textContent=(state.drawingIndex+1)+' / '+clientDrawings.length;
 if(d.floor)applyFloorSelection(d.floor);
}
function showArchitecturalDrawing(open=!state.drawingsOpen){
 state.drawingsOpen=open;
 $('drawingPanel').classList.toggle('hidden',!open);
 if(open){showReference(false);toggleMap(false);updateArchitecturalDrawing();}
}
function changeArchitecturalDrawing(direction){
 state.drawingIndex=(state.drawingIndex+direction+clientDrawings.length)%clientDrawings.length;
 updateArchitecturalDrawing();
}
function showReference(open=!state.referenceOpen){
 state.referenceOpen=open;
 $('renderPanel').classList.toggle('hidden',!open);
 if(open)updateReference();
}
function updateReference(){
 const [id,name]=refs[state.referenceIndex];
 $('referenceTitle').textContent=name;
 $('referenceImage').src=assetURL('/house-references/'+id+'.png');
 $('referenceCount').textContent=state.referenceIndex+1+' / '+refs.length;
}
function changeReference(delta){
 state.referenceIndex=(state.referenceIndex+delta+refs.length)%refs.length;
 updateReference();
}
function toggleMap(open=!state.mapOpen){
 state.mapOpen=open;
 $('mapPanel').classList.toggle('hidden',!open);
 if(open)mapDraw();
}
$('floorButtons').addEventListener('click',ev=>{
 const b=ev.target.closest('button[data-floor]');
 if(b)applyFloorSelection(b.dataset.floor);
});
$('detailsToggle').addEventListener('change',e=>{state.showDetails=e.target.checked;refreshVisibility();toast(state.showDetails?'All built-in details visible':'Built-in details hidden to improve speed');});
$('furnitureToggle').addEventListener('change',e=>{state.showFurniture=e.target.checked;refreshVisibility();toast(state.showFurniture?'Furniture visible':'Furniture hidden');});
$('surroundingsToggle').addEventListener('change',e=>{
 clearStairHighlight();
 state.showSurroundings=e.target.checked;
 refreshVisibility();
 if(state.mode==='orbit')frameBuilding();
 toast(state.showSurroundings?'Approved site-plan context shown; floating IFC fragments hidden':'Main residence isolated; compound preserved');
});
$('sectionToggle').addEventListener('change',e=>{
 state.sectionEnabled=e.target.checked;
 if(state.sectionEnabled&&state.floor==='all'){
  state.floor='ground';
  for(const b of document.querySelectorAll('#floorButtons button'))b.classList.toggle('active',b.dataset.floor==='ground');
 }
 refreshVisibility();
 if(state.mode==='orbit')frameBuilding(state.floor);
 toast(state.sectionEnabled?'Architectural section enabled: roof and upper floors cut away':'Complete structure restored');
});
$('lightBtn').addEventListener('click',toggleLighting);
$('referenceBtn').addEventListener('click',()=>{showArchitecturalDrawing(false);showReference();});
$('drawingsBtn').addEventListener('click',()=>showArchitecturalDrawing());
$('closeDrawings').addEventListener('click',()=>showArchitecturalDrawing(false));
$('previousDrawing').addEventListener('click',()=>changeArchitecturalDrawing(-1));
$('nextDrawing').addEventListener('click',()=>changeArchitecturalDrawing(1));
$('closeRef').addEventListener('click',()=>showReference(false));
$('prevRef').addEventListener('click',()=>changeReference(-1));
$('nextRef').addEventListener('click',()=>changeReference(1));
$('mapBtn').addEventListener('click',()=>toggleMap());
$('closeMap').addEventListener('click',()=>toggleMap(false));
$('recenterBtn').addEventListener('click',()=>{
 clearStairHighlight();
 state.showSurroundings=true;
 $('surroundingsToggle').checked=true;
 state.sectionEnabled=false;
 $('sectionToggle').checked=false;
 state.floor='all';
 for(const b of document.querySelectorAll('#floorButtons button'))b.classList.toggle('active',b.dataset.floor==='all');
 refreshVisibility();frameBuilding('all');
});
$('coreFocusBtn').addEventListener('click',()=>{clearStairHighlight();focusMainBuilding();});
$('stairFocusBtn').addEventListener('click',focusSourceStairs);
$('stairSafetyToggle').addEventListener('change',e=>{
 state.showStairSafety=e.target.checked;
 refreshVisibility();
 toast(state.showStairSafety?'Stair guardrails and wall handrails shown · architectural concept':'Original IFC staircase without the proposed safety treatment');
});
$('measureBtn').addEventListener('click',beginMeasure);
renderer.domElement.addEventListener('click',measureSourceClick);
$('gateBtn').addEventListener('click',focusGatePreview);
$('styledBedsToggle').addEventListener('change',ev=>{state.enhancedFurniture=ev.target.checked;refreshVisibility();toast(state.enhancedFurniture?'3D bedroom furniture improvements shown':'Original IFC furniture restored');});
$('diningBtn').addEventListener('click',()=>{
 if(!state.dining){toast('Dining room geometry still loading');return;}
 if(state.mode==='walk')exitWalk();
 applyFloorSelection('ground');
 const target=state.dining.root.position.clone();
 let spawn=null;
 for(const delta of [[0,2.65],[-2.5,0],[2.5,0],[0,-2.65],[-2,2],[2,2]]){
  spawn=findSpawn(0,target.x+delta[0],target.z+delta[1]);
  if(spawn)break;
 }
 if(!spawn){toast('Safe dining entry not yet verified. Viewing the area overhead.');orbit.target.copy(target);camera.position.copy(target.clone().add(new THREE.Vector3(3,4,3)));orbit.update();return;}
 enterWalk(spawn,target);
 toast('Dining preview: six modelled 3D chairs and a timber dining table.');
});
$('bedroomsBtn').addEventListener('click',()=>{$('bedroomPanel').classList.toggle('hidden');$('doorPanel').classList.add('hidden');state.roomListVisible=!$('bedroomPanel').classList.contains('hidden');});
$('doorNavigatorBtn').addEventListener('click',()=>{$('doorPanel').classList.toggle('hidden');$('bedroomPanel').classList.add('hidden');});
$('doorRevealToggle').addEventListener('change',e=>{
 state.repairDoorApertures=e.target.checked;
 if(e.target.checked){
  state.doorApertureAudit=revealObstructedDoors(mat.wall,state.doorSystem,state.meshes,isResidenceRecord,state.windows,state.facadeAudit);
 }else if(state.doorApertureAudit){
  state.doorApertureAudit.restore();
 }
 const count=state.doorApertureAudit?.obstructedCount||0;
 toast(e.target.checked?'Revealing '+count+' occluded IFC door locations':'Original wall appearance restored');
});
$('closeDoorPanel').addEventListener('click',()=>{$('doorPanel').classList.add('hidden');});
$('closeBedroomPanel').addEventListener('click',()=>{$('bedroomPanel').classList.add('hidden');state.roomListVisible=false;});
$('walkBtn').addEventListener('click',()=>state.mode==='walk'?exitWalk():enterWalk());
$('doorActionBtn').addEventListener('click',toggleNearestDoor);
renderer.domElement.addEventListener('click',()=>{
 if(state.mode!=='walk'||!fps.isLocked||!state.doorSystem)return;
 const target=state.doorSystem.raycastDoorFromCamera(camera,2.4);
 if(target&&Math.abs(state.footY-target.groundY)<1.24)toggleNearestDoor();
});
$('fullscreenBtn').addEventListener('click',()=>{
 if(document.fullscreenElement)document.exitFullscreen?.();
 else document.documentElement.requestFullscreen?.().catch(()=>toast('Fullscreen is unavailable.'));
});
$('enterBtn').addEventListener('click',()=>{
 $('intro').classList.add('hidden');
 enterWalk();
});
$('orbitBtn').addEventListener('click',()=>{
 $('intro').classList.add('hidden');
 focusMainBuilding();
});
renderer.domElement.addEventListener('dblclick',ev=>{
 if(state.mode!=='orbit')return;
 const bounds=renderer.domElement.getBoundingClientRect();
 const p=new THREE.Vector2((ev.clientX-bounds.left)/bounds.width*2-1,-((ev.clientY-bounds.top)/bounds.height*2-1));
 raycaster.setFromCamera(p,camera);
 const visibleFloors=state.floors.filter(isRecordVisible).map(x=>x.mesh);
 const hits=raycaster.intersectObjects(visibleFloors,false);
 const hit=hits.find(h=>h.face&&Math.abs(h.face.normal.y)>.3)??hits[0];
 if(!hit){toast('Double-click a floor surface to enter there.');return;}
 enterWalk(new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z));
});
document.addEventListener('keydown',ev=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(ev.code))ev.preventDefault();
 keys[ev.code]=true;
 if(ev.repeat)return;
 if(ev.code==='KeyE'&&state.mode==='walk')toggleNearestDoor();
 else if(ev.code==='KeyM')toggleMap();
 else if(ev.code==='KeyV')beginMeasure();
 else if(ev.code==='KeyR')showReference();
 else if(ev.code==='KeyL')toggleLighting();
 else if(ev.code==='KeyF'){if(state.mode==='walk')exitWalk();else enterWalk();}
 else if(ev.code==='KeyH')frameBuilding();
 else if(ev.code==='Digit0')applyFloorSelection('all');
 else if(ev.code==='Digit1')applyFloorSelection('ground');
 else if(ev.code==='Digit2')applyFloorSelection('first');
 else if(ev.code==='Digit3')applyFloorSelection('second');
});
document.addEventListener('keyup',ev=>keys[ev.code]=false);
window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));

// ---------- Touch controls and render loop ----------
const touchJoystick=$('touchJoystick'),touchThumb=$('touchThumb');
let joyPointer=null,lookPointer=null,lastLookX=0,lastLookY=0;
touchJoystick.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse')return;
 joyPointer=e.pointerId;touchJoystick.setPointerCapture(e.pointerId);
 e.preventDefault();
});
touchJoystick.addEventListener('pointermove',e=>{
 if(joyPointer!==e.pointerId)return;
 const b=touchJoystick.getBoundingClientRect();
 const centerX=b.left+b.width/2,centerY=b.top+50;
 const dx=e.clientX-centerX,dy=e.clientY-centerY;
 const distance=Math.max(1,Math.hypot(dx,dy)),len=Math.min(distance,35);
 state.joyX=dx/distance*len/35;
 state.joyY=dy/distance*len/35;
 touchThumb.style.transform='translate('+Math.round(state.joyX*35)+'px,'+Math.round(state.joyY*35)+'px)';
});
function releaseJoystick(){
 joyPointer=null;state.joyX=state.joyY=0;touchThumb.style.transform='translate(0,0)';
}
touchJoystick.addEventListener('pointerup',releaseJoystick);
touchJoystick.addEventListener('pointercancel',releaseJoystick);
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||state.mode!=='walk'||lookPointer!==null)return;
 lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;
 renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(e.pointerId!==lookPointer)return;
 const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;
 lastLookX=e.clientX;lastLookY=e.clientY;
 const rotation=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');
 rotation.y-=dx*.004;
 rotation.x=THREE.MathUtils.clamp(rotation.x-dy*.004,-1.44,1.44);
 camera.quaternion.setFromEuler(rotation);
});
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
renderer.domElement.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
function animate(){
 const dt=Math.min(clock.getDelta(),.06);
 if(state.doorSystem)state.doorSystem.update(dt);
 if(state.mode==='walk')advanceWalk(dt);
 else if(orbit.enabled)orbit.update();
 if(state.mapOpen){lastMapUpdate+=dt;if(lastMapUpdate>.12){mapDraw();lastMapUpdate=0;}}
 if(state.mode==='walk'){
  lastHudUpdate+=dt;
  if(lastHudUpdate>.35){
   $('locationText').textContent='FIRST-PERSON · ACTUAL GEOMETRY';
   updateDoorHint();
   lastHudUpdate=0;
  }
 }
 renderer.render(scene,camera);
}
// Browser-only acceptance diagnostics. Available only on a locally hosted ?qa preview.
// This is intentionally not installed on public review URLs or normal client sessions.
function qaDoorWalk(door,side=1,opened=true,lateral=0){
 const prev={current:door.current,target:door.target};
 const floorY=door.level==='first'?3.3:0;
 try{
  door.current=opened?1:0;door.target=door.current;
  state.doorSystem.update(.016);
  door.visual.updateWorldMatrix(true,false);
  const distanceFromOpening=.56;
  const start=door.visual.localToWorld(new THREE.Vector3(lateral,0,-side*distanceFromOpening));
  const finish=door.visual.localToWorld(new THREE.Vector3(lateral,0,side*distanceFromOpening));
  let footY=floorY;
  const startFloor=sampleGround(start.x,start.z,floorY,.75,1.15);
  if(!startFloor)return {ok:false,reason:'start has no source floor',side,opened};
  footY=startFloor.y;
  let oldX=start.x,oldZ=start.z;
  for(let i=1;i<=24;i++){
   const t=i/24;
   const nextX=THREE.MathUtils.lerp(start.x,finish.x,t);
   const nextZ=THREE.MathUtils.lerp(start.z,finish.z,t);
   if(detectObstacle(oldX,oldZ,nextX,nextZ,footY)){
    return {ok:false,reason:'source or leaf collision',blocker:state.lastCollisionBlocker,side,opened,progress:+t.toFixed(3),position:[+nextX.toFixed(3),+nextZ.toFixed(3)]};
   }
   const ground=sampleGround(nextX,nextZ,footY,.32,.70);
   if(!ground)return {ok:false,reason:'floor missing in crossing',side,opened,progress:+t.toFixed(3),
     x:nextX,z:nextZ,footY,
     nearbyFloorSlabs:nearby(state.floors,nextX,footY,nextZ,.32).slice(0,7)
       .map(r=>({name:r.mesh.userData.ifc?.name,category:r.category,
         y:[+r.box.min.y.toFixed(3),+r.box.max.y.toFixed(3)],
         x:[+r.box.min.x.toFixed(2),+r.box.max.x.toFixed(2)],
         z:[+r.box.min.z.toFixed(2),+r.box.max.z.toFixed(2)]}))};
   if(ground.y-footY>.30 || footY-ground.y>.7){
    return {ok:false,reason:'floor height discontinuity',side,opened,progress:+t.toFixed(3),height:ground.y};
   }
   footY=ground.y;oldX=nextX;oldZ=nextZ;
  }
  return {ok:true,side,opened,arrivalFootY:+footY.toFixed(3)};
 }finally{
  door.current=prev.current;door.target=prev.target;state.doorSystem.update(.016);
 }
}
const isLocalQA=(location.hostname==='localhost'||location.hostname==='127.0.0.1')
 && new URLSearchParams(location.search).has('qa');
if(isLocalQA){
 window.__AutoMindsQA={
  summary:()=>({meshes:state.meshes.length,loaded:state.loadedLayers,expected:state.totalLayers,
    doorCount:state.doorSystem?.doors.length??0,apertures:state.doorApertureAudit?.obstructedCount??0,
    siteContext:state.siteContext?.summary??null,sourceContextAudit:state.sourceContextAudit??null,
    windows:state.windows?.summary??null,
    verifiedFacadeGlazing:state.facadeAudit?.summary??null,
    stairSafety:state.stairSafety?.summary??null,
    stairSafetyShown:state.stairSafety?.root?.visible??false,
    repairedWindowApertures:state.doorApertureAudit?.windowObstructedCount??0,
    openingRegistry:state.doorApertureAudit?.summary??null,
    blockedCuts:state.doorApertureAudit?.occlusionDetails??[]}),
  sceneStatus:()=>({
    loaded:state.initialReady,showSite:state.showSurroundings,
    siteVisible:Boolean(state.siteContext?.root.visible),floor:state.floor,section:state.sectionEnabled,
    outsideRawMeshesVisible:state.meshes.filter(r=>!isResidenceRecord(r)&&r.mesh.visible).length,
    originalWindowProxiesStillVisible:state.windows?[...state.windows.sourceSet].filter(r=>r.mesh.visible).length:null,
    visibleWindowAssemblies:state.windows?.windows.filter(w=>w.group.visible).length??0,
    windowsTotal:state.windows?.summary.windowAssemblies??0,
    gateVisible:Boolean(state.siteContext?.gate?.visible && state.siteContext?.root.visible),
    cameraFinite:camera.position.toArray().every(Number.isFinite),
    sceneIssues:state.siteContext?.root.children.filter(o=>o.position.toArray().some(n=>!Number.isFinite(n))).length??0,
    uiLabel:$('surroundingsToggle').closest('label')?.innerText??null,
    modelElements:state.visibleMeshes
  }),
  inspectWindow:(id=1,side=1)=>{
    const w=state.windows?.windows[id-1];
    if(!w)return {error:'Unknown IFC window'};
    if(state.mode==='walk')exitWalk();
    state.floor=w.level;state.sectionEnabled=true;refreshVisibility();
    const look=w.position.clone(),eye=w.position.clone().add(
      w.alongX?new THREE.Vector3(0,1,side*2.75):new THREE.Vector3(side*2.75,1,0));
    look.y+=.2;orbit.enabled=true;orbit.target.copy(look);
    camera.position.copy(eye);camera.lookAt(look);orbit.update();
    return {id,level:w.level,width:w.width,height:w.height,visible:w.group.visible};
  },
  inspectDoor:(id,side=1)=>{
   const door=state.doorSystem?.doors.find(d=>d.id===id);
   if(!door)return {error:'Unknown door ID'};
   if(state.mode==='walk')exitWalk();
   state.floor=door.level;state.sectionEnabled=true;refreshVisibility();
   door.visual.updateWorldMatrix(true,false);
   const look=door.visual.localToWorld(new THREE.Vector3(0,1.37,0));
   const eye=door.visual.localToWorld(new THREE.Vector3(0,1.62,side*2.65));
   orbit.enabled=true;orbit.target.copy(look);
   camera.position.copy(eye);camera.lookAt(look);orbit.update();
   return {id,level:door.level,look:look.toArray(),eye:eye.toArray(),visible:door.visual.visible};
  },
  doorCrossings:(ids=[21,25,27],bothSides=true)=>{
   if(!state.doorSystem||!state.doorApertureAudit)return {error:'IFC doors still loading'};
   // Complete architecture: avoid section clipping a legitimate crossing.
   if(state.mode==='walk')exitWalk();
   state.floor='all';state.sectionEnabled=false;refreshVisibility();
   return ids.map(id=>{
    const d=state.doorSystem.doors.find(x=>x.id===id);
    if(!d)return {id,error:'Not in IFC door catalogue'};
    const offsets=[0,.24,-.24,.48,-.48,.72,-.72,1.0,-1.0,1.3,-1.3]
      .filter(offset=>Math.abs(offset)<=Math.max(0,d.width/2-.28));
    const testClearRoute=side=>{
      const attempts=offsets.map(offset=>({...qaDoorWalk(d,side,true,offset),lateral:offset}));
      const success=attempts.find(x=>x.ok);
      return success||{...attempts[0],attempts};
    };
    const record={id,level:d.level,width:d.width,xyz:[d.position.x,d.groundY,d.position.z],
      sourceGuids:d.source.map(r=>r.mesh.userData.ifc?.guid),
      closedFront:qaDoorWalk(d,1,false),
      openFront:testClearRoute(1)};
    if(bothSides){record.closedBack=qaDoorWalk(d,-1,false);record.openBack=testClearRoute(-1);}
    return record;
   });
  },
  allDoorCrossings:()=>{
   if(!state.doorSystem)return {error:'IFC doors still loading'};
   return state.doorSystem.doors.map(d=>({
    id:d.id,level:d.level,width:+d.width.toFixed(3),
    position:[+d.position.x.toFixed(3),+d.groundY.toFixed(3),+d.position.z.toFixed(3)],
    sourceGuids:d.source.map(r=>r.mesh.userData.ifc?.guid),
    closedLeft:qaDoorWalk(d,1,false),
    openLeft:qaDoorWalk(d,1,true),
    closedRight:qaDoorWalk(d,-1,false),
    openRight:qaDoorWalk(d,-1,true)
   }));
  }
 };
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));
 renderer.setSize(innerWidth,innerHeight);
});
console.info('[AutoMinds SPACES] Source-based full-house walkthrough initialized: architecture from IFC, appearance approximated from original renders.');
