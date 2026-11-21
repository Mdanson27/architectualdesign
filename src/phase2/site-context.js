import * as THREE from 'three';

/**
 * Architectural sheet S1 (Jan 2022), 01 Site Plan, 1:200.
 * Viewer-only reconstruction, in the same metre-based coordinate system as the
 * original IFC. The original meshes remain untouched and recoverable.
 *
 * Drawing facts: 48.5 m frontage, 25 m depth, three 2.5 m parking spaces,
 * "Paved Area", LAWN zones, sliding gate, trees, bins and fire point.
 * The exact building-to-plot registration is a *review alignment*, not a survey.
 */
export const sitePlan = Object.freeze({
 width:48.5, depth:25, parkingCount:3, parkingBayWidth:2.5,
 gateWidth:4, splashApronWidth:0.6, source:'Home(4).pdf / S1 / 01 Site Plan',
 gatePlacement:'client-corrected toward foreground end of road-facing long boundary',
 buildingRegistration:'approximate, uses IFC ground/first wall bounds'
});

const M=(color,roughness=.91,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mat={
 turf:M('#83a77b'),turfLight:M('#91b285'),gravel:M('#a69d89'),
 mulch:M('#746352'),kerb:M('#bfb5a5'),road:M('#747a74'),
 boundary:M('#dcd7cb'),coping:M('#c2b9a8'),frame:M('#444e4b',.66,.32),
 trunk:M('#94704e'),leaf:M('#457f52'),leaf2:M('#5e9363'),
 paving:M('#d3c9b8'),mark:M('#f8f3e7'),stone:M('#b4aea2')
};
const box=(p,w,h,d,x,y,z,material,name)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);mesh.name=name||'SITE_APPROVED_COMPONENT';
 mesh.receiveShadow=true;p.add(mesh);return mesh;
};
const tube=(p,r,h,x,y,z,material,sides=10)=>{
 const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,sides),material);
 o.position.set(x,y,z);p.add(o);return o;
};
function lawnTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;
 const p=c.getContext('2d');p.fillStyle='#e2f2d9';p.fillRect(0,0,512,512);
 for(let i=0;i<6000;i++){
  const x=(i*127.41)%512,y=(i*217.37)%512;
  p.fillStyle=i%4===0?'rgba(55,91,51,.17)':i%3===0?'rgba(248,255,242,.18)':'rgba(78,126,69,.08)';
  p.fillRect(x,y,.7,3.8+(i%3));
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.repeat.set(9,5);tex.anisotropy=2;
 return tex;
}
function paverTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d');ctx.fillStyle='#d2cabd';ctx.fillRect(0,0,512,512);
 const rows=8,cols=5,dy=512/rows,dx=512/cols;
 for(let row=0;row<rows;row++)for(let col=-1;col<=cols;col++){
  const x=col*dx+(row%2)*dx/2,y=row*dy;
  ctx.fillStyle=['#c8c1b5','#d9d2c7','#bbb5a9','#d1cabd'][(row+col+40)%4];
  ctx.fillRect(x+2,y+2,dx-4,dy-4);
  ctx.strokeStyle='#999285';ctx.lineWidth=1;ctx.strokeRect(x+2,y+2,dx-4,dy-4);
 }
 const map=new THREE.CanvasTexture(c);
 map.colorSpace=THREE.SRGBColorSpace;
 map.wrapS=map.wrapT=THREE.RepeatWrapping;
 map.anisotropy=2;
 return map;
}
function slab(parent,materials,cx,cz,w,d,y,name,textureScale=.6){
 const m=materials.clone();const uv=paverTexture();
 uv.repeat.set(Math.max(.15,w/(5*textureScale)),Math.max(.15,d/(8*textureScale*.5)));
 m.map=uv;m.needsUpdate=true;
 const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);
 o.rotation.x=-Math.PI/2;
 o.position.set(cx,y,cz);
 o.name=name;parent.add(o);return o;
}
function strip(parent,a,b,width,height,y,material,name){
 const ax=a[0],az=a[1],bx=b[0],bz=b[1];
 const length=Math.hypot(bx-ax,bz-az);
 const segment=box(parent,length,height,width,(ax+bx)/2,y,(az+bz)/2,material,name);
 segment.rotation.y=-Math.atan2(bz-az,bx-ax);
 return segment;
}
function buildFence(parent,a,b,base,withGrill=true){
 const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
 if(L<.1)return;
 strip(parent,a,b,.2,1.18,base+.59,mat.boundary,'APPROVED_BOUNDARY_WALL');
 strip(parent,a,b,.28,.085,base+1.22,mat.coping,'APPROVED_COPING');
 if(withGrill){
  const n=Math.max(1,Math.floor(L/.48));
  strip(parent,a,b,.048,.049,base+1.80,mat.frame,'APPROVED_FENCE_TOP_RAIL');
  strip(parent,a,b,.047,.055,base+1.38,mat.frame,'APPROVED_FENCE_LOWER_RAIL');
  for(let i=1;i<n;i++){
   const t=i/n,xx=a[0]+(b[0]-a[0])*t,zz=a[1]+(b[1]-a[1])*t;
   tube(parent,.019,.58,xx,base+1.51,zz,mat.frame,6);
  }
 }
 const pCount=Math.max(1,Math.round(L/4));
 for(let i=0;i<=pCount;i++){
  const t=i/pCount,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
  box(parent,.32,1.9,.32,x,base+.95,z,mat.boundary,'APPROVED_BOUNDARY_PILLAR');
  box(parent,.39,.09,.39,x,base+1.94,z,mat.coping);
 }
}
function createSlideGate(parent,x,z,base){
 const g=new THREE.Group();g.name='PLAN_SLIDING_GATE_4M';
 g.position.set(x,0,z);parent.add(g);
 for(const side of [-1,1]){
  box(g,.44,2.17,.44,side*2.18,base+1.085,0,mat.boundary);
  box(g,.54,.10,.54,side*2.18,base+2.20,0,mat.coping);
 }
 box(g,4.03,.07,.075,0,base+.20,0,mat.frame);
 box(g,4.03,.07,.075,0,base+2.0,0,mat.frame);
 box(g,.074,1.82,.075,-1.98,base+1.10,0,mat.frame);
 box(g,.074,1.82,.075,1.98,base+1.10,0,mat.frame);
 box(g,4.03,.055,.07,0,base+1.06,0,mat.frame);
 for(let x1=-1.87;x1<=1.88;x1+=.125){
  tube(g,.011,1.73,x1,base+1.11,0,mat.frame,5);
 }
 box(g,4.35,.035,.13,0,base+.045,0,mat.frame,'GATE_TRACK');
 for(const xx of [-1.64,1.64]){
  const wheel=tube(g,.09,.08,xx,base+.12,.08,mat.frame,12);wheel.rotation.x=Math.PI/2;
 }
 g.userData={sitePlan:true,source:'S1 Gate Detail and Site Plan',widthMetres:4,operationalPreview:false};
 return g;
}
function palm(parent,x,z,ground,scale=1){
 const t=new THREE.Group();t.name='PLAN_LANDSCAPE_TREE';t.position.set(x,ground,z);t.scale.setScalar(scale);parent.add(t);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.23,3.45,8),mat.trunk);
 trunk.position.set(.11,1.72,0);trunk.rotation.z=-.08;t.add(trunk);
 // Curved tapered leaflet geometry; avoid expensive external geometry/asset downloads.
 for(let j=0;j<9;j++){
  const angle=j*2*Math.PI/9,radius=2.13+(j%3)*.23;
  const verts=[],indices=[];
  for(let i=0;i<=7;i++){
   const f=i/7,r=radius*f;
   const yy=3.45+.18*Math.sin(Math.PI*f)-1.00*f*f;
   const broad=.42*Math.sin(Math.PI*f);
   const vx=Math.cos(angle),vz=Math.sin(angle);
   const nx=-vz,nz=vx;
   for(const side of [-1,1])verts.push(.13+vx*r+nx*broad*side,yy,vz*r+nz*broad*side);
   if(i<7){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const leaf=new THREE.Mesh(geom,j%2?mat.leaf:mat.leaf2);
  leaf.material.side=THREE.DoubleSide;t.add(leaf);
 }
 const rootMulch=new THREE.Mesh(new THREE.CylinderGeometry(.54,.58,.055,14),mat.gravel);
 rootMulch.position.y=.02;t.add(rootMulch);
 return t;
}
function marker(parent,x,z,ground,label){
 const group=new THREE.Group();group.name='PLAN_'+label;group.position.set(x,ground,z);parent.add(group);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.055,14),mat.stone);
 pad.position.y=.028;group.add(pad);
 const shaft=tube(group,.034,.77,0,.4,0,mat.frame,8);
 const cap=box(group,.4,.26,.06,0,.82,0,mat.mark,'PLAN_SIGN_'+label);
 cap.userData={label};return group;
}

