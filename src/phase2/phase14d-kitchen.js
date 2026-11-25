/**
 * Phase 14D kitchen-only reference assemblies.
 * Provisional coordinates are checked against source floor, room polygon and
 * visible IFC bounds. A rejected placement is recorded, never silently forced.
 * Architectural geometry and source collisions are not changed.
 */
export function buildPhase14DKitchen({THREE,root,groups,source,origin,records,floorSampler,within,palette,ivory,stone,wood,cream,visual}){
 const report={revision:'14D',upperCabinets:0,glassCabinets:0,fridges:0,applianceTowers:0,peninsulas:0,stools:0,chandeliers:0,potFillers:0,storageUnits:0,ledStrips:0,placements:[],rejected:[],visualApproved:false,clearanceCertified:false,servicesCertified:false};
 const mats={glass:new THREE.MeshStandardMaterial({color:0xc4d2c9,transparent:true,opacity:.31,roughness:.13,depthWrite:false}),ceramic:new THREE.MeshStandardMaterial({color:0xf0e8dc,roughness:.31}),darkWood:new THREE.MeshStandardMaterial({color:0x513522,roughness:.61}),light:new THREE.MeshStandardMaterial({color:0xffe5bd,emissive:0xffd2a0,emissiveIntensity:.8}),gasket:new THREE.MeshStandardMaterial({color:0x353632,roughness:.7})};
 const geometries=new Map(),lights=[],moving=[],occupied=[];
 const ox=origin.x||0,oz=origin.z||0;
 const mesh=(parent,name,geometry,material,x,y,z)=>{const m=visual(new THREE.Mesh(geometry,material),'14d-'+name);m.position.set(x,y,z);parent.add(m);return m;};
 function cube(parent,name,w,h,d,mat,x,y,z){
  const key=[w,h,d].map(v=>v.toFixed(4)).join('/');
  if(!geometries.has(key))geometries.set(key,new THREE.BoxGeometry(w,h,d));
  return mesh(parent,name,geometries.get(key),mat,x,y,z);
 }
 function tube(parent,name,points,r,mat){
  const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(parent,name,new THREE.TubeGeometry(c,18,r,8,false),mat,0,0,0);
 }
 function rod(parent,name,a,b,r,mat){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);
  const m=mesh(parent,name,new THREE.CylinderGeometry(r,r,v.length(),8),mat,...av.clone().add(bv).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
 }
 function group(parent,name,x,y,z,yaw=0){
  const g=new THREE.Group();g.name='PHASE14D_'+name;g.position.set(x-ox,y,z-oz);g.rotation.y=yaw;parent.add(g);return g;
 }
 function localGroup(parent,name,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
 const sourceBox=source.record.box;
 function bounds(x,z,w,d,y=0,h=2.5){return new THREE.Box3(new THREE.Vector3(x-ox-w/2,y,z-oz-d/2),new THREE.Vector3(x-ox+w/2,y+h,z-oz+d/2));}
 function intersects(b,other){return Math.min(b.max.x,other.max.x)-Math.max(b.min.x,other.min.x)>.025&&Math.min(b.max.z,other.max.z)-Math.max(b.min.z,other.min.z)>.025&&Math.min(b.max.y,other.max.y)-Math.max(b.min.y,other.min.y)>.025;}
 function supported(x,z,w,d){
  if(x+w/2>111.75)return false; // preserve open dining connection
  return [[0,0],[-1,-1],[-1,1],[1,-1],[1,1]].every(([a,b])=>{
   const px=x+a*w/2,pz=z+b*d/2,f=floorSampler(px-ox,pz-oz,0);
   return within(px,pz)&&Number.isFinite(f?.y)&&Math.abs(f.y)<.20;
  });
 }
 function blocked(b,ignoreSource=false){
  return occupied.some(o=>intersects(b,o))||records.some(r=>{
   if(!r.box||!r.mesh?.visible||r.layer?.level!=='ground')return false;
   if(ignoreSource&&r===source.record)return false;
   if(r.mesh.userData?.clientKitchenDiningDividerRemoved||r.mesh.userData?.clientKitchenStairPartitionRemoved||r.mesh.userData?.clientStairKitchenGroundFaceClipped)return false;
   return /wall|column|door|window|furniture|proxies|slabs|member|railing/i.test(r.category||'')&&intersects(b,r.box);
  });
 }
 function fit(name,candidates,w,d,h,{margin=0,y=0,ignoreSource=false}={}){
  for(const [x,z,yaw=0] of candidates){
   const swap=Math.abs(Math.sin(yaw))>.5,W=swap?d:w,D=swap?w:d;
   const b=bounds(x,z,W,D,y+.035,h-.035);
   if(!supported(x,z,W,D)||blocked(b,ignoreSource))continue;
   const clearance=bounds(x,z,W+margin*2,D+margin*2,y+.05,Math.min(h,1.1));
   if(margin&&blocked(clearance,ignoreSource))continue;
   occupied.push(b);report.placements.push({name,x,z,yaw,width:W,depth:D});return {x,z,yaw};
  }
  report.rejected.push(name+': no supported unobstructed candidate');return null;
 }
 function panel(parent,name,w,h,mat,x,y,z,glass=false){
  const t=.055;
  if(!glass)cube(parent,name+'-inset',w,h,.027,mat,x,y,z);
  else cube(parent,name+'-glass',w-2*t,h-2*t,.007,mats.glass,x,y,z);
  for(const sign of [-1,1]){
   cube(parent,name+'-rail',w,t,.025,mat,x,y+sign*(h-t)/2,z+.016);
   cube(parent,name+'-stile',t,h-2*t,.025,mat,x+sign*(w-t)/2,y,z+.016);
  }
  rod(parent,name+'-brass-pull',[x+w*.34,y-.075,z+.04],[x+w*.34,y+.075,z+.04],.009,palette.bronze);
 }
 const axis=source.longAxis,alongMin=axis==='x'?source.xMin:source.zMin,alongMax=axis==='x'?source.xMax:source.zMax;
 const centerCross=axis==='x'?(source.zMin+source.zMax)/2:(source.xMin+source.xMax)/2;
 const yaw=axis==='x'?Math.PI:Math.PI/2;
 const coord=(a,c)=>axis==='x'?[a,c]:[c,a];
 const back=axis==='x'?source.zMax-.20:source.xMax-.20;
 // Upper units only where a verified vertical wall is adjacent, and windows,
 // doors and other source meshes do not intersect the proposed cabinet.
 for(let i=0;i<6;i++){
  const a=alongMin+.4+i*.66;if(a>alongMax-.4)break;
  const [x,z]=coord(a,back);
  const wallNear=records.some(r=>r.mesh?.visible&&r.layer?.level==='ground'&&/wall/i.test(r.category||'')&&r.box&&r.box.min.y<1.8&&r.box.max.y>2.6&&r.box.distanceToPoint(new THREE.Vector3(x-ox,2.2,z-oz))<.55);
  if(!wallNear){report.rejected.push('upper cabinet '+i+': wall support unverified');continue;}
  const p=fit('upper cabinet '+i,[[x,z,yaw]],.61,.34,1.13,{y:1.48,ignoreSource:true});
  if(!p)continue;
  const g=group(groups.cabinetry,'UPPER_'+i,p.x,1.48,p.z,p.yaw);
  const glass=i%3===1;
  cube(g,'upper-back',.61,1.08,.035,ivory,0,.54,-.15);
  for(const sign of [-1,1])cube(g,'upper-side',.028,1.08,.34,ivory,sign*.291,.54,0);
  for(const y of [.025,.37,.71,1.06])cube(g,'upper-shelf',.56,.025,.32,ivory,0,y,0);
  panel(g,'upper-door',.58,1.04,ivory,0,.54,.18,glass);
  cube(g,'crown',.65,.075,.38,ivory,0,1.11,0);
  cube(g,'upper-led',.54,.012,.022,mats.light,0,-.012,.10);
  report.upperCabinets++;report.ledStrips++;
  if(glass){
   report.glassCabinets++;
   for(let j=0;j<3;j++)mesh(g,'display-bowl',new THREE.CylinderGeometry(.08,.045,.05,16),mats.ceramic,(j-1)*.15,.405,0);
  }
 }
 // Candidate positions are deliberately provisional and checked against all
 // visible source furniture/opening bounds; no source furniture is hidden.
 const perimeter=[];
 for(let x=107.95;x<=111.15;x+=.40){perimeter.push([x,-4.70,0],[x,-.88,Math.PI]);}
 for(let z=-4.55;z<=-1.0;z+=.40)perimeter.push([108.05,z,Math.PI/2]);
 const fridge=fit('French door refrigerator',perimeter,.88,.76,1.85);
 if(fridge){
  const g=group(groups.appliances,'FRIDGE',fridge.x,0,fridge.z,fridge.yaw);
  cube(g,'fridge-case',.88,1.82,.70,palette.steel,0,.91,0);
  for(const k of [-1,1]){
   cube(g,'fridge-door',.425,1.20,.065,palette.steel,k*.219,1.20,.38);
   tube(g,'fridge-handle',[[k*.065,.86,.435],[k*.065,1.10,.48],[k*.065,1.52,.435]],.014,palette.steel);
  }
  for(const y of [.17,.44]){cube(g,'freezer-drawer',.86,.25,.065,palette.steel,0,y,.38);rod(g,'freezer-handle',[-.25,y+.06,.43],[.25,y+.06,.43],.012,palette.steel);}
  cube(g,'fridge-gasket',.012,1.20,.009,mats.gasket,0,1.2,.42);report.fridges++;
 }
 const tower=fit('integrated oven microwave tower',perimeter,.65,.64,2.40);
 if(tower){
  const g=group(groups.appliances,'TOWER',tower.x,0,tower.z,tower.yaw);
  cube(g,'tower-carcass',.65,2.4,.60,ivory,0,1.2,0);
  panel(g,'tower-lower',.61,.65,palette.cabinet,0,.37,.32);
  panel(g,'tower-upper',.61,.45,ivory,0,2.15,.32);
  for(const [y,h] of [[1.05,.57],[1.65,.43]]){
   cube(g,'appliance-steel-frame',.60,h,.045,palette.steel,0,y,.33);
   cube(g,'appliance-black-glass',.53,h-.105,.018,palette.glass,0,y-.015,.36);
   rod(g,'appliance-handle',[-.23,y+h*.33,.40],[.23,y+h*.33,.40],.013,palette.steel);
   for(let k=0;k<3;k++)mesh(g,'control-knob',new THREE.SphereGeometry(.018,8,6),palette.steel,.16+k*.038,y+h*.42,.363);
  }report.applianceTowers++;
 }
 // Island: evaluate complete seating envelope and a conservative aisle.
 const islands=[];
 for(let x=109.0;x<=110.35;x+=.25)for(let z=-3.9;z<=-2.25;z+=.25) islands.push([x,z,0],[x,z,Math.PI/2]);
 const island=fit('island and three stools envelope',islands,2.00,1.50,1.05,{margin:1.0668});
 if(island){
  const g=group(groups.cabinetry,'ISLAND',island.x,0,island.z,island.yaw);
  cube(g,'island-body',1.92,.77,.62,palette.cabinet,0,.49,-.36);
  cube(g,'steel-recessed-plinth',1.83,.11,.55,palette.steel,0,.055,-.36);
  for(let i=0;i<3;i++)panel(g,'island-shaker',.60,.67,palette.cabinet,(i-1)*.63,.49,-.02);
  cube(g,'stone-countertop',2,.045,.85,stone,0,.90,-.28);
  cube(g,'waterfall-end',.045,.90,.85,stone,.978,.45,-.28);
  report.peninsulas++;
  for(let i=0;i<3;i++){
   const chair=localGroup(g,'STOOL_'+i,(i-1)*.59,0,.49);
   const seat=mesh(chair,'upholstered-seat',new THREE.SphereGeometry(1,16,10),cream,0,.66,0);seat.scale.set(.245,.055,.19);
   for(const a of [-1,1])for(const b of [-1,1])rod(chair,'tapered-wood-leg',[a*.19,.025,b*.155],[a*.13,.63,b*.10],.024,wood);
   rod(chair,'footrest',[-.17,.23,.14],[.17,.23,.14],.022,wood);
   report.stools++;
  }
  // Five-arm brass chandelier, centered on the actual supported worktop.
  const chandelier=group(groups.lighting,'CHANDELIER',island.x,2.10,island.z,island.yaw);
  rod(chandelier,'ceiling-stem',[0,.03,-.28],[0,1.02,-.28],.017,palette.bronze);
  mesh(chandelier,'ceiling-canopy',new THREE.CylinderGeometry(.11,.11,.04,16),palette.bronze,0,1.02,-.28);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5,x=Math.cos(a)*.33,z=Math.sin(a)*.33-.28;
   tube(chandelier,'curved-brass-arm',[[0,.05,-.28],[x*.65,-.02,(z+.28)*.65-.28],[x,.09,z],[x,.19,z]],.012,palette.bronze);
   mesh(chandelier,'ivory-lampshade',new THREE.CylinderGeometry(.075,.115,.15,20,1,true),cream,x,.24,z);
   mesh(chandelier,'bulb',new THREE.SphereGeometry(.032,12,8),mats.light,x,.20,z);
  }
  const lamp=new THREE.PointLight(0xffe0b5,0,3,2);lamp.position.set(0,.17,-.28);chandelier.add(lamp);lights.push(lamp);report.chandeliers++;
 } 
 // A source-supported cooking station gains a jointed brass pot filler.
 const cookAlong=alongMin+.50+.78*(alongMax-alongMin-1.00);
 const cross=(axis==='x'?source.zMin:source.xMin)+.035+Math.min(.47,Math.max(.38,((axis==='x'?source.zMax:source.xMax)-(axis==='x'?source.zMin:source.xMin)-.035)*.40));
 const [cx,cz]=coord(cookAlong,cross);
 if(within(cx,cz)&&cx<111.75){
  const p=group(groups.appliances,'POT_FILLER',cx,source.top+.37,cz+.18,axis==='x'?0:Math.PI/2);
  mesh(p,'pot-filler-wall-flange',new THREE.CylinderGeometry(.038,.038,.016,16),palette.bronze,0,0,0).rotation.x=Math.PI/2;
  rod(p,'pot-filler-arm',[0,0,0],[.13,0,-.09],.012,palette.bronze);
  rod(p,'pot-filler-second-arm',[.13,0,-.09],[-.03,0,-.21],.012,palette.bronze);
  rod(p,'pot-filler-spout',[-.03,0,-.21],[-.03,-.06,-.21],.012,palette.bronze);report.potFillers++;
 }
 // A pull-out cutlery tray and bins are mounted only on verified existing
 // drawer groups, preserving their current animation and local coordinates.
 for(const drawer of groups.storage.children.filter(g=>g.name.startsWith('STAGE3_SOFT_CLOSE_PULL_OUT'))){
  const face=drawer.children.find(m=>m.isMesh);const width=face?.geometry?.parameters?.width??.4;
  const tray=localGroup(drawer,'PHASE14D_CUTLERY_TRAY',0,.07,.10);
  cube(tray,'tray-base',width*.82,.025,.24,wood,0,-.08,0);
  for(let i=0;i<3;i++)cube(tray,'tray-divider',.014,.05,.23,wood,(i-1)*width*.20,-.045,0);
  for(let i=0;i<3;i++)rod(tray,'cutlery',[(i-1)*width*.2,-.035,-.08],[(i-1)*width*.2,-.035,.08],.007,palette.steel);
  report.storageUnits++;
 }
 report.unimplemented=['verified source replacement and collision registration','true recessed sink cutouts and waterproof construction detailing','window-specific walnut blinds','Lazy Susan, spice rack, pull-out bins and appliance garage','room-specific day/night screenshot matching','measured work triangle and appliance services'];
 return {report,update(){},setLights(on){for(const l of lights)l.intensity=on?2:0;},dispose(){for(const m of Object.values(mats))m.dispose();}};
}
