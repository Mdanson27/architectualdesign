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
 gatePlacement:'client-approved palm-tree-side long fence near foreground corner; direct straight driveway',
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

 // Client-approved updated visualization (21 Nov):
 // - Site's right-hand / palm-tree-side long fence corresponds to z=top.
 // - The 4m sliding gate belongs toward the foreground end of that fence.
 // - A STRAIGHT, vehicle-width approach crosses the green side setback
 //   directly into a substantial parking court beside/in front of the house.
 // - Parking must be generous but NEVER cover half the outdoor compound.
 // - Lawn continues across the entire foreground and alongside the driveway.
 // All geometry is viewer-only: source IFC remains unchanged.
 const gateCenterX=right-11.20,gateZ=top;
 const driveWidth=4.60;
 // The previous court stopped 0.40m short of the driveway's outer edge.
 // Match the entire right-hand edge precisely so the paving / kerb runs
 // straight from the gate to the far side of the parking court.
 const parkX=house.maxX+1.35,parkRight=gateCenterX+driveWidth/2;
 const parkRear=top+8.20,parkFront=front-.85;
 const parkW=parkRight-parkX,parkDepth=parkFront-parkRear;
 const footprint=(house.maxX-house.minX)*(house.maxZ-house.minZ);
 const outdoorArea=sitePlan.width*sitePlan.depth-footprint;
 const parkArea=parkW*parkDepth;
 // Vehicle access is centered on the 4m gate and passes through the
 // 7–8m right-side lawn setback. It overlaps the court's rear-right edge,
 // guaranteeing a continuous paved route instead of a broken L-shaped path.
 const driveX0=gateCenterX-driveWidth/2,
  driveX1=gateCenterX+driveWidth/2;
 const driveZ0=top+.12,driveZ1=parkRear+.55;
 const driveArea=driveWidth*(driveZ1-driveZ0);
 const overlapArea=Math.max(0,Math.min(driveX1,parkRight)-Math.max(driveX0,parkX))*
  Math.max(0,Math.min(driveZ1,parkFront)-Math.max(driveZ0,parkRear));
 const totalPavedArea=parkArea+driveArea-overlapArea;
 const totalPavingOutdoorCoverage=100*totalPavedArea/outdoorArea;
 if(parkW<15||parkDepth<13||totalPavingOutdoorCoverage>=50||
    totalPavingOutdoorCoverage<25)
  throw Error('Parking must be spacious but preserve the majority of the lawn.');
 if(!(gateCenterX>parkX&&gateCenterX<parkRight&&driveX0<parkRight))
  throw Error('Gate and straight driveway must enter the parking court.');
 slab(root,mat.paving,parkX+parkW/2,(parkRear+parkFront)/2,
  parkW,parkDepth,surface+.018,'S1_PAVED_PARKING_COURT');
 slab(root,mat.paving,gateCenterX,(driveZ0+driveZ1)/2,
  driveWidth,driveZ1-driveZ0,surface+.027,'S1_STRAIGHT_GATE_DRIVEWAY');
 // The three plan-marked bays remain visible within the larger paved court.
 const baysX=parkX+.55,baysZ0=parkRear+.48,baysZ1=parkFront-1.15;
 slab(root,mat.paving,baysX+sitePlan.parkingCount*sitePlan.parkingBayWidth/2,
  (baysZ0+baysZ1)/2,sitePlan.parkingCount*sitePlan.parkingBayWidth,
  baysZ1-baysZ0,surface+.029,'S1_PAVED_PARKING_THREE_BAYS');
 for(let i=1;i<sitePlan.parkingCount;i++){
  strip(root,[baysX+i*sitePlan.parkingBayWidth,baysZ0+.20],
   [baysX+i*sitePlan.parkingBayWidth,baysZ1-.20],
   .055,.014,surface+.036,mat.mark,'PARKING_BAY_SEPARATOR');
 }
 // Low edge kerbs define lawn vs pavement. Never block the entrance or
 // the transition between the straight driveway and the parking court.
 const kerbY=surface+.029;
 // One uninterrupted straight kerb: do not join two separate offset
 // parking / driveway kerbs or double-stack them in the overlap.
 box(root,.11,.10,parkFront-driveZ0-.55,driveX1+.06,kerbY,
  (driveZ0+parkFront)/2,mat.kerb,'PAVED_AND_DRIVE_RIGHT_KERB');
 box(root,.11,.10,parkDepth-.10,parkX-.06,kerbY,
  (parkRear+parkFront)/2,mat.kerb,'PAVED_AREA_LEFT_KERB');
 const rearLeftWidth=driveX0-parkX-.17;
 if(rearLeftWidth>.2)
  box(root,rearLeftWidth,.10,.10,parkX+rearLeftWidth/2,
   kerbY,parkRear-.06,mat.kerb,'PAVED_AREA_REAR_KERB_LEFT');
 box(root,.10,.10,driveZ1-driveZ0-.55,driveX0-.06,kerbY,
  (driveZ0+driveZ1)/2,mat.kerb,'DRIVEWAY_LAWN_KERB_LEFT');
 // The former short DRIVEWAY_LAWN_KERB_RIGHT is replaced by the single
 // PAVED_AND_DRIVE_RIGHT_KERB above. No hard jog at the parking join.


 // One 600x600x50mm splash apron row is explicitly required by note 9.
 const apron=.6,pad=.18;
 const ext={x0:house.minX-pad,x1:house.maxX+pad,z0:house.minZ-pad,z1:house.maxZ+pad};
 slab(root,mat.paving,(ext.x0+ext.x1)/2,ext.z0-apron/2,ext.x1-ext.x0+2*apron,apron,surface+.027,'S1_SPLASH_APRON_NORTH');
 slab(root,mat.paving,(ext.x0+ext.x1)/2,ext.z1+apron/2,ext.x1-ext.x0+2*apron,apron,surface+.027,'S1_SPLASH_APRON_SOUTH');
 slab(root,mat.paving,ext.x0-apron/2,(ext.z0+ext.z1)/2,apron,ext.z1-ext.z0,surface+.027,'S1_SPLASH_APRON_WEST');
 slab(root,mat.paving,ext.x1+apron/2,(ext.z0+ext.z1)/2,apron,ext.z1-ext.z0,surface+.027,'S1_SPLASH_APRON_EAST');

 // Right-hand palm-tree-side boundary (z=top) now holds the gate. The
 // previous opening on the opposite perimeter is sealed with full fencing.
 const gateHalf=sitePlan.gateWidth/2;
 buildFence(root,boundary[0],[gateCenterX-gateHalf-.22,top],base);
 buildFence(root,[gateCenterX+gateHalf+.22,top],boundary[1],base);
 for(let i=1;i<boundary.length-1;i++)buildFence(root,boundary[i],boundary[i+1],base);
 buildFence(root,boundary[4],boundary[0],base);
 const gate=createSlideGate(root,gateCenterX,gateZ,base);
 // The access road is outside the new gate-side fence, not the former side.
 const roadWidth=5.0;
 box(root,sitePlan.width-.40,.07,roadWidth,
  (left+right)/2,surface-.04,top-roadWidth/2-.17,mat.road,
  'S1_ACCESS_ROAD_REFERENCE');
 const roadKerbLeftEnd=gateCenterX-gateHalf-.28,
  roadKerbRightStart=gateCenterX+gateHalf+.28;
 box(root,roadKerbLeftEnd-left,.13,.14,
  (left+roadKerbLeftEnd)/2,surface+.02,top-.18,mat.kerb,
  'S1_STREET_EDGE_LEFT');
 box(root,right-roadKerbRightStart,.13,.14,
  (right+roadKerbRightStart)/2,surface+.02,top-.18,mat.kerb,
  'S1_STREET_EDGE_RIGHT');
 // Keep palms in the large FRONT lawn as illustrated; none may stand
 // in the gate opening, straight driveway or paved parking court.
 const palmLocations=[
  [right-4.65,top+3.45,.86],
  [right-4.45,top+13.20,1.03],
  [right-4.80,front-3.0,.97]
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
 // Fire point and two dust bins stay on the grass, away from vehicle
 // entrances and the three source-plan parking bays.
 const binX=left+7.2,binZ=front-1.25;
 for(let i=0;i<2;i++){
  const bin=box(root,.48,.75,.52,binX+i*.65,surface+.39,
   binZ,mat.frame,'S1_DUST_BIN');
  box(root,.53,.07,.57,bin.position.x,surface+.80,
   binZ,mat.coping,'BIN_LID');
 }
 marker(root,parkRight+1.62,parkRear+3.2,surface,'FIRE_ASSEMBLY_POINT');
 marker(root,parkRight+1.62,parkRear+5.1,surface,'FIRE_HOSE_REEL');
 const bounds=new THREE.Box3(
  new THREE.Vector3(left-origin.x,base,top-origin.z),
  new THREE.Vector3(right-origin.x,9,front-origin.z)
 );
 root.visible=false;
 const gateWorld=new THREE.Vector3(gateCenterX-origin.x,base+1.2,gateZ-origin.z);
 const access={
  gateCenter:[gateCenterX,gateZ],
  gateBoundary:'palm-tree-side long fence (z=top)',
  longFrontage:{x0:left,x1:right,z:top},
  driveway:{x0:driveX0,x1:driveX1,z0:driveZ0,z1:driveZ1},
  turn:{x0:driveX0,x1:driveX1,z0:parkRear,z1:driveZ1},
  parking:{x0:parkX,x1:parkRight,z0:parkRear,z1:parkFront},
  designatedBays:{x0:baysX,x1:baysX+sitePlan.parkingCount*sitePlan.parkingBayWidth,
    z0:baysZ0,z1:baysZ1},
  palms:palmLocations.map(([x,z])=>[x,z]),
  removedOldGatePalms:2
 };
 const summary={
  siteWidthMetres:48.5,siteDepthMetres:25,
  parkingBays:3,gateWidthMetres:4,
  gateOnPalmTreeSideFence:true,
  oldGateBoundaryRestored:true,
  gateDistanceFromForegroundCornerMetres:+(right-gateCenterX).toFixed(2),
  gateOffsetFromLeftMetres:+(gateCenterX-left).toFixed(2),
  gatePlacement:'palm-tree-side fence near foreground corner, approved layout',
  straightDrivewayToParking:true,
  straightPavingOuterEdge:true,
  driveCourtRightEdgeOffsetMetres:+(parkRight-driveX1).toFixed(3),
  continuousPavingGateToParking:true,
  drivewayWidthMetres:driveWidth,
  parkingAreaSquareMetres:+parkArea.toFixed(1),
  parkingOutdoorCoverage:+(100*parkArea/outdoorArea).toFixed(1),
  totalPavingOutdoorCoverage:+totalPavingOutdoorCoverage.toFixed(1),
  lawnOutdoorCoverageApprox:+(100-totalPavingOutdoorCoverage).toFixed(1),
  removedOldGatePalmTrees:2,palmTreesPreserved:3,
  approvedComponents:root.children.length,
  source:'S1 architectural site layout + client-approved 21 Nov visualization',
  alignment:'review-only',
  originalSurroundingIFCMeshesUnmodified:true
 };
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