export function createCuratedSiteContext(scene,origin){
 const root=new THREE.Group();root.name='PLAN_VERIFIED_CURATED_SITE_CONTEXT';
 root.position.set(-origin.x,0,-origin.z);scene.add(root);
 const house={minX:106.1254,maxX:122.6263,minZ:-14.5676,maxZ:1.4020};
 const left=house.minX-1.50,top=house.minZ-4.05;
 const right=left+sitePlan.width,front=top+sitePlan.depth;
 const base=-.29,surface=base+.035;
 const corner=4.2; // Approximation of the chamfered access-road plot corner.
 const boundary=[[left,top],[right,top],[right,front-corner],[right-corner,front],[left,front]];
 const turfShape=new THREE.Shape();
 turfShape.moveTo(boundary[0][0],-boundary[0][1]);
 for(let i=1;i<boundary.length;i++)turfShape.lineTo(boundary[i][0],-boundary[i][1]);
 turfShape.closePath();
 // Cut out the house, so lawn never overlays the interior floor.
 const houseHole=new THREE.Path();
 houseHole.moveTo(house.minX,-house.minZ);
 houseHole.lineTo(house.maxX,-house.minZ);
 houseHole.lineTo(house.maxX,-house.maxZ);
 houseHole.lineTo(house.minX,-house.maxZ);houseHole.closePath();
 turfShape.holes.push(houseHole);
 const lawnMat=mat.turf.clone();lawnMat.map=lawnTexture();
 const turf=new THREE.Mesh(new THREE.ShapeGeometry(turfShape,12),lawnMat);
 turf.rotation.x=-Math.PI/2;turf.position.y=surface-.014;
 turf.name='S1_LAWN_EXCLUDING_HOUSE';root.add(turf);

 // Parking: three 2500mm bays, marked on S1 to the east of the residence.
 const parkX=house.maxX+.95,parkW=7.5;
 const parkRear=house.minZ+5.1,parkFront=house.maxZ-.06;
 const parkDepth=parkFront-parkRear;
 slab(root,mat.paving,parkX+parkW/2,(parkRear+parkFront)/2,parkW,parkDepth,surface+.02,'S1_PAVED_PARKING_THREE_BAYS');
 for(let i=1;i<3;i++){
  strip(root,[parkX+i*2.5,parkRear+.2],[parkX+i*2.5,parkFront-.2],.055,.014,surface+.034,mat.mark,'PARKING_BAY_SEPARATOR');
 }
 // S1 uses the long road-facing boundary. The client has corrected the gate
 // to its foreground end (opposite the earlier gate position in the renders).
 // Stay inside the straight frontage, before the chamfer at the far corner.
 const gateCenterX=right-corner-sitePlan.gateWidth/2-1.05;
 const gateZ=front;
 // Continue visible block paving from the entrance along the plot's lengthy
 // frontage, then turn naturally into the three existing bays beside the house.
 // These are joined by overlapping flush slabs; never leave a lawn strip
 // interrupting the entrance-to-parking route.
 const drivewayMinZ=front-4.65;
 const drivewayStartX=parkX+parkW-.8;
 const drivewayEndX=gateCenterX+sitePlan.gateWidth/2-.25;
 slab(root,mat.paving,(drivewayStartX+drivewayEndX)/2,(drivewayMinZ+front)/2,
  drivewayEndX-drivewayStartX,front-drivewayMinZ,surface+.024,
  'S1_PAVED_LONG_FRONTAGE_DRIVE');
 const turningWidth=parkW+2.4,turningCenterX=parkX+parkW/2+1.0;
 const turningMinZ=parkFront-.34,turningMaxZ=front-.08;
 slab(root,mat.paving,turningCenterX,(turningMinZ+turningMaxZ)/2,
  turningWidth,turningMaxZ-turningMinZ,surface+.025,
  'S1_PAVED_PARKING_TURN');
 // Matching kerbs define a clear edge between paved parking and planted lawn.
 const kerbY=surface+.029;
 box(root,.115,.105,parkDepth+.10,parkX-.065,kerbY,(parkRear+parkFront)/2,mat.kerb,'PAVED_AREA_LEFT_KERB');
 // The right edge of the parking court opens into the turning area; no kerb
 // may project across the vehicle's route.
 box(root,.115,.105,parkDepth-1.10,parkX+parkW+.065,kerbY,(parkRear+parkFront)/2-.55,
  mat.kerb,'PAVED_AREA_RIGHT_KERB');
 box(root,parkW+.16,.105,.11,parkX+parkW/2,kerbY,parkRear-.06,mat.kerb,'PAVED_AREA_REAR_KERB');
 box(root,drivewayEndX-drivewayStartX,.103,.09,
  (drivewayStartX+drivewayEndX)/2,kerbY,drivewayMinZ-.065,
  mat.kerb,'LONG_FRONTAGE_DRIVE_LAWN_KERB');

 // One 600x600x50mm splash apron row is explicitly required by note 9.
 const apron=.6,pad=.18;
 const ext={x0:house.minX-pad,x1:house.maxX+pad,z0:house.minZ-pad,z1:house.maxZ+pad};
 slab(root,mat.paving,(ext.x0+ext.x1)/2,ext.z0-apron/2,ext.x1-ext.x0+2*apron,apron,surface+.027,'S1_SPLASH_APRON_NORTH');
 slab(root,mat.paving,(ext.x0+ext.x1)/2,ext.z1+apron/2,ext.x1-ext.x0+2*apron,apron,surface+.027,'S1_SPLASH_APRON_SOUTH');
 slab(root,mat.paving,ext.x0-apron/2,(ext.z0+ext.z1)/2,apron,ext.z1-ext.z0,surface+.027,'S1_SPLASH_APRON_WEST');
 slab(root,mat.paving,ext.x1+apron/2,(ext.z0+ext.z1)/2,apron,ext.z1-ext.z0,surface+.027,'S1_SPLASH_APRON_EAST');

 // Actual boundary follows S1. Front wall is interrupted by the sliding gate.
 const gateHalf=sitePlan.gateWidth/2;
 for(let i=0;i<boundary.length-2;i++)buildFence(root,boundary[i],boundary[i+1],base);
 buildFence(root,boundary[3],[gateCenterX+gateHalf+.22,front],base);
 buildFence(root,[gateCenterX-gateHalf-.22,front],boundary[4],base);
 buildFence(root,boundary[4],boundary[0],base);
 const gate=createSlideGate(root,gateCenterX,gateZ,base);
 // S1 depicts an access road along the gate/front plot line. This unmarked
 // external road strip is illustrative: its actual public-road width is not surveyed.
 const roadWidth=5.0;
 box(root,sitePlan.width-.4,.07,roadWidth,(left+right)/2,surface-.04,front+roadWidth/2+.17,mat.road,'S1_ACCESS_ROAD_REFERENCE');
 // Leave a real clear entry: the road-side kerb must not continue across the
 // sliding gate track. Both segments meet the corresponding boundary walls.
 const roadKerbLeftEnd=gateCenterX-gateHalf-.28;
 const roadKerbRightStart=gateCenterX+gateHalf+.28;
 box(root,roadKerbLeftEnd-left,.13,.14,(left+roadKerbLeftEnd)/2,
  surface+.02,front+.18,mat.kerb,'S1_STREET_EDGE_LEFT');
 box(root,right-roadKerbRightStart,.13,.14,(right+roadKerbRightStart)/2,
  surface+.02,front+.18,mat.kerb,'S1_STREET_EDGE_RIGHT');
 // Landscape symbols are plan-indicated palms, not randomly scattered.
 const palmLocations=[
  [left+31.7,top+6.4,1.05],
  [left+40.7,top+3.8,1.12],
  [left+42.3,top+18.3,1.0],
  // Keep the two approach-side palms in LAWN, to the right of the new drive.
  // The second is shifted from the former paved line so its base is not in
  // the vehicle corridor; plantation symbols on S1 are illustrative.
  [left+33.4,top+18.6,.96],
  [left+7.8,top+23.4,.81]
 ];
 for(const [x,z,scale] of palmLocations)palm(root,x,z,surface,scale);
 // Small planting beside the front facade follows the elevations and approved
 // landscape render; keep the bed beyond the required 600 mm splash apron.
 const planterBands=[
  {cx:house.minX+3.1,cz:house.maxZ+1.32,w:5.1,d:.74},
  {cx:house.maxX-2.65,cz:house.maxZ+1.32,w:4.5,d:.74}
 ];
 for(const bedCfg of planterBands){
  const bed=new THREE.Mesh(new THREE.PlaneGeometry(bedCfg.w,bedCfg.d),mat.mulch);
  bed.rotation.x=-Math.PI/2;bed.position.set(bedCfg.cx,surface+.028,bedCfg.cz);
  bed.name='ELEVATION_SUPPORTED_FRONT_PLANTER';root.add(bed);
  box(root,bedCfg.w,.13,.075,bedCfg.cx,surface+.06,bedCfg.cz+bedCfg.d/2,mat.kerb,'FRONT_PLANTER_EDGE');
  for(let i=0;i<4;i++){
   const x=bedCfg.cx-bedCfg.w/2+(i+.5)*bedCfg.w/4,z=bedCfg.cz;
   const plant=new THREE.Mesh(new THREE.SphereGeometry(.32+(i%2)*.05,8,6),i%2?mat.leaf2:mat.leaf);
   plant.scale.y=.67;plant.position.set(x,surface+.27,z);plant.name='S1_FRONT_PLANTING';
   root.add(plant);
  }
 }
 // Plan symbols, presented discreetly and outside the parking driving lane.
 const binX=gateCenterX-5.8,binZ=front-1.8;
 for(let i=0;i<2;i++){
  const bin=box(root,.48,.75,.52,binX+i*.65,surface+.39,binZ,mat.frame,'S1_DUST_BIN');
  box(root,.53,.07,.57,bin.position.x,surface+.80,binZ,mat.coping,'BIN_LID');
 }
 marker(root,gateCenterX+5.1,front-1.35,surface,'FIRE_ASSEMBLY_POINT');
 marker(root,gateCenterX+6.4,front-2.7,surface,'FIRE_HOSE_REEL');
 const bounds=new THREE.Box3(
  new THREE.Vector3(left-origin.x,base,top-origin.z),
  new THREE.Vector3(right-origin.x,9,front-origin.z)
 );
 root.visible=false;
 const gateWorld=new THREE.Vector3(gateCenterX-origin.x,base+1.2,gateZ-origin.z);
 const access={
  gateCenter:[gateCenterX,gateZ],
  longFrontage:{x0:left,x1:right,z:front},
  driveway:{x0:drivewayStartX,x1:drivewayEndX,z0:drivewayMinZ,z1:front},
  turn:{x0:turningCenterX-turningWidth/2,x1:turningCenterX+turningWidth/2,
   z0:turningMinZ,z1:turningMaxZ},
  parking:{x0:parkX,x1:parkX+parkW,z0:parkRear,z1:parkFront},
  approachPalms:palmLocations.slice(2,4).map(([x,z])=>[x,z])
 };
 const summary={siteWidthMetres:48.5,siteDepthMetres:25,parkingBays:3,gateWidthMetres:4,
  gateRoadFacingLongBoundary:true,gateOffsetFromLeftMetres:+(gateCenterX-left).toFixed(2),
  gatePlacement:'client-approved foreground end of road frontage',
  continuousPavingGateToParking:true,longDriveMetres:+(drivewayEndX-drivewayStartX).toFixed(2),
  palmTreesKeptOutsideDrive:2,
  approvedComponents:root.children.length,source:'S1 architectural site layout + client correction',
  alignment:'review-only',originalSurroundingIFCMeshesUnmodified:true};
 return {root,bounds,gate,gateWorld,summary,access,house,
  frontage:[left,right],siteFrontZ:front};
}

/** Classify source objects outside the accepted residence. Never delete BIM. */
export function auditSourceContext(records,belongsToResidence){
 const breakdown={insideResidence:0,replacedSiteCandidates:0,rejectedClutter:0,suppressedSurroundings:0,byCategory:{}};
 for(const record of records){
  if(belongsToResidence(record)){breakdown.insideResidence++;continue;}
  breakdown.suppressedSurroundings++;
  const cat=record.category??'unknown';
  breakdown.byCategory[cat]=(breakdown.byCategory[cat]??0)+1;
  // External source walls/slabs might mark previous gate or paving outlines.
  // Preserve their data for comparison; substitute the explicit S1 site model.
  if(cat==='walls'||cat==='slabs')breakdown.replacedSiteCandidates++;
  else breakdown.rejectedClutter++;
 }
 return breakdown;
}
