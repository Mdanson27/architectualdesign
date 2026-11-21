import * as THREE from 'three';

/**
 * A reversible replacement for the narrow IFC 'WD - ...' proxy faces.
 * The source IFC has only four IFCWINDOW objects in detached parts of its
 * source model; most actual residence windows are stored as IFC proxies.
 * Using a material on "windows" category alone therefore misses the house.
 *
 * Mesh position, opening width and height are derived from source bounds.
 * We do not invent new architectural openings or erase IFC geometry.
 */
export const WINDOW_RULES=Object.freeze({
  minWidth:.38,maxWidth:4.3,minHeight:.25,maxHeight:6.15,maxDepth:.38
});
// Client-reviewed stairwell glazing WD-008 starts at the source's intermediate
// stair landing (about +1.72m), NOT at the ground stair base.
export const S1_STAIR_WINDOW=Object.freeze({
  sourceName:'WD - 008',x:107.06,z:-6.975,
  sourceBottomY:.32,firstFlightLandingY:1.72,visibleBottomY:1.76
});

const glass=new THREE.MeshPhysicalMaterial({
 color:'#e8faff',
 metalness:0,
 roughness:.055,
 transparent:true,
 opacity:.19,
 side:THREE.DoubleSide,
 depthWrite:false,
 clearcoat:.92,
 clearcoatRoughness:.065
});
const frame=new THREE.MeshStandardMaterial({color:'#55666b',metalness:.54,roughness:.27});
const seal=new THREE.MeshStandardMaterial({color:'#303b3e',metalness:.24,roughness:.66});

function getCandidate(rec,origin={x:0,z:0}){
 const meta=rec.mesh.userData.ifc||{};
 const name=String(meta.name||'').toUpperCase();
 const kind=String(meta.ifcType||'').toUpperCase();
 if(!/^WD\s*-\s*\d+/i.test(name) && kind!=='IFCWINDOW')return null;
 const b=rec.box,sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
 const width=Math.max(sz.x,sz.z),depth=Math.min(sz.x,sz.z);
 if(width<WINDOW_RULES.minWidth||width>WINDOW_RULES.maxWidth||
   sz.y<WINDOW_RULES.minHeight||sz.y>WINDOW_RULES.maxHeight||
   depth>WINDOW_RULES.maxDepth)return null;
 const isStairWindow=name===S1_STAIR_WINDOW.sourceName&&
  rec.layer.level==='ground'&&
  Math.abs(c.x+origin.x-S1_STAIR_WINDOW.x)<.12&&
  Math.abs(c.z+origin.z-S1_STAIR_WINDOW.z)<.12&&
  b.min.y<.50&&b.max.y>5.50;
 // Derive a shorter *replacement* window, preserving original source bounds.
 // The lower wall becomes opaque again as the window aperture uses this height.
 const bottomY=isStairWindow?S1_STAIR_WINDOW.visibleBottomY:b.min.y;
 const visibleHeight=b.max.y-bottomY;
 if(visibleHeight<WINDOW_RULES.minHeight)return null;
 if(isStairWindow)c.y=(bottomY+b.max.y)/2;
 return {rec,center:c,width,height:visibleHeight,depth,alongX:sz.x>=sz.z,
  level:rec.layer.level,correctedStairWindow:isStairWindow,
  sourceBottomY:b.min.y,displayBottomY:bottomY};
}

function matching(a,b){
 if(a.alongX!==b.alongX||a.level!==b.level)return false;
 if(Math.abs(a.center.y-b.center.y)>.30)return false;
 if(Math.abs(a.width-b.width)>.31||Math.abs(a.height-b.height)>.34)return false;
 const transverse=a.alongX?Math.abs(a.center.z-b.center.z):Math.abs(a.center.x-b.center.x);
 const parallel=a.alongX?Math.abs(a.center.x-b.center.x):Math.abs(a.center.z-b.center.z);
 // Composite IFC proxy exports can place the same glass face 0.35m apart.
 // Merge that echo rather than drawing a second floating pane.
 return transverse<.44&&parallel<.28;
}
function sharedFrame(parent,material,w,h,d,x,y,z,name){
 const m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.01,w),Math.max(.01,h),Math.max(.01,d)),material);
 m.position.set(x,y,z);m.name=name;parent.add(m);return m;
}

