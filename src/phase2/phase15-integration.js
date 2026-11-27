import * as THREE from 'three';
import {createPhase15Seating} from './phase15-seating.js';
import {createPhase15Media} from './phase15-media.js';
import {createPhase15Dining,DINING15_PLAN} from './phase15-dining.js';
import {createPhase15SourceFloors,createPhase15SourceCeilings} from './phase15-finishes.js';
import {createPhase15Style} from './phase15-styling.js';
import {createPhase15Light,createPhase15LightingController} from './phase15-lighting.js';
import {faceTarget} from './phase14abc-integration.js';

const IDS=['1q4YZutsD4TgduM8eW5Ara','2xEu3ohP52EhzvosO6BHlM','3ra6Gls3T5jApOmAAeSrCT'];
const ROOM={'G-SITTING':[112.4,119.73,-9.62,-4.89],'G-DINING':[112.45,117.15,-4.42,-.38]};
const box=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o,true);};
const gap=(a,b)=>Math.hypot(Math.max(a.min.x-b.max.x,b.min.x-a.max.x,0),Math.max(a.min.z-b.max.z,b.min.z-a.max.z,0));
const removed=r=>{const u=r.mesh.userData;return u.clientStairSittingWallRemoved||u.clientKitchenDiningDividerRemoved||u.clientOpenPlanPartitionRemoved||u.clientKitchenStairPartitionRemoved||u.functionallyReplacedDoorId||u.facadeDuplicateHidden;};
export function createPhase15Integration({scene,origin,records,solids,sofaSystem,diningSystem,stage4,surfaces,lighting,floorSampler,ceilingSampler,detail='low'}){
 const root=new THREE.Group();root.name='PHASE15H_DEFAULT_GROUND_LIVING_DINING';scene.add(root);
 const rooms={},sourceSet=new Set(),colliders=[],fixtures=[],placed=[],blocked=[],hiddenLegacy=[],floorRegions=[],ceilingRegions=[];
 const local=(x,y,z)=>[x-origin.x,y,z-origin.z],world=(b)=>b.clone().translate(new THREE.Vector3(origin.x,0,origin.z));
 const sourceGuid=r=>r.mesh.userData.ifc?.guid;
 const oldSofaSources=records.filter(r=>r.layer?.level==='ground'&&IDS.includes(sourceGuid(r)));
 const oldDiningSources=[...diningSystem.sourceSet].filter(r=>r.layer?.level==='ground');
 const oldGroundModels=sofaSystem.root.children.filter(o=>IDS.includes(o.userData.originalGUID)||o.userData.sourceRegion==='ground-sitting');
 const groundOldColliders=sofaSystem.colliders.filter(r=>r.layer?.level==='ground'&&oldGroundModels.some(o=>r.mesh===o||r.mesh.parent===o));
 const roomGroup=id=>{const g=new THREE.Group();g.name='PHASE15H_'+id;root.add(g);rooms[id]={group:g,installed:false};return g;};
 const sitting=roomGroup('G-SITTING'),dining=roomGroup('G-DINING');
 const within=(id,b,pad=.015)=>{const [a,c,d,e]=ROOM[id],w=world(b);return w.min.x>=a+pad&&w.max.x<=c-pad&&w.min.z>=d+pad&&w.max.z<=e-pad;};
 const probes=(b,datum=0)=>{const xs=[b.min.x+.012,(b.min.x+b.max.x)/2,b.max.x-.012],zs=[b.min.z+.012,(b.min.z+b.max.z)/2,b.max.z-.012],out=[];for(const x of xs)for(const z of zs){const y=floorSampler(x,z,datum)?.y;out.push(Number.isFinite(y)?y:null);}return out;};
 const floorOk=p=>p.every(y=>y!==null&&Math.abs(y-p[4])<.055&&Math.abs(y)<.12);
 const arrivalKeepClear=(b)=>{const w=world(b),r=.45;return [[114.65,-3.95],[115.12,-6.86]].some(([x,z])=>x>w.min.x-r&&x<w.max.x+r&&z>w.min.z-r&&z<w.max.z+r&&w.max.y>.20);};
 const fixed=records.filter(r=>r.layer?.level==='ground'&&r.box&&!removed(r)&&r.mesh.visible&&['walls','columns','furniture','proxies','windows','doors'].includes(r.category)&&r.box.max.y>.10&&r.box.min.y<1.80&&
  !/^SLA|^STA|TREAD|LANDING|STEP/i.test(String(r.mesh.userData.ifc?.name||'')));
 const collision=(b,exclude,others=[])=>{
  const q=b.clone();q.min.y+=.02;q.max.y-=.002;
  return fixed.some(r=>!exclude.has(r)&&q.intersectsBox(r.box))||others.some(a=>q.intersectsBox(a));
 };
 const pose=(asset,x,z,yaw=0,y=0)=>{asset.position.set(...local(x,y,z));asset.rotation.y=yaw;return box(asset);};
 const register=(id,o,room,solid=true,meta={})=>{rooms[room].group.add(o);const b=box(o);placed.push({id,room,worldPosition:[o.position.x+origin.x,o.position.y,o.position.z+origin.z],bounds:[world(b).min.toArray(),world(b).max.toArray()],...meta});if(solid)colliders.push({object:o,box:b,room,id});return b;};
 function attemptFloor(asset,id,x,z,yaw,exclude,others=[],solid=true){
  let b=pose(asset,x,z,yaw,0);const p=probes(b);if(!within(id,b)||!floorOk(p))return null;
  b=pose(asset,x,z,yaw,p[4]+.016);
  if(solid&&collision(b,exclude,others))return null;
  return {b,p};
 }
 function removeSolids(list){for(const r of list){const i=solids.indexOf(r);if(i>=0)solids.splice(i,1);}}
 function suppressStage4(id){const g=stage4.groups[id];for(const o of [...g.children]){g.remove(o);hiddenLegacy.push(o);}removeSolids(stage4.colliders.filter(r=>r.layer?.level==='ground'&&hiddenLegacy.some(o=>r.mesh===o||r.mesh.parent===o)));}
 // Atomic dining set: retain old furniture if ANY individual footprint fails.
 const ds=createPhase15Dining('six-seat-set',{detail}),excludeDining=new Set(oldDiningSources);
 let diningResult=null;
 for(const [cx,cz] of [DINING15_PLAN.centre,[114.85,-2.15],[114.95,-2.25],[114.70,-2.25],[114.85,-2.4],[114.85,-1.95]]){
  pose(ds,cx,cz,0,0);const center=floorSampler(cx-origin.x,cz-origin.z,0)?.y;if(!Number.isFinite(center))continue;
  pose(ds,cx,cz,0,center+.026);
  const pieces=ds.children.filter(o=>o.name==='DINING_TABLE'||/^DINING_CHAIR_/.test(o.name)),bounds=pieces.map(box);
  if(pieces.length!==7||bounds.some(b=>!within('G-DINING',b)||!floorOk(probes(b))||collision(b,excludeDining)))continue;
  if(bounds.some((b,i)=>bounds.some((c,j)=>i<j&&b.intersectsBox(c))))continue;
  diningResult={cx,cz,center,pieces,bounds};break;
 }
 if(diningResult){
  const {cx,cz,center,pieces,bounds}=diningResult;
  register('six-seat-set',ds,'G-DINING',false,{sourceSupport:true,chairCount:6});
  for(const [i,o] of pieces.entries())colliders.push({object:o,box:bounds[i],room:'G-DINING',id:o.name});
  rooms['G-DINING'].installed=true;rooms['G-DINING'].centre=[cx,cz];rooms['G-DINING'].floorY=center;
  suppressStage4('G-DINING');diningSystem.root.visible=false;hiddenLegacy.push(diningSystem.root);oldDiningSources.forEach(r=>sourceSet.add(r));
  const rug=createPhase15Style('dining-woven-rug',{detail});
  const a=attemptFloor(rug,'G-DINING',cx,cz,0,excludeDining,[],false);
  if(a){register('dining-woven-rug',rug,'G-DINING',false,{sourceSupport:true});}else{rug.userData.dispose();blocked.push({id:'dining-woven-rug',reason:'Full rug footprint not supported inside provisional room'});}
 }else{ds.userData.dispose();blocked.push({id:'six-seat-set',reason:'No tested table and chair arrangement clears actual source bounds and floor; legacy retained'});}
 // Sitting room: two distinct sofas plus two tables and two chairs. Use
 // deterministic candidate search with real support, conservative obstacles,
 // and a retained west approach to the dining/stair opening.
 const excluded=new Set(oldSofaSources),seats=[];
 const sittingSpecs=[
  {id:'main-sofa',factory:createPhase15Seating,poses:[[114.0,-7.25],[114.2,-7.35],[114.35,-7.55],[113.9,-7.65],[114.45,-7.8]],target:[116.65,-7.0]},
  {id:'rest-sofa',factory:createPhase15Seating,poses:[[116.75,-8.25],[116.95,-8.12],[116.6,-8.05],[117.1,-8.15],[116.9,-5.65],[117.4,-5.7]],target:[116.65,-7.0]},
  {id:'paired-coffee-tables',factory:createPhase15Media,poses:[[116.4,-6.95],[116.55,-6.85],[116.65,-6.65],[116.2,-6.95],[116.7,-7.05]],target:null},
  {id:'accent-chair',factory:createPhase15Seating,poses:[[118.15,-7.65],[118.4,-7.5],[118.55,-8.05],[118.5,-7.15],[117.9,-8.4]],target:'coffee'},
  {id:'accent-chair',factory:createPhase15Seating,poses:[[118.15,-5.95],[118.55,-5.85],[118.1,-6.1],[117.65,-5.85],[118.5,-6.25]],target:'coffee'}
 ];
 const assets=sittingSpecs.map(s=>s.factory(s.id,{detail}));
 function solve(i,chosen){
  if(i===sittingSpecs.length)return chosen.slice();
  const spec=sittingSpecs[i],asset=assets[i];
  for(const [x,z] of spec.poses){
   const target=spec.target==='coffee'?[chosen[2].x,chosen[2].z]:spec.target;
   const yaw=target?faceTarget(x,z,...target):0;
   const result=attemptFloor(asset,'G-SITTING',x,z,yaw,excluded,chosen.map(c=>c.b));
   if(!result)continue;
   if(chosen.some(c=>gap(c.b,result.b)<.07))continue;
   if(i===2&&chosen.slice(0,2).some(c=>gap(c.b,result.b)<.25))continue;
   if(i>=3&&gap(chosen[2].b,result.b)<.25)continue;
   const next=solve(i+1,[...chosen,{asset,id:spec.id,x,z,yaw,target,b:result.b,p:result.p}]);if(next)return next;
  }
  return null;
 }
 const layout=oldSofaSources.length===3?solve(0,[]):null;
 if(layout){
  for(const p of layout){pose(p.asset,p.x,p.z,p.yaw,p.p[4]+.016);register(p.id,p.asset,'G-SITTING',true,{sourceSupport:true,yaw:p.yaw,target:p.target});seats.push(p);}
  rooms['G-SITTING'].installed=true;rooms['G-SITTING'].centre=[layout[2].x,layout[2].z];
  rooms['G-SITTING'].floorY=layout[2].p[4];oldSofaSources.forEach(r=>sourceSet.add(r));
  for(const o of oldGroundModels){sofaSystem.root.remove(o);hiddenLegacy.push(o);}removeSolids(groundOldColliders);suppressStage4('G-SITTING');
  const [cx,cz]=rooms['G-SITTING'].centre;
  const rug=createPhase15Style('living-contour-rug',{detail});
  const p=attemptFloor(rug,'G-SITTING',cx-.24,cz,0,excluded,[],false);
  if(p)register('living-contour-rug',rug,'G-SITTING',false,{sourceSupport:true});else{rug.userData.dispose();blocked.push({id:'living-contour-rug',reason:'Rug footprint lacks full source support'});}
  function floorAccessory(id,factory,poses){
   const o=factory(id,{detail});for(const [x,z] of poses){const q=attemptFloor(o,'G-SITTING',x,z,0,excluded,colliders.map(c=>c.box));if(q&&!arrivalKeepClear(q.b)){register(id,o,'G-SITTING',true,{sourceSupport:true});return o;}}
   o.userData.dispose();blocked.push({id,reason:'No clear floor-supported position in tested candidates'});return null;
  }
  const side=floorAccessory('pedestal-side-table',createPhase15Media,[[114.1,-5.8],[114.65,-8.7],[115.15,-8.4],[117.9,-8.65]]);
  floorAccessory('olive-planter',createPhase15Style,[[118.9,-8.55],[118.95,-5.7],[115.4,-8.75],[119.0,-6.85],[119.0,-7.15],[118.85,-5.28],[117.45,-5.36],[114.9,-5.35],[115.4,-8.35],[113.35,-8.9]]);
  const lamp=floorAccessory('brass-arc-floor-lamp',createPhase15Light,[[114.05,-5.65],[114.6,-8.8],[115.15,-8.5],[118.85,-6.8]]);
  if(lamp)fixtures.push(lamp);
  if(side){const b=box(side),o=createPhase15Light('black-shade-table-lamp',{detail});o.position.set(side.position.x,b.max.y,side.position.z);register('black-shade-table-lamp',o,'G-SITTING',false,{support:'side-table top'});fixtures.push(o);}
 }else{assets.forEach(a=>a.userData.dispose());blocked.push({id:'sitting-seating-and-tables',reason:oldSofaSources.length!==3?'Exact three IFC sources not available':'No complete collision-free supported seating layout from tested candidates; legacy retained'});}
 // Source finishes: replace the overlapping Stage 2 geometry only in a room
 // whose new floor/ceiling passed the source test. Keep unsupported ceiling.
 const floor=createPhase15SourceFloors({origin,floorSampler,detail});root.add(floor.root);floorRegions.push(...floor.regions);
 const ceiling=createPhase15SourceCeilings({origin,ceilingSampler,detail});root.add(ceiling.root);ceilingRegions.push(...ceiling.regions);
 const suppressSurface=()=>{
  for(const g of surfaces.root.children){
   const id=g.userData.roomId;if(!rooms[id])continue;
   for(const o of g.children){
    const part=o.userData?.part;
    if(part==='floor'&&floorRegions.some(r=>r.id===id&&r.supported>r.area*.95))o.visible=false;
    if(part?.startsWith('ceiling')&&ceilingRegions.some(r=>r.id===id&&r.accepted))o.visible=false;
   }
  }
 };
 // Install suspended fixtures only when canopy samples and head clearance
 // are source-backed. Dining height is measured relative to real tabletop.
 function ceilingFixture(id,room,x,z,{aboveTable=false,zone}={}){
  const xx=x-origin.x,zz=z-origin.z,y=ceilingSampler(xx,zz,0)?.y;
  if(!Number.isFinite(y)){blocked.push({id,reason:'No actual overhead slab'});return null;}
  const floorY=rooms[room].floorY??0;
  const accepted=ceilingRegions.some(r=>r.id===room&&r.accepted&&(!r.bounds||(x>r.bounds[0]+.20&&x<r.bounds[1]-.20&&z>r.bounds[2]+.20&&z<r.bounds[3]-.20)));
  const mount=y-(accepted?.1175:0);
  const o=createPhase15Light(id,{detail,zone,ceilingHeight:mount-(aboveTable?floorY+.026:floorY)});
  o.position.set(xx,mount,zz);const b=box(o),corners=[b.min.x,b.max.x].flatMap(a=>[b.min.z,b.max.z].map(c=>ceilingSampler(a,c,0)?.y));
  if(!corners.every(v=>Number.isFinite(v)&&Math.abs(v-y)<.035)||(!aboveTable&&b.min.y-floorY<1.90)){
   o.userData.dispose();blocked.push({id,reason:'Canopy footprint unsupported or below 1.90m free head clearance'});return null;}
  register(id,o,room,false,{sourceSupport:true,aboveTable,headClearance:b.min.y-floorY});fixtures.push(o);return o;
 }
 if(rooms['G-DINING'].installed){const [x,z]=rooms['G-DINING'].centre;ceilingFixture('dining-pendant-cluster','G-DINING',x,z,{aboveTable:true,zone:'dining'});}
 if(rooms['G-SITTING'].installed){
  const [x,z]=rooms['G-SITTING'].centre;
  // Chandelier has low drops; place over coffee table only (not free route).
  const y=ceilingSampler(x-origin.x,z-origin.z,0)?.y;
  if(Number.isFinite(y)){
   const lowered=ceilingRegions.some(r=>r.id==='G-SITTING'&&r.accepted&&(!r.bounds||(x>r.bounds[0]+.45&&x<r.bounds[1]-.45&&z>r.bounds[2]+.45&&z<r.bounds[3]-.45)));const o=createPhase15Light('folded-glass-chandelier',{detail});o.position.set(...local(x,y-(lowered?.1175:0),z));const b=box(o),c=colliders.find(q=>q.id==='paired-coffee-tables');
   const supported=[b.min.x,b.max.x].every(a=>[b.min.z,b.max.z].every(d=>Math.abs((ceilingSampler(a,d,0)?.y??-99)-y)<.035));
   if(supported&&c&&b.min.x>=c.box.min.x&&b.max.x<=c.box.max.x&&b.min.z>=c.box.min.z&&b.max.z<=c.box.max.z){register('folded-glass-chandelier',o,'G-SITTING',false,{sourceSupport:true,aboveTable:true});fixtures.push(o);}
   else{o.userData.dispose();blocked.push({id:'folded-glass-chandelier',reason:'Canopy or safe over-table envelope not confirmed'});}
  }else blocked.push({id:'folded-glass-chandelier',reason:'No ceiling support'});
 }
 // Source wall-backed accessories: measure actual continuous wall face with
 // a ray at multiple elevations, not only the bounding envelope.
 const ray=new THREE.Raycaster(),wallRecords=records.filter(r=>r.layer?.level==='ground'&&r.category==='walls'&&r.mesh.visible&&!removed(r));
 const openings=records.filter(r=>r.layer?.level==='ground'&&(/^(WD|DOO)\s*-/i.test(r.mesh.userData.ifc?.name||'')||['windows','doors'].includes(r.category))&&!r.mesh.userData.clientOpenPlanPartitionRemoved&&!r.mesh.userData.clientKitchenDiningDividerRemoved);
 function wallSupport(b,faceZ){
  const near=new THREE.Box3(new THREE.Vector3(b.min.x,b.min.y,faceZ-.10),new THREE.Vector3(b.max.x,b.max.y,faceZ+.12));
  if(openings.some(r=>r.box.intersectsBox(near)))return false;
  const meshes=wallRecords.filter(r=>r.box.intersectsBox(near)).map(r=>r.mesh);
  if(!meshes.length)return false;
  for(const u of [.06,.25,.50,.75,.94])for(const v of [.04,.33,.66,.96]){
   ray.set(new THREE.Vector3(THREE.MathUtils.lerp(b.min.x,b.max.x,u),THREE.MathUtils.lerp(b.min.y,b.max.y,v),faceZ+.10),new THREE.Vector3(0,0,-1));ray.far=.24;
   if(!ray.intersectObjects(meshes,false).length)return false;
  }
  return true;
 }
 if(rooms['G-SITTING'].installed){
  const media=createPhase15Media('entertainment-wall',{detail}),face=-9.242-origin.z;
  const cabinets=new Set(records.filter(r=>r.layer?.level==='ground'&&['2uXH5I0az5ve7ZLR9Ku1x$','1EuFhkbkzDauGp9vhICW8c','0JKmU$FxHC6v9MgSvkAkUr','1TVF3gbiv5PfQwZqliYRAe','08kI5oKxL0bOHDnyUi7gAA','18l3xfOOT4HgQkQeITi787'].includes(sourceGuid(r))));
  let installed=false;
  for(const x of [116.45,116.75,117.0]){
   media.rotation.y=Math.PI;media.position.set(...local(x,.02,-9.242));let b=box(media);media.position.z+=face+.012-b.min.z;b=box(media);
   const hits=[...cabinets].filter(r=>r.box.intersectsBox(b));
   if(!within('G-SITTING',b)||!wallSupport(b,face)||collision(b,new Set([...excluded,...hits]),colliders.map(c=>c.box)))continue;
   register('entertainment-wall',media,'G-SITTING',true,{sourceSupport:true,wallProbeCount:20,sourceCabinetsReplaced:hits.map(sourceGuid)});hits.forEach(r=>sourceSet.add(r));installed=true;break;
  }
  if(!installed){media.userData.dispose();blocked.push({id:'entertainment-wall',reason:'No continuous collision-free source-backed media wall in tested positions'});}
  // Replace old throw styling only when all cushion bottoms are supported
  // by the real sofa seat. Existing new sofa already includes loose pillows.
  const main=seats.find(p=>p.id==='main-sofa')?.asset;
  if(main){const c=createPhase15Style('cushion-set',{detail});const seat=main.getObjectByName('individual-seat-cushion-2');
   if(seat){const sb=box(seat);c.rotation.y=main.rotation.y;c.position.set(main.position.x,sb.max.y-.045,main.position.z);const cb=box(c);const sofa=box(main);
    if(cb.min.x>=sofa.min.x&&cb.max.x<=sofa.max.x&&cb.min.z>=sofa.min.z&&cb.max.z<=sofa.max.z)register('cushion-set',c,'G-SITTING',false,{support:'sofa seat, provisional styling'});else{c.userData.dispose();blocked.push({id:'cushion-set',reason:'Loose cushion envelope exceeds sofa'});}
   }else{c.userData.dispose();blocked.push({id:'cushion-set',reason:'Seat anchor missing'});}
  }
 }
 // Dining window: fit the reference drapes to the actual window span only
 // if the track, floor and adjacent door all clear. No curtains on removed partitions.
 if(rooms['G-DINING'].installed){
  const win=records.find(r=>sourceGuid(r)==='3$SsS73oTD9xjTkkK_wxPq'),door=records.find(r=>sourceGuid(r)==='0heo8rPOjCf99YWpmhxp18');
  if(win&&door){const w=world(win.box),z=(w.min.z+w.max.z)/2;
   const o=createPhase15Style('layered-curtains',{detail});let installed=false;
   // Fit the width within the window's own span, without extending into the
   // adjacent door. Check all nine floor and ceiling support points.
   for(const x of [116.84,116.77,116.70,116.63])for(const widthFactor of [1,.94,.88]){
    if(installed)break;
    const cy=ceilingSampler(x-origin.x,z-origin.z,0)?.y,fy=floorSampler(x-origin.x,z-origin.z,0)?.y;
    if(!Number.isFinite(cy)||!Number.isFinite(fy)||cy-fy<2.5)continue;
    o.scale.set(Math.min(1,(w.max.z-w.min.z-.04)/2.65)*widthFactor,(cy-fy-.1175-.02)/2.70,1);pose(o,x,z,-Math.PI/2,fy+.012);const bb=box(o);
    const corners=[bb.min.x,(bb.min.x+bb.max.x)/2,bb.max.x].flatMap(a=>[bb.min.z,(bb.min.z+bb.max.z)/2,bb.max.z].map(t=>[a,t]));
    const ok=within('G-DINING',bb)&&!bb.clone().expandByScalar(.035).intersectsBox(door.box)&&corners.every(([a,t])=>Math.abs((ceilingSampler(a,t,0)?.y??-99)-cy)<.035&&Math.abs((floorSampler(a,t,0)?.y??-99)-fy)<.035)&&!colliders.some(c=>c.box.intersectsBox(bb))&&!arrivalKeepClear(bb);
    if(ok){register('layered-curtains',o,'G-DINING',false,{sourceSupport:true,sourceWindow:sourceGuid(win),adaptedWidth:true,anchorProbes:18});installed=true;}
   }
   if(!installed){o.userData.dispose();blocked.push({id:'layered-curtains',reason:'Window track or floor envelope not clear of adjacent source door'});}
  }else blocked.push({id:'layered-curtains',reason:'Exact source window or adjacent door not found'});
 }
 // Mount small decorative pieces only on actual continuous source wall.
 // Use actual wall face rays from the room-facing side, with all existing
 // apertures and furniture excluded. The panel keeps its original dimensions.
 function mountWallAsset(id,room,factory,height){
  if(!rooms[room].installed)return null;
  const o=factory(id,{detail}),[xmin,xmax,zmin,zmax]=ROOM[room],midX=(xmin+xmax)/2-origin.x,midZ=(zmin+zmax)/2-origin.z;
  const floorY=rooms[room].floorY??0;
  const candidates=[];
  for(const r of wallRecords){
   const b=r.box,dx=b.max.x-b.min.x,dz=b.max.z-b.min.z;
   if(b.min.y>floorY+.3||b.max.y<floorY+2.1)continue;
   if(dx>dz&&dz<.5){
    const face=midZ>b.getCenter(new THREE.Vector3()).z?b.max.z:b.min.z,sign=midZ>face?1:-1;
    const lo=Math.max(b.min.x,xmin-origin.x+.08),hi=Math.min(b.max.x,xmax-origin.x-.08);
    if(face<zmin-origin.z-.3||face>zmax-origin.z+.3)continue;
    for(let t=lo+.20;t<hi-.18;t+=.22)candidates.push({r,axis:'z',face,sign,t,yaw:sign===1?Math.PI:0});
   }else if(dz>dx&&dx<.5){
    const face=midX>b.getCenter(new THREE.Vector3()).x?b.max.x:b.min.x,sign=midX>face?1:-1;
    const lo=Math.max(b.min.z,zmin-origin.z+.08),hi=Math.min(b.max.z,zmax-origin.z-.08);
    if(face<xmin-origin.x-.3||face>xmax-origin.x+.3)continue;
    for(let t=lo+.20;t<hi-.18;t+=.22)candidates.push({r,axis:'x',face,sign,t,yaw:sign===1?-Math.PI/2:Math.PI/2});
   }
  }
  for(const c of candidates){
   o.rotation.y=c.yaw;o.position.set(c.axis==='x'?c.face:c.t,floorY+height,c.axis==='z'?c.face:c.t);
   let b=box(o);const edge=c.axis==='x'?(c.sign===1?b.min.x:b.max.x):(c.sign===1?b.min.z:b.max.z);
   o.position[c.axis]+=c.face+c.sign*.012-edge;b=box(o);
   if(!within(room,b,.005)||b.min.y<floorY+.015||b.max.y>floorY+2.70||arrivalKeepClear(b))continue;
   const slab=b.clone();slab.min[c.axis]=c.face-.07;slab.max[c.axis]=c.face+.07;
   if(openings.some(r=>r.box.intersectsBox(slab))||collision(b,new Set([c.r,...sourceSet]),colliders.map(c=>c.box))||rooms[room].group.children.some(p=>box(p).intersectsBox(b)))continue;
   const transverse=c.axis==='x'?'z':'x',dir=new THREE.Vector3();dir[c.axis]=-c.sign;let support=true;
   for(const u of [.05,.25,.5,.75,.95])for(const v of [.04,.33,.66,.96]){
    const p=new THREE.Vector3();p[c.axis]=c.face+c.sign*.09;p[transverse]=THREE.MathUtils.lerp(b.min[transverse],b.max[transverse],u);p.y=THREE.MathUtils.lerp(b.min.y,b.max.y,v);
    ray.set(p,dir);ray.far=.18;if(!ray.intersectObject(c.r.mesh,false).length)support=false;
   }
   if(!support)continue;
   register(id,o,room,false,{sourceSupport:true,wallProbeCount:20,sourceWall:sourceGuid(c.r)});return o;
  }
  o.userData.dispose();blocked.push({id,reason:'No continuous source-supported wall footprint clear of openings and installed furniture'});return null;
 }
 const mirrorAsset=mountWallAsset('organic-mirror','G-SITTING',createPhase15Style,.72);
 const mirror=mirrorAsset?.getObjectByName('organic-real-planar-reflection');if(mirror?.userData.reflectionBudget)mirror.userData.reflectionBudget.enabled=true;
 mountWallAsset('contour-artwork','G-SITTING',createPhase15Style,1.18);
 const sconce=mountWallAsset('double-branch-wall-sconce','G-SITTING',createPhase15Light,1.30);if(sconce)fixtures.push(sconce);
 // Full-size botanical relief must not be forced onto a removed divider or
 // obstruct a window. The p20 dimensions are preserved. Approval of a changed
 // design or location is separate from geometric support.
 blocked.push({id:'botanical-relief',reason:'Full-height panel has no verified approved uninterrupted wall in dining room; do not rebuild an open-plan divider'});
 // Fit separately supported decoration on the floating console where clear.
 const mediaHost=rooms['G-SITTING'].group.children.find(o=>o.userData.assetId==='entertainment-wall');
 if(mediaHost){
  const top=mediaHost.getObjectByName('floating-console-top'),tb=top&&box(top),o=createPhase15Style('vases-and-books',{detail});let done=false;
  if(tb){for(const scale of [1,.82,.68])for(const shift of [-1.1,-.9,-.7,-.4,0,.4,.7,.9,1.1]){
   if(done)break;o.scale.setScalar(scale);
   o.rotation.y=mediaHost.rotation.y;o.position.set((tb.min.x+tb.max.x)/2+shift,tb.max.y,(tb.min.z+tb.max.z)/2);const bb=box(o);
   if(bb.min.x<tb.min.x+.02||bb.max.x>tb.max.x-.02||bb.min.z<tb.min.z+.015||bb.max.z>tb.max.z-.015)continue;
   let hit=false;mediaHost.traverse(p=>{if(p.isMesh&&p!==top&&box(p).intersectsBox(bb)&&box(p).max.y>tb.max.y+.012)hit=true;});
   if(!hit){register('vases-and-books',o,'G-SITTING',false,{support:'actual console top',adaptedScale:scale});done=true;break;}
  }}
  if(!done){o.userData.dispose();blocked.push({id:'vases-and-books',reason:'No supported clear console top envelope'});}
 }else blocked.push({id:'vases-and-books',reason:'Media host not installed'});
 // Independent ambient/accent layers are installed only under actual slab
 // support, in both rooms, rather than relying on old fixture emissives.
 for(const [room,z,x] of [['G-SITTING',-6.3,115.9],['G-DINING',-2.25,114.0]]){
  if(!rooms[room].installed)continue;
  const zone=room==='G-DINING'?'dining':'sitting';
  ceilingFixture('recessed-downlight',room,x,z,{zone});
  ceilingFixture('linear-cove-light',room,x,z-.95,{zone});
 }
 const controller=createPhase15LightingController(fixtures);
 let visible=true,section=false,master=true,layers={ambient:true,task:true,accent:true},night=false;const dimLevels={sitting:{ambient:1,task:1,accent:1},dining:{ambient:1,task:1,accent:1}};let lastUpdate={};
 function update({floor:level='all',walking=false,furnitureVisible=true,sectionEnabled=false,enabled=master,lightLayers=layers,night:nextNight=night,footY=0}={}){
  lastUpdate={floor:level,walking,furnitureVisible,sectionEnabled,enabled,lightLayers,night:nextNight,footY};
  visible=(level==='all'||level==='ground'||(walking&&footY<1.6));section=sectionEnabled&&!walking;master=enabled;layers=lightLayers;night=nextNight;
  root.visible=visible;
  for(const [id,r] of Object.entries(rooms)){r.group.visible=furnitureVisible; if(r.installed)stage4.groups[id].visible=false;}
  if(rooms['G-DINING'].installed)diningSystem.root.visible=false;
  for(const r of sourceSet)r.mesh.visible=false;
  floor.root.visible=visible;ceiling.root.visible=visible&&!section;
  suppressSurface();
  for(const f of fixtures){if(f.userData.anchor==='ceiling')f.visible=!section;f.userData.setLevel(master&&visible&&furnitureVisible&&f.visible&&layers[f.userData.layer]?(night?1:.28)*dimLevels[f.userData.zone][f.userData.layer]:0);}
  // Finish and media diffusers are emissive previews, not additional room
  // light sources. Bind them to the same zone/layer/master state.
  function syncGlow(group,zone){
   group.traverse(o=>{
    if(!o.isMesh)return;
    const layer=/downlight/i.test(o.name)?'ambient':/diffuser|light-strip|halo/i.test(o.name)?'accent':null;
    if(!layer)return;
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
     if(!m?.emissive||m.emissive.getHex()===0)continue;
     // Shared finish materials must be isolated per layer/room. Clone once
     // so the dining dimmer cannot change the sitting-room diffuser.
     if(!o.userData.phase15GlowMaterial){o.material=m.clone();o.userData.phase15GlowMaterial=true;o.userData.phase15GlowNominal=m.emissiveIntensity;}
     o.material.emissiveIntensity=(o.userData.phase15GlowNominal??.85)*(master&&visible&&layers[layer]?(night?1:.28)*dimLevels[zone][layer]:0);
    }
   });
  }
  for(const g of ceiling.root.children){const zone=g.name.includes('G-DINING')?'dining':'sitting';syncGlow(g,zone);}
  for(const [id,r] of Object.entries(rooms))for(const g of r.group.children)if(['entertainment-wall','organic-mirror'].includes(g.userData.assetId))syncGlow(g,id==='G-DINING'?'dining':'sitting');
  for(const e of lighting.emitters){
   const zone=e.zone.id==='dining'?'dining':['living','living-window'].includes(e.zone.id)?'sitting':null;
   if(zone&&fixtures.some(f=>f.userData.zone===zone&&f.userData.assetId==='recessed-downlight')){
    e.light.parent.visible=false;e.light.intensity=0;
   }
  }
  if(rooms['G-DINING'].installed&&fixtures.some(f=>f.userData.assetId==='dining-pendant-cluster')){
   for(const e of lighting.briefEmitters.filter(e=>e.id==='dining-table-pendant')){e.assembly.visible=false;e.light.intensity=0;}
  }
 }
 function forceReflection(){mirror?.userData.forceReflection?.();}
 function setDimmer(zone,layer,level){if(!dimLevels[zone]||!(layer in dimLevels[zone])||!Number.isFinite(level))throw Error('Invalid room dimmer');dimLevels[zone][layer]=THREE.MathUtils.clamp(level,0,1);update(lastUpdate);}
 function blocks(x,z,y,radius){if(!root.visible)return false;return colliders.some(c=>rooms[c.room].group.visible&&y+1.5>c.box.min.y&&y+.20<c.box.max.y&&x>c.box.min.x-radius&&x<c.box.max.x+radius&&z>c.box.min.z-radius&&z<c.box.max.z+radius);}
 function status(){
  const orientation=[];if(rooms['G-DINING'].installed)ds.children.filter(o=>/^DINING_CHAIR_/.test(o.name)).forEach(o=>{const back=box(o.getObjectByName('backrest-landmark')).getCenter(new THREE.Vector3()),seat=box(o.getObjectByName('seat-landmark')).getCenter(new THREE.Vector3()),v=seat.sub(back);v.y=0;const dir=new THREE.Vector3(o.userData.target[0]-o.position.x,0,o.userData.target[1]-o.position.z).normalize();orientation.push({id:o.name,dot:v.normalize().dot(dir)});});
  for(const p of seats.filter(p=>p.id==='accent-chair')){const back=box(p.asset.getObjectByName('backrest-landmark')).getCenter(new THREE.Vector3()),seat=box(p.asset.getObjectByName('deep-seat-cushion')).getCenter(new THREE.Vector3()),v=seat.sub(back);v.y=0;const dir=new THREE.Vector3(p.target[0]-p.x,0,p.target[1]-p.z).normalize();orientation.push({id:p.asset.name,dot:v.normalize().dot(dir)});}
  return {revision:'15I-visual-refinement',defaultOn:true,rooms:Object.fromEntries(Object.entries(rooms).map(([id,r])=>[id,{installed:r.installed,centre:r.centre??null}])),placed,blocked,orientation,sourceCount:sourceSet.size,visibleLegacy:[...sourceSet].filter(r=>r.mesh.visible).length,hiddenLegacyObjects:hiddenLegacy.length,colliders:colliders.length,floorRegions,ceilingRegions,fixtures:fixtures.map(f=>({id:f.userData.assetId,zone:f.userData.zone,intensity:f.userData.lights.reduce((s,l)=>s+l.intensity,0)})),replacedAmbient:lighting.emitters.filter(e=>e.light.parent.visible===false&&['dining','living','living-window'].includes(e.zone.id)).map(e=>e.zone.id),replacedBrief:lighting.briefEmitters.filter(e=>e.id==='dining-table-pendant'&&!e.assembly.visible).map(e=>e.id),reflection:mirror?.userData.reflectionStats?.()??null,dimmers:JSON.parse(JSON.stringify(dimLevels)),liveClearanceCertified:false,clientApproved:false};
 }
 update();return {root,sourceSet,colliders,fixtures,controller,rooms,update,blocks,status,setDimmer,forceReflection};
}
