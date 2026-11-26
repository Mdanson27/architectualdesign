import * as THREE from 'three';
import {buildClippedFloor} from './phase14abc-flooring.js';

// Phase 15E only: Studio Anne pp.7,8,15,17,19,20.
// Independent review + source-gated architectural overlay API; never creates
// structural partitions, modifies IFC or installs onto an unverified wall.
export const FINISHES15=Object.freeze({'botanical-relief':{pages:[8,20]},'sitting-finishes':{pages:[7,8,15,17]},'dining-finishes':{pages:[7,8,20]}});
export const FINISH15_SPEC=Object.freeze({
 tileSize:.60,skirtingAllowance:.006,skirtingHeight:.09,reliefWidth:1.65,reliefHeight:2.45,
 floor:'porcelain',kitchenFloor:'caramel',palette:'taupe',
 wallCandidates:[
  {guid:'3f10ygYFX3EeQRTHm4CgZl',blockedBy:['0_jbkpuc59BOPaG_zMQH_6'],reason:'wide source doorway, insufficient full-height solid width'},
  {guid:'2axYJRzojAfxQ3W1Phspg0',blockedBy:['3$SsS73oTD9xjTkkK_wxPq','0heo8rPOjCf99YWpmhxp18'],reason:'window, door and projecting return'},
  {guid:'3W5WlUE$1BqgCBut94bgRF',reason:'approved removed sitting/dining divider'},
  {guid:'3FPkqVdN5FXOoauiBi46Ot',reason:'approved removed kitchen/dining divider'}],
 floorRegions:[
  {id:'G-SITTING',polygon:[[112.4,-9.62],[119.73,-9.62],[119.73,-4.89],[112.4,-4.89]]},
  {id:'G-DINING',polygon:[[112.45,-4.42],[117.15,-4.42],[117.15,-.38],[112.45,-.38]]},
  {id:'SITTING_DINING_TRANSITION',polygon:[[112.45,-4.89],[117.15,-4.89],[117.15,-4.42],[112.45,-4.42]]},
  {id:'KITCHEN_DINING_TRANSITION',polygon:[[112.25,-4.36],[112.45,-4.36],[112.45,-.40],[112.25,-.40]]}
 ],
 placementApproved:false
});
const rgb=(r,g,b)=>[r,g,b];
function materialFactory(detail){
 const high=detail==='high',materials=[],textures=[];
 const mat=(name,color,roughness=.8)=>{const m=new THREE.MeshStandardMaterial({name,color,roughness});materials.push(m);return m;};
 function texture(kind){
  const n=high?256:128,b=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n,v=y/n,i=(y*n+x)*4;
   const noise=2*Math.sin(x*15.71+y*19.23)+3*Math.sin(u*16+v*22)+2.8*Math.sin(u*34-v*28);
   const seam=kind==='tile'&&(x<1||y<1||x>=n-1||y>=n-1);
   const c=seam?rgb(165,156,143):kind==='tile'?rgb(207+noise,201+noise,190+noise):rgb(225+noise,218+noise,206+noise);
   b[i]=c[0];b[i+1]=c[1];b[i+2]=c[2];b[i+3]=255;
  }
  const t=new THREE.DataTexture(b,n,n);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.push(t);return t;
 }
 const tile=mat('warm-neutral-matte-porcelain',0xffffff,.62);tile.map=texture('tile');
 const plaster=mat('warm-ivory-mineral-plaster',0xffffff,.93);plaster.map=texture('plaster');
 const relief=mat('ivory-raised-botanical-plaster',0xe4d9c7,.88),paint=mat('soft-warm-taupe-paint',0xc9bcaa,.92),ceiling=mat('warm-white-ceiling',0xeee7dc,.93),trim=mat('recessed-shadow-channel',0x665a4b,.83),skirt=mat('flush-skirting-stone',0xd2c7b5,.65),led=mat('warm-diffuser-2700K-preview',0xffe4bc,.6);led.emissive.setHex(0xffc17c);led.emissiveIntensity=.85;
 return {tile,plaster,relief,paint,ceiling,trim,skirt,led,dispose(){materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
function box(g,name,w,h,d,m,x,y,z){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.name=name;o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;g.add(o);return o;
}
function botanical(g,m,detail){
 // p20: shallow sculpted stems and branching incised/raised veins,
 // low-contrast ivory relief rather than a contrasting botanical painting.
 const w=FINISH15_SPEC.reliefWidth,h=FINISH15_SPEC.reliefHeight;
 box(g,'botanical-plaster-panel',w,h,.025,m.plaster,0,h/2,.015);
 const paths=[
 [[-.53,.07],[-.48,.55],[-.57,1.02],[-.48,1.43],[-.62,2.28]],
 [[-.48,.60],[-.22,.88],[-.14,1.12],[-.25,1.52]],
 [[-.56,1.08],[-.70,1.40],[-.73,1.72]],
 [[-.49,1.43],[-.29,1.76],[-.34,2.14]],
 [[-.13,.07],[-.01,.50],[-.13,.97],[.02,1.43],[.13,2.28]],
 [[-.02,.55],[.25,.84],[.30,1.18]],
 [[-.12,.98],[-.34,1.22],[-.39,1.57]],
 [[.02,1.45],[.28,1.69],[.40,2.12]],
 [[.34,.08],[.48,.58],[.44,1.00],[.60,1.48],[.62,2.27]],
 [[.47,.62],[.20,.93],[.12,1.24]],
 [[.45,1.04],[.70,1.28],[.73,1.67]],
 [[.60,1.48],[.43,1.82],[.38,2.10]]
 ];
 const vertices=[],uv=[],indices=[],n=detail==='high'?48:16,k=detail==='high'?10:6;
 // Half-embedded, tapered relief geometry with connected surface contact.
 for(const points of paths){
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,-.0005)));
  const start=vertices.length/3;
  for(let i=0;i<=n;i++){
   const t=i/n,p=curve.getPointAt(t),tan=curve.getTangentAt(t),normal=new THREE.Vector3(-tan.y,tan.x,0).normalize(),r=.0028+.009*Math.pow(1-t,.75);
   for(let j=0;j<=k;j++){const a=Math.PI*j/k,q=p.clone().addScaledVector(normal,r*Math.cos(a));q.z=.0025-r*.82*Math.sin(a);vertices.push(...q.toArray());uv.push(t,j/k);}
  }
  for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=start+i*(k+1)+j,b=a+k+1;indices.push(a,a+1,b,b,a+1,b+1);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 // The ribbon's winding is normalized to face the room (-Z).
 if(geo.attributes.normal.getZ(Math.floor(k/2))>0){for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geo.setIndex(indices);geo.computeVertexNormals();}
 const r=new THREE.Mesh(geo,m.relief);r.name='sculpted-botanical-branch-relief';r.castShadow=r.receiveShadow=true;g.add(r);
 // Narrow shadow reveals and concealed warm perimeter diffuser, not a new wall.
 for(const x of [-w/2-.026,w/2+.026]){
  box(g,'vertical-shadow-reveal',.036,h+.06,.042,m.trim,x,h/2,.012);
  box(g,'concealed-warm-perimeter-diffuser',.012,h,.012,m.led,x,h/2,-.008);
 }
 for(const y of [-.026,h+.026]){
  box(g,'horizontal-shadow-reveal',w+.09,.036,.042,m.trim,0,y,.012);
  box(g,'concealed-warm-perimeter-diffuser',w,.012,.012,m.led,0,y,-.008);
 }
 g.userData={...g.userData,referencePage:20,fullHeightPanel:true,structuralWall:false,installationBlocked:true};
 return g;
}
function ceilingDetail(g,m,w,d,y,detail){
 // Suspended centre plane and four recessed perimeter cove edges.
 const inset=.20,drop=.065;
 box(g,'continuous-suspended-ceiling-centre',w-2*inset,.035,d-2*inset,m.ceiling,0,y-drop,0);
 for(const z of [-d/2+inset/2,d/2-inset/2]){
  box(g,'ceiling-perimeter-band',w,.035,inset,m.ceiling,0,y,z);
  box(g,'recessed-linear-diffuser',w-2*inset,.012,.018,m.led,0,y-.020,z+(z<0?1:-1)*inset/2);
 }
 for(const x of [-w/2+inset/2,w/2-inset/2]){
  box(g,'ceiling-perimeter-band',inset,.035,d-2*inset,m.ceiling,x,y,0);
  box(g,'recessed-linear-diffuser',.018,.012,d-2*inset,m.led,x+(x<0?1:-1)*inset/2,y-.020,0);
 }
 for(const x of [-w*.23,w*.23])for(const z of [-d*.21,d*.21]){
  const r=new THREE.Mesh(new THREE.RingGeometry(.035,.047,detail==='high'?40:16),m.trim);r.name='recessed-downlight-trim';r.rotation.x=Math.PI/2;r.position.set(x,y-drop-.019,z);g.add(r);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(.035,detail==='high'?40:16),m.led);disk.name='recessed-downlight-diffuser';disk.rotation.x=Math.PI/2;disk.position.set(x,y-drop-.020,z);g.add(disk);
 }
}
export function createPhase15Finishes(id,{detail='high'}={}){
 if(!FINISHES15[id]||!['high','low'].includes(detail))throw Error('Invalid Phase 15E asset');
 const g=new THREE.Group();g.name='PHASE15E_'+id;g.userData={assetId:id,detail,clientApproved:false,isolatedReview:true};
 const m=materialFactory(detail);
 if(id==='botanical-relief')botanical(g,m,detail);
 else{
  // Standalone finish mock-up, explicitly NOT the measured house.
  const w=2.7,d=2.2,y=2.7;
  const f=new THREE.PlaneGeometry(w,d);f.rotateX(-Math.PI/2);const uv=f.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/.60,uv.getY(i)*d/.60);
  const floor=new THREE.Mesh(f,m.tile);floor.name='continuous-porcelain-review-floor';floor.receiveShadow=true;g.add(floor);
  box(g,'review-backing-plaster',w,y,.065,id==='sitting-finishes'?m.plaster:m.paint,0,y/2,d/2);
  box(g,'flush-skirting-6mm-allowance',w,.09,.006,m.skirt,0,.045,d/2-.0355);
  if(id==='sitting-finishes'){
   box(g,'ivory-media-backing-sample',2.10,1.72,.018,m.plaster,0,1.38,d/2-.042);
  }else{
   const relief=new THREE.Group();relief.name='BOTANICAL_REVIEW_ASSEMBLY';relief.position.set(0,.09,d/2-.075);botanical(relief,m,detail);g.add(relief);
  }
  const ceil=new THREE.Group();ceil.name='CEILING_REVIEW_ASSEMBLY';ceilingDetail(ceil,m,w,d,y,detail);g.add(ceil);
  g.userData.ceilingReviewHeight=y;
 }
 g.userData.dispose=()=>{g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});m.dispose();};
 return g;
}
export function finishesStats(g){
 g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g,true);let triangles=0,meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {id:g.userData.assetId,detail:g.userData.detail,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes};
}
// Integration-ready source-gated floors. Explicit scope and shared absolute
// tile grid preserve visual continuity across both room boundaries. No overlaps
// with kitchen (x<112.25) and no collision/floor height changes.
export function createPhase15SourceFloors({origin={x:0,z:0},floorSampler,detail='high'}){
 if(typeof floorSampler!=='function')throw Error('Actual source floor sampler required');
 const root=new THREE.Group(),m=materialFactory(detail),regions=[];
 root.name='PHASE15E_SOURCE_SUPPORTED_FINISHES';root.userData={installationApproved:false};
 for(const spec of FINISH15_SPEC.floorRegions){
  const q=buildClippedFloor({polygon:spec.polygon,origin,step:.60,sample:floorSampler,datum:0,uvScale:.60,offset:.014});
  regions.push({id:spec.id,area:q.polygonArea,supported:q.supportedArea,unverified:q.skippedArea,cells:q.cells});
  if(q.cells){const o=new THREE.Mesh(q.geometry,m.tile);o.name='PHASE15E_FLOOR_'+spec.id;o.receiveShadow=true;root.add(o);}else q.geometry.dispose();
 }
 root.userData.dispose=()=>{root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});m.dispose();};
 return {root,regions,sourceGeometryModified:false,liveInstalled:false};
}
// The p20 panel must never be fixed over a window, door or approved open bay.
// Caller supplies independently verified uninterrupted source wall evidence.
export function canInstallBotanicalPanel({uninterruptedWidth,uninterruptedHeight,sourceWallVisible,openingIntersects,sourceSurfaceProbesPassed,clientApproved}={}){
 return sourceWallVisible===true&&openingIntersects===false&&sourceSurfaceProbesPassed===true&&clientApproved===true&&uninterruptedWidth>=1.75&&uninterruptedHeight>=2.55;
}