function makeWindow(cluster,index){
 const position=new THREE.Vector3();
 for(const e of cluster)position.add(e.center);
 position.divideScalar(cluster.length);
 const {alongX,level}=cluster[0];
 const width=Math.max(...cluster.map(e=>e.width));
 const height=Math.max(...cluster.map(e=>e.height));
 const group=new THREE.Group();group.name='IFC_WINDOW_GLAZING_'+(index+1);
 group.position.copy(position);
 group.rotation.y=alongX?0:Math.PI/2;
 const paneW=Math.max(.12,width-.11),paneH=Math.max(.2,height-.11);
 const pane=sharedFrame(group,glass,paneW,paneH,.018,0,0,0,'TRANSPARENT_SOURCE_SIZED_GLAZING');
 pane.renderOrder=3;
 pane.userData={actualThreeDimensionalGlass:true,sourceAligned:true,noOpaqueBacking:true};
 const rim=.048,edge=width/2-rim/2,top=height/2-rim/2;
 for(const side of [-1,1]){
  sharedFrame(group,frame,rim,height,.086,side*edge,0,0,'ALUMINIUM_VERTICAL_FRAME');
  sharedFrame(group,frame,width,rim,.086,0,side*top,0,'ALUMINIUM_HORIZONTAL_FRAME');
 }
 // Draw only minimal restrained source-sized mullions (no extra architectural openings).
 if(width>=1.42){
  sharedFrame(group,frame,.039,height-.075,.089,0,0,0,'ALUMINIUM_CENTRE_MULLION');
 }
 // A shadow-gap gasket creates framing depth without turning the glazing opaque.
 sharedFrame(group,seal,width,.018,.09,0,-height/2+.042,0,'WINDOW_BASE_SEAL');
 const sourceGUIDs=cluster.map(e=>e.rec.mesh.userData.ifc?.guid);
 group.userData={sourceGUIDs,level,width,height,IFCSourceSized:true,
  interpretation:'transparent window glass and restrained aluminium framing'};
 return {group,position,width,height,alongX,level,source:cluster.map(x=>x.rec)};
}

export function createIFCWindowGlazing(records,scene,isResidenceRecord,origin={x:0,z:0}){
 const candidates=records.filter(isResidenceRecord).map(r=>getCandidate(r,origin)).filter(Boolean);
 const clusters=[];
 for(const c of candidates){
  const found=clusters.find(g=>matching(g[0],c));
  if(found)found.push(c);else clusters.push([c]);
 }
 // Two internal IFC-window proxies were exported inside the ground-floor
 // stair / Sitting Room divider. That divider has been removed by the client's
 // open-plan correction, so these are NOT exterior glazing and must not appear
 // as floating 3D glass frames or remain collidable in the open circulation.
 const obsoleteStairGlass=clusters.filter(group=>{
  if(group[0].level!=='ground')return false;
  const x=group.reduce((n,c)=>n+c.center.x,0)/group.length+origin.x;
  const z=group.reduce((n,c)=>n+c.center.z,0)/group.length+origin.z;
  const width=Math.max(...group.map(c=>c.width));
  const height=Math.max(...group.map(c=>c.height));
  return Math.abs(x-112.296)<.16 && width>.45&&width<.95 &&
   height>1.85&&height<2.7 &&
   (Math.abs(z+7.852)<.18||Math.abs(z+6.222)<.18);
 });
 const keepClusters=clusters.filter(group=>!obsoleteStairGlass.includes(group));
 const omittedSources=obsoleteStairGlass.flatMap(group=>group.map(c=>c.rec));
 for(const rec of omittedSources){
  rec.mesh.userData.clientStairSittingGlassRemoved=true;
  rec.mesh.visible=false;
 }
 const root=new THREE.Group();root.name='IFC_GLASS_PANES_AND_ALUMINIUM_FRAMES';
 const windows=keepClusters.map((cluster,i)=>makeWindow(cluster,i));
 for(const w of windows)root.add(w.group);
 root.visible=true;scene.add(root);
 const sourceSet=new Set([...windows.flatMap(w=>w.source),...omittedSources]);
 const stair=keepClusters.flat().find(c=>c.correctedStairWindow);
 const summary={windowAssemblies:windows.length,replacedProxyComponents:sourceSet.size,
  stairSittingOpenGlassAssembliesRemoved:obsoleteStairGlass.length,
  removedInteriorGlassSourceGuids:omittedSources.map(r=>r.mesh.userData.ifc?.guid),
  transparentGlass:true,sourceAligned:true,syntheticOpenings:0,
  supportedNarrowTransomParts:windows.filter(w=>w.height<.55).length,
  glassOpacity:glass.opacity,
  stairWindow:stair?{
   sourceName:S1_STAIR_WINDOW.sourceName,
   sourceBottomY:stair.sourceBottomY,displayBottomY:stair.displayBottomY,
   firstFlightLandingY:S1_STAIR_WINDOW.firstFlightLandingY,
   topY:stair.rec.box.max.y,groundLevelGlassRemoved:true,
   originalIFCUnmodified:true,sourceGuid:stair.rec.mesh.userData.ifc?.guid
  }:null};
 function updateVisibility({floor,mode,sectionEnabled}){
  for(const w of windows){
   w.group.visible=!sectionEnabled||mode==='walk'||floor==='all'||(floor==='ground'?w.level==='ground':true);
  }
 }
 function blocksTraversal(from,to,footY,radius=.32){
  for(const w of windows){
   if(!w.group.visible)continue;
   // A transparent window should remain a physical glazed barrier in first person.
   const low=w.position.y-w.height/2,hi=w.position.y+w.height/2;
   if(footY+1.65<low||footY+.15>hi)continue;
   const lateral=w.alongX?to.x-w.position.x:to.z-w.position.z;
   if(Math.abs(lateral)>w.width/2+radius)continue;
   const a=w.alongX?from.z-w.position.z:from.x-w.position.x;
   const b=w.alongX?to.z-w.position.z:to.x-w.position.x;
   if(Math.abs(b)>radius+.018||Math.abs(b)>=Math.abs(a)+.0001)continue;
   return true;
  }
  return false;
 }
 return {root,windows,sourceSet,summary,updateVisibility,blocksTraversal};
}
