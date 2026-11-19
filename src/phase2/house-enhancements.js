import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Optional interpretation layer. Geometry is anchored to existing IFC furniture
 * elements and the gate's published 4m clearance, but isn't a source BIM object.
 * Original IFC files and furniture remain recoverable via viewer layer controls.
 */
const fabric=(color,roughness=.88)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
const cream=fabric('#f2ece5'),stone=fabric('#dbd5ca'),walnut=fabric('#926c54'),sage=fabric('#76866f'),lightSage=fabric('#aeb8a2'),white=fabric('#fff9f2'),gold=fabric('#bd9569',.45),black=fabric('#24383e',.38),glass=new THREE.MeshPhysicalMaterial({color:'#b3d3d7',metalness:0,roughness:.12,transparent:true,opacity:.48,side:THREE.DoubleSide});
const bedding=[sage,cream,lightSage,cream,sage];
function cuboid(parent,material,w,h,d,x,y,z,rounded=0){
 const geo=rounded>0?new RoundedBoxGeometry(Math.max(.01,w),Math.max(.01,h),Math.max(.01,d),3,Math.min(rounded,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d);
 const obj=new THREE.Mesh(geo,material);
 obj.position.set(x,y,z);obj.receiveShadow=true;parent.add(obj);return obj;
}
function nearestWallDistance(x,z,y,walls){
 let best=Infinity;
 for(const r of walls){
  const b=r.box;if(y<b.min.y-.2||y>b.max.y+.3)continue;
  const dx=Math.max(b.min.x-x,0,x-b.max.x),dz=Math.max(b.min.z-z,0,z-b.max.z);
  best=Math.min(best,Math.hypot(dx,dz));
 }
 return best;
}
function createBed(record,wallRecords,index){
 const b=record.box,center=b.getCenter(new THREE.Vector3()),ext=b.getSize(new THREE.Vector3());
 // Use real IFC furniture x/z bounds to size and orient the model (metres).
 const w=Math.min(ext.x,ext.z),len=Math.max(ext.x,ext.z);
 // Do not enlarge a source bed into an impassable block. Keep a compact
 // realistic sleeping footprint so the original room remains accessible.
 const width=Math.max(1.12,Math.min(w,1.68));
 const length=Math.max(1.73,Math.min(len,2.06));
 const floor=record.layer.level==='first'?3.3:0;
 const group=new THREE.Group();group.name='REFERENCE_STYLED_BED_'+index;
 group.position.set(center.x,floor,center.z);
 const axisAlongX=ext.x>ext.z;
 // Determine actual wall proximity at both ends, place headboard on nearest wall side.
 const along=axisAlongX?new THREE.Vector2(1,0):new THREE.Vector2(0,1);
 const a=nearestWallDistance(center.x-along.x*length*.52,center.z-along.y*length*.52,floor+1.1,wallRecords);
 const c=nearestWallDistance(center.x+along.x*length*.52,center.z+along.y*length*.52,floor+1.1,wallRecords);
 group.rotation.y=(axisAlongX?Math.PI/2:0)+(c<a?Math.PI:0);
 // Source bed geometry will be hidden only when this optional treatment is enabled.
 cuboid(group,walnut,width+.12,.19,length+.08,0,.24,0,.04);
 cuboid(group,stone,width,.26,length,0,.47,0,.10);
 cuboid(group,cream,width-.045,.07,length-.12,0,.64,0,.023);
 cuboid(group,walnut,width+.18,.95,.12,0,.69,-length/2-.095,.035);
 // Headboard upholstered inner panel and restrained stitching
 cuboid(group,stone,width,.53,.045,0,.72,-length/2-.173,.035);
 for(let k=-1;k<=1;k++)cuboid(group,cream,.028,.42,.047,k*width/3,.72,-length/2-.205,.012);
 const pillows=Math.max(1,Math.min(2,Math.round(width/.95)));
 for(let k=0;k<pillows;k++){
  const px=pillows===1?0:(k-.5)*width*.48;
  cuboid(group,white,width*.34,.14,.35,px,.78,-length*.31,.068);
  cuboid(group,bedding[index%bedding.length],width*.27,.06,.23,px,.89,-length*.30,.035);
 }
 cuboid(group,bedding[index%bedding.length],width-.07,.095,length*.52,0,.735,length*.205,.035);
 // Blanket turnover: a thin bright trim across the bottom
 cuboid(group,white,width-.09,.018,.16,0,.791,-.01,.008);
 // Legs: the feet only; no cheap billboard furniture or faux depth.
 for(const x of [-1,1])for(const z of [-1,1])cuboid(group,walnut,.11,.16,.11,x*(width/2-.09),.09,z*(length/2-.13),.015);
 // Omit stands where circulation space is narrow or when the original source
 // bed was oversized: floor access is more important than decoration.
 if(w>1.95&&len>2.7)for(const side of [-1,1]){
  const nearX=center.x+Math.cos(group.rotation.y)*side*(width/2+.34);
  const nearZ=center.z-Math.sin(group.rotation.y)*side*(width/2+.34);
  if(nearestWallDistance(nearX,nearZ,floor+.6,wallRecords)<.52)continue;
  const x=side*(width/2+.36);
  cuboid(group,walnut,.44,.53,.42,x,.28,-length*.23,.025);
  cuboid(group,stone,.42,.045,.40,x,.56,-length*.23,.013);
  const stem=cuboid(group,gold,.035,.20,.035,x,.69,-length*.23,.01);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.11,.17,.17,14),cream);
  shade.position.set(x,.83,-length*.23);group.add(shade);
 }
 group.userData={sourceGuid:record.mesh.userData.ifc?.guid,visualEstimate:true,fromIFCFurniture:'FU - 010',floor:record.layer.level,footprint_m:[Math.round(width*100)/100,Math.round(length*100)/100]};
 return group;
}
function fitBedToActualDoorways(group,source,doorRecords,wallRecords){
 group.updateMatrixWorld(true);
 for(const d of doorRecords){
  if(d.layer?.level!==source.layer.level)continue;
  const center=d.box.getCenter(new THREE.Vector3()),size=d.box.getSize(new THREE.Vector3());
  if(size.y<1.65)continue;
  const alongX=size.x>=size.z;
  const axis=alongX?'z':'x',across=alongX?'x':'z';
  const boundary=new THREE.Box3().setFromObject(group);
  const span=size[alongX?'x':'z']/2;
  if(boundary.max[across]<center[across]-span-.12||
    boundary.min[across]>center[across]+span+.12)continue;
  const bedCenter=boundary.getCenter(new THREE.Vector3());
  const delta=bedCenter[axis]-center[axis];
  if(Math.abs(delta)>3||Math.abs(delta)<.08)continue;
  const sign=Math.sign(delta);
  const nearEdge=sign<0?boundary.max[axis]:boundary.min[axis];
  const clearance=Math.abs(nearEdge-center[axis]);
  if(clearance>=.97)continue;
  const shift=sign*Math.min(.72,1.02-clearance);
  const overlaps=b=>wallRecords.filter(w=>w.layer.level===source.layer.level&&
    w.box.intersectsBox(b)).length;
  const oldCount=overlaps(boundary);
  group.position[axis]+=shift;
  group.updateMatrixWorld(true);
  const movedBox=new THREE.Box3().setFromObject(group);
  if(overlaps(movedBox)>oldCount){
    group.position[axis]-=shift;
    group.updateMatrixWorld(true);
    continue;
  }
  group.userData.circulationCorrection={doorSourceGUID:d.mesh.userData.ifc?.guid,
    axis,shiftMetres:Number(shift.toFixed(3)),originalIFCUnmodified:true};
  break;
 }
 // The first-floor balcony DOO - 003 lies in a narrow bedroom zone.
 // A second source-specific clearance adjustment prevents the bed's end
 // from covering the approach even if an earlier doorway was matched.
 const sourceCenter=source.box.getCenter(new THREE.Vector3());
 const balconyDoor=source.layer.level==='first'&&doorRecords.find(r=>{
  if(r.layer.level!=='first'||!/^DOO\s*-\s*003$/i.test(r.mesh.userData.ifc?.name||''))return false;
  const d=r.box.getCenter(new THREE.Vector3());
  return Math.abs(d.x-sourceCenter.x)<1.1 &&
    sourceCenter.z<d.z-.65 && sourceCenter.z>d.z-2.9;
 });
 if(balconyDoor){
  const doorCenter=balconyDoor.box.getCenter(new THREE.Vector3());
  const boundary=new THREE.Box3().setFromObject(group);
  const gap=doorCenter.z-boundary.max.z;
  if(gap<1.17){
   const minShift=-Math.min(.92,1.19-gap);
   const walls=wallRecords.filter(w=>w.layer.level===source.layer.level);
   const overlapScore=b=>walls.reduce((sum,w)=>{
     const u=w.box;
     const dx=Math.max(0,Math.min(b.max.x,u.max.x)-Math.max(b.min.x,u.min.x));
     const dz=Math.max(0,Math.min(b.max.z,u.max.z)-Math.max(b.min.z,u.min.z));
     const dy=Math.max(0,Math.min(b.max.y,u.max.y)-Math.max(b.min.y,u.min.y));
     return sum+(dy>.10?dx*dz:0);
   },0);
   const previous=overlapScore(boundary),starting=group.position.clone();
   // The adjacent first-floor 0.97m DOO - 002 is a second route out
   // of the same bedroom. Ignore other remote doorway bounds in the model.
   const otherDoorways=doorRecords.filter(d=>{
    if(d.layer.level!==source.layer.level ||
      !/^DOO\s*-\s*002$/i.test(d.mesh.userData.ifc?.name||''))return false;
    const c=d.box.getCenter(new THREE.Vector3());
    return c.x>sourceCenter.x+1.2&&c.x<sourceCenter.x+3.1&&
      Math.abs(c.z-sourceCenter.z)<1.85;
   });
   const conflictingDoors=b=>otherDoorways.filter(d=>{
    const c=d.box.getCenter(new THREE.Vector3()),s=d.box.getSize(new THREE.Vector3());
    if(s.y<1.65) return false;
    if(b.max.y<c.y-s.y/2+.25||b.min.y>c.y+s.y/2-.15)return false;
    // Preserve a collision-free central route through this 0.97m doorway.
    const alongX=s.x>=s.z,half=.36;
    return alongX?
      b.min.x<c.x+half&&b.max.x>c.x-half&&b.min.z<c.z+.77&&b.max.z>c.z-.77:
      b.min.z<c.z+half&&b.max.z>c.z-half&&b.min.x<c.x+.77&&b.max.x>c.x-.77;
   });
   let best=null;
   // A placement must clear ALL source doorways, including the adjacent
   // upstairs interior bedroom door, not only the balcony door.
   const scales=[[1,1],[.92,.92],[.85,.92],[.78,.9],[.72,.89]];
   for(const [sx,sz] of scales){
    let fitting=null;
    group.scale.set(sx,1,sz);
    for(const dx of [0,-.25,-.5,-.75,-1,-1.25,.25,.5,.75,1,1.25,1.5]){
     for(const dz of [minShift,-.27,-.35,-.45,-.55,-.70,-.85,-1,-1.2]){
      group.position.copy(starting).add(new THREE.Vector3(dx,0,dz));
      group.updateMatrixWorld(true);
      const after=new THREE.Box3().setFromObject(group);
      const overlap=overlapScore(after);
      const clearance=doorCenter.z-after.max.z;
      const sideways=after.min.x>doorCenter.x+balconyDoor.box.getSize(new THREE.Vector3()).x/2+.34||
        after.max.x<doorCenter.x-balconyDoor.box.getSize(new THREE.Vector3()).x/2-.34;
      if((clearance<1.17&&!sideways)||overlap>previous+.013)continue;
      if(conflictingDoors(after).length)continue;
      const score=overlap*15+Math.hypot(dx,dz)*.15;
      if(!fitting||score<fitting.score)fitting={dx,dz,sx,sz,score,overlap,clearance,sideways};
     }
    }
    if(fitting){best=fitting;break;}
   }
   group.position.copy(starting);group.scale.set(1,1,1);
   if(best){
    group.position.add(new THREE.Vector3(best.dx,0,best.dz));
    group.scale.set(best.sx,1,best.sz);
    const footprint=group.userData.footprint_m;
    group.userData.footprint_m=footprint.map((v,i)=>Number((v*(i===0?best.sx:best.sz)).toFixed(3)));
    group.userData.circulationCorrection={
      ...(group.userData.circulationCorrection||{}),
      sourceBalconyDoorGUID:balconyDoor.mesh.userData.ifc?.guid,
      balconyApproachShiftX:Number(best.dx.toFixed(3)),
      balconyApproachShiftZ:Number(best.dz.toFixed(3)),
      doorwayClearanceMetres:Number(best.clearance.toFixed(3)),
      reducedBedScale:[best.sx,best.sz],
      wallOverlapBeforeSqM:Number(previous.toFixed(3)),
      wallOverlapAfterSqM:Number(best.overlap.toFixed(3)),
      originalIFCUnmodified:true
    };
   }else{
    group.userData.circulationReview={reason:'source-wall-constrained-no-safe-placement',
      doorwayGapMetres:Number(gap.toFixed(3)),wallOverlapSqM:Number(previous.toFixed(3))};
   }
   group.updateMatrixWorld(true);
  }
 }
}
export function buildBedroomDecorations(meshRecords,scene){
 const walls=meshRecords.filter(x=>x.category==='walls');
 const sourceDoors=meshRecords.filter(x=>/^DOO\s*-/i.test(x.mesh.userData.ifc?.name||''));
 const beds=meshRecords.filter(x=>{
  if(x.category!=='furniture')return false;
  const meta=x.mesh.userData.ifc||{};
  const size=x.box.getSize(new THREE.Vector3());
  return String(meta.name||'').trim().toUpperCase()==='FU - 010'&&Math.min(size.x,size.z)>=1.30&&Math.max(size.x,size.z)>=1.80&&
    ['ground','first'].includes(x.layer.level);
 });
 const parent=new THREE.Group();parent.name='PROPOSED_STYLED_BEDS';
 for(let i=0;i<beds.length;i++){
  beds[i].mesh.userData.styledBedSource=true;
  const bed=createBed(beds[i],walls,i);
  fitBedToActualDoorways(bed,beds[i],sourceDoors,walls);
  parent.add(bed);
 }
 scene.add(parent);
 parent.updateMatrixWorld(true);
 const visualBeds=parent.children;
 const circulationCorrections=visualBeds.filter(b=>b.userData.circulationCorrection).map(b=>({
  sourceGuid:b.userData.sourceGuid,...b.userData.circulationCorrection
 }));
 const collisionBoxes=visualBeds.map(bed=>new THREE.Box3().setFromObject(bed));
 const circulationReviews=visualBeds.filter(b=>b.userData.circulationReview).map(b=>({
  sourceGuid:b.userData.sourceGuid,...b.userData.circulationReview
 }));
 return {group:parent,sources:beds,visualBeds,collisionBoxes,circulationCorrections,circulationReviews,
  entries:beds.map((r,i)=>({id:i,level:r.layer.level,center:r.box.getCenter(new THREE.Vector3()),area:r.box.getSize(new THREE.Vector3()),
   styledFootprint:visualBeds[i]?.userData?.footprint_m??null}))};
}
function section(parent,w,h,d,x,y,z,material=black){
 return cuboid(parent,material,w,h,d,x,y,z,Math.min(w,h,d)*.07);
}
/** 
 * 2022 Home.pdf S2 Gate Detail: ~4m gateway, steel grid at ~125mm c/c.
 * Location near approximate front site boundary is a provisional placement,
 * not a certified IFC gate location.
 */
