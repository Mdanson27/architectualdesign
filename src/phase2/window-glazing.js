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

function getCandidate(rec){
 const meta=rec.mesh.userData.ifc||{};
 const name=String(meta.name||'').toUpperCase();
 const kind=String(meta.ifcType||'').toUpperCase();
 if(!/^WD\s*-\s*\d+/i.test(name) && kind!=='IFCWINDOW')return null;
 const b=rec.box,sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
 const width=Math.max(sz.x,sz.z),depth=Math.min(sz.x,sz.z);
 if(width<WINDOW_RULES.minWidth||width>WINDOW_RULES.maxWidth||
   sz.y<WINDOW_RULES.minHeight||sz.y>WINDOW_RULES.maxHeight||
   depth>WINDOW_RULES.maxDepth)return null;
 return {rec,center:c,width,height:sz.y,depth,alongX:sz.x>=sz.z,level:rec.layer.level};
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

export function createIFCWindowGlazing(records,scene,isResidenceRecord){
 const candidates=records.filter(isResidenceRecord).map(getCandidate).filter(Boolean);
 const clusters=[];
 for(const c of candidates){
  const found=clusters.find(g=>matching(g[0],c));
  if(found)found.push(c);else clusters.push([c]);
 }
 const root=new THREE.Group();root.name='IFC_GLASS_PANES_AND_ALUMINIUM_FRAMES';
 const windows=clusters.map((cluster,i)=>makeWindow(cluster,i));
 for(const w of windows)root.add(w.group);
 root.visible=true;scene.add(root);
 const sourceSet=new Set(windows.flatMap(w=>w.source));
 const summary={windowAssemblies:windows.length,replacedProxyComponents:sourceSet.size,
  transparentGlass:true,sourceAligned:true,syntheticOpenings:0,
  supportedNarrowTransomParts:windows.filter(w=>w.height<.55).length,
  glassOpacity:glass.opacity};
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