// Entire ceiling overlay is refused when any source sample is missing or
// inconsistent. No lowering of the walkable architectural collision shell.
export function createPhase15SourceCeilings({origin={x:0,z:0},ceilingSampler,detail='high'}){
 if(typeof ceilingSampler!=='function')throw Error('Actual source ceiling sampler required');
 const root=new THREE.Group(),m=materialFactory(detail),regions=[];
 root.name='PHASE15E_SOURCE_SUPPORTED_CEILINGS';root.userData={installationApproved:false,hideInSection:true};
 for(const spec of FINISH15_SPEC.floorRegions.slice(0,2)){
  const xs=spec.polygon.map(p=>p[0]),zs=spec.polygon.map(p=>p[1]),x0=Math.min(...xs)+.10,x1=Math.max(...xs)-.10,z0=Math.min(...zs)+.10,z1=Math.max(...zs)-.10;
  const nx=Math.ceil((x1-x0)/.40),nz=Math.ceil((z1-z0)/.40),heights=[];let rejected=0;
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const y=ceilingSampler(x0+(x1-x0)*i/nx-(origin.x||0),z0+(z1-z0)*j/nz-(origin.z||0),0)?.y;
   if(!Number.isFinite(y)||y<2.50||y>3.65)rejected++;else heights.push(y);
  }
  const variation=heights.length?Math.max(...heights)-Math.min(...heights):null;
  const accepted=!rejected&&variation!==null&&variation<=.035;
  regions.push({id:spec.id,accepted,probes:heights.length+rejected,rejected,variation,sourceHeight:heights.length?Math.min(...heights):null});
  if(!accepted)continue;
  const g=new THREE.Group();g.name='PHASE15E_CEILING_'+spec.id;g.position.set((x0+x1)/2-(origin.x||0),0,(z0+z1)/2-(origin.z||0));
  ceilingDetail(g,m,x1-x0,z1-z0,Math.min(...heights)-.035,detail);root.add(g);
 }
 root.userData.dispose=()=>{root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});m.dispose();};
 return {root,regions,sourceGeometryModified:false,liveInstalled:false};
}