export function createGatePreview(scene,origin){
 const parent=new THREE.Group();parent.name='PDF_GATE_PREVIEW_PROVISIONAL';
 // Site frontage in extracted IFC is around Z=+13; a likely opening is toward X=130.
 // Store source coordinates, not global scene coordinates; world X/Z offset by origin.
 const siteX=130.7-origin.x,siteZ=12.85-origin.z,baseY=-2.5;
 parent.position.set(siteX,baseY,siteZ);
 const concrete=fabric('#dfd9cf'),iron=fabric('#3c4646',.42),coping=fabric('#797d79',.45),track=fabric('#797d79',.45);
 // Reconstructed side walls are confined to opt-in site preview only.
 section(parent,6.2,2.22,.34,-5.42,1.10,0,concrete);
 section(parent,7.1,2.22,.34,5.82,1.10,0,concrete);
 section(parent,6.35,.10,.42,-5.46,2.23,0,coping);
 section(parent,7.25,.10,.42,5.86,2.23,0,coping);
 for(const side of [-1,1]){
  const x=side*2.2;
  section(parent,.4,2.45,.42,x,1.22,0,concrete);
  section(parent,.48,.13,.48,x,2.49,0,coping);
  section(parent,.66,.18,.62,x,.08,0,stone);
 }
 // Four metre sliding gate on compact steel rollers.
 section(parent,4.06,.075,.07,0,.23,0,iron);
 section(parent,4.06,.065,.07,0,2.09,0,iron);
 section(parent,.08,1.88,.07,-2.0,1.16,0,iron);
 section(parent,.08,1.88,.07,2.0,1.16,0,iron);
 section(parent,4.06,.11,.11,0,.07,.10,track);
 for(let x=-1.89;x<1.99;x+=.125)section(parent,.026,1.78,.032,x,1.16,0,iron);
 // Strong horizontal spine, and four visibly functioning wheel supports.
 section(parent,4.0,.06,.06,0,.98,.035,iron);
 for(const x of [-1.6,1.6]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.08,14),black);
  wheel.rotation.x=Math.PI/2;wheel.position.set(x,.19,.06);parent.add(wheel);
 }
 // Estimated front walkway: subtle, not an invented boundary wall.
 section(parent,4.75,.11,.78,0,-.045,.02,stone);
 parent.userData={interpretation:'PDF gate detail visually reconstructed',placement:'provisional',gateWidth_m:4.0,clearHeight_m:2.1};
 scene.add(parent);parent.visible=false;
 return parent;
}
