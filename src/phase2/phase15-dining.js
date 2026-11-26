import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Studio Anne p20: furniture only. Room wall relief and pendant are 15E/G.
// Canonical front = local -Z. No old scene geometry is mutated here.
export const DINING15=Object.freeze({'dining-chair':{pages:[20]},'dining-table':{pages:[20]},'six-seat-set':{pages:[20]}});
export const DINING15_PLAN=Object.freeze({centre:[114.80,-2.25],bounds:[112.45,117.15,-4.42,-.38],table:[2.06,.77,1.02],pullOutTarget:.90,trialPullOut:.45,poses:[[-.51,-.85], [.51,-.85],[-.51,.85],[.51,.85],[-1.36,0],[1.36,0]]});
export function diningYaw(x,z,tx,tz){return Math.atan2(x-tx,z-tz);}
const signedPow=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);
export function createPhase15Dining(id,{detail='high'}={}){
 if(!DINING15[id]||!['high','low'].includes(detail))throw Error('Invalid dining asset');
 const high=detail==='high',root=new THREE.Group();root.name='PHASE15D_'+id;root.userData={assetId:id,detail,forward:[0,0,-1],briefPage:20,clientApproved:false};
 const materials=[],textures=[];
 const mat=(name,c,r)=>{const m=new THREE.MeshStandardMaterial({name,color:c,roughness:r});materials.push(m);return m;};
 function grain(){
  const n=high?128:64,d=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n,v=y/n,k=(y*n+x)*4,a=10*Math.sin(u*105+Math.sin(v*7)*1.5)+4*Math.sin(u*240+v*3)+2*Math.sin(x*13+y*17);d[k]=91+a;d[k+1]=64+a*.78;d[k+2]=45+a*.60;d[k+3]=255;}
  const t=new THREE.DataTexture(d,n,n);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;textures.push(t);return t;
 }
 const wood=mat('warm-dark-walnut',0xffffff,.52);wood.map=grain();
 const topWood=mat('polished-dark-walnut-top',0xffffff,.40);topWood.map=wood.map;
 const fabric=mat('warm-taupe-woven-upholstery',0x9c8976,.94),seam=mat('taupe-piping',0x877462,.95),foot=mat('recessed-dark-foot',0x362820,.78);
 function mesh(g,name,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
 function rounded(g,name,w,h,d,r,m,x,y,z){return mesh(g,name,new RoundedBoxGeometry(w,h,d,high?4:2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);}
 function surface(g,name,p,uv,ix,m){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();return mesh(g,name,geo,m);}
 function tube(g,name,points,r,m,closed=false){return mesh(g,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),high?48:16,r,high?8:5,closed),m);}
 function leg(g,name,a,b,r0,r1){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);
  const o=mesh(g,name,new THREE.CylinderGeometry(r1,r0,v.length(),high?16:8),wood,...A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;
 }
 // Broad, gently rounded seat cushion; a distinct seat and a padded inner back.
 function cushion(g,name,w,h,d,x,y,z,ex=.48,ey=.52){
  const n=high?48:20,m=high?24:12,p=[],uv=[],ix=[];
  for(let j=0;j<=m;j++){const t=-Math.PI/2+j*Math.PI/m;for(let i=0;i<=n;i++){const a=i*2*Math.PI/n,c=signedPow(Math.cos(t),ey);p.push(x+w/2*c*signedPow(Math.cos(a),ex),y+h/2*signedPow(Math.sin(t),ey),z+d/2*c*signedPow(Math.sin(a),ex));uv.push(i/n,j/m);}}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
  return surface(g,name,p,uv,ix,fabric);
 }
 function chair(){
  const g=new THREE.Group();g.name='DINING_CHAIR';g.userData={forward:[0,0,-1]};
  // Four slender tapered splayed legs, back posts reaching the timber shell.
  for(const a of [-1,1]){
   leg(g,'tapered-front-leg',[a*.232,.013,-.246],[a*.196,.438,-.186],.011,.025);
   leg(g,'tapered-rear-leg',[a*.236,.013,.248],[a*.199,.444,.181],.011,.025);
   for(const z of [-.246,.248])mesh(g,'floor-contact-foot',new THREE.CylinderGeometry(.011,.012,.014,8),foot,a*(z<0?.232:.236),.007,z);
   tube(g,'continuous-rear-upright',[[a*.199,.408,.181],[a*.223,.53,.19],[a*.229,.67,.16]],.023,wood);
  }
  rounded(g,'rounded-timber-seat-frame',.485,.052,.50,.025,wood,0,.429,-.012);
  cushion(g,'seat-landmark',.496,.119,.493,0,.50,-.021,.39,.48);
  const ring=[];for(let i=0;i<40;i++){const a=i*2*Math.PI/40;ring.push([.246*signedPow(Math.cos(a),.39),.492,-.021+.245*signedPow(Math.sin(a),.39)]);}tube(g,'seat-tailored-piping',ring,.0025,seam,true);
  // Wraparound bent timber from low front arms to high curved rear.
  // Bottom rises at the rear, deliberately retaining the open lower back.
  const path=[[-.248,-.16],[-.253,-.045],[-.244,.11],[-.19,.214],[-.10,.252],[0,.264],[.10,.252],[.19,.214],[.244,.11],[.253,-.045],[.248,-.16]];
  const curve=new THREE.CatmullRomCurve3(path.map(([x,z])=>new THREE.Vector3(x,0,z)));
  const n=high?100:36,ringN=high?16:8,p=[],uv=[],ix=[];
  for(let i=0;i<=n;i++){const t=i/n,c=curve.getPointAt(t),v=curve.getTangentAt(t),normal=new THREE.Vector3(-v.z,0,v.x).normalize(),a=Math.sin(Math.PI*t),lo=.495+.177*Math.pow(a,.75),hi=.592+.308*Math.pow(a,.72);
   for(let j=0;j<=ringN;j++){const q=2*Math.PI*j/ringN,d=c.clone().addScaledVector(normal,.017*signedPow(Math.cos(q),.47));d.y=(lo+hi)/2+(hi-lo)/2*signedPow(Math.sin(q),.40);p.push(...d.toArray());uv.push(t,j/ringN);}
  }
  for(let i=0;i<n;i++)for(let j=0;j<ringN;j++){const a=i*(ringN+1)+j,b=a+ringN+1;ix.push(a,b,a+1,b,b+1,a+1);}
  for(const end of [0,n]){const a=end*(ringN+1),c=p.length/3;let x=0,y=0,z=0;for(let j=0;j<ringN;j++){x+=p[(a+j)*3];y+=p[(a+j)*3+1];z+=p[(a+j)*3+2];}p.push(x/ringN,y/ringN,z/ringN);uv.push(end/n,.5);for(let j=0;j<ringN;j++)ix.push(...(end===0?[c,a+j,a+j+1]:[c,a+j+1,a+j]));}
  surface(g,'continuous-curved-timber-wrap',p,uv,ix,wood);
  cushion(g,'backrest-landmark',.385,.226,.088,0,.785,.216,.63,.55);
  // Support the descending front arm without filling the back aperture.
  for(const a of [-1,1])tube(g,'slender-arm-to-seat-joint',[[a*.222,.435,-.166],[a*.244,.49,-.165],[a*.248,.56,-.16]],.017,wood);
  return g;
 }
 function pedestal(g,x){
  const n=high?128:48,rows=high?36:16,p=[],uv=[],ix=[],h=.715;
  // Broad bottom and upper crown separated by a pronounced smooth waist,
  // real vertical flutes on both detail levels (rather than painted stripes).
  for(let j=0;j<=rows;j++){const t=j/rows,waist=.58;
   const f=t<waist?Math.cos(t/waist*Math.PI/2):Math.sin((t-waist)/(1-waist)*Math.PI/2);
   const radius=.082+(t<waist?.178:.135)*Math.pow(Math.max(0,f),.88);
   for(let i=0;i<=n;i++){const a=i*2*Math.PI/n,r=radius-(high?.009:.005)*(.5+.5*Math.cos(a*(high?32:16)));p.push(x+r*Math.cos(a),.007+h*t,r*Math.sin(a));uv.push(i/n,t);}
  }
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
  for(const row of [0,rows]){const c=p.length/3;p.push(x,.007+h*row/rows,0);uv.push(.5,.5);for(let i=0;i<n;i++){const a=row*(n+1)+i;ix.push(...(row===0?[c,a,a+1]:[c,a+1,a]));}}
  surface(g,'fluted-hourglass-pedestal',p,uv,ix,wood);
  mesh(g,'pedestal-recessed-foot',new THREE.CylinderGeometry(.249,.249,.009,high?48:24),foot,x,.0045,0);
 }
 function table(){
  const g=new THREE.Group();g.name='DINING_TABLE';
  pedestal(g,-.54);pedestal(g,.54);
  const n=high?96:32,shape=new THREE.Shape(),w=2.04,d=1.00,h=.048;
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n,r=1+.018*Math.sin(3*a+.4),x=w/2*signedPow(Math.cos(a),.72)*r,z=d/2*signedPow(Math.sin(a),.72)*r;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}
  shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:h-.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:high?3:1,steps:1,curveSegments:1});geo.rotateX(-Math.PI/2);geo.translate(0,-(h-.012)/2,0);
  const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getZ(i)/d+.5,p.getX(i)/w+.5);
  mesh(g,'rounded-dark-timber-tabletop',geo,topWood,0,.746,0);
  return g;
 }
 if(id==='dining-chair')root.add(chair());
 if(id==='dining-table')root.add(table());
 if(id==='six-seat-set'){
  root.add(table());
  for(const [i,[x,z]] of DINING15_PLAN.poses.entries()){const g=chair();g.name='DINING_CHAIR_'+(i+1);g.position.set(x,0,z);const target=Math.abs(z)>.5?[x,0]:[0,0];g.rotation.y=diningYaw(x,z,...target);g.userData.target=target;root.add(g);}
 }
 root.userData.dispose=()=>{root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
 return root;
}
export function diningStats(g){
 g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g,true);let triangles=0,meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {id:g.userData.assetId,detail:g.userData.detail,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes};
}
// Conservative clearance against the mapped rectangular plan; not a surveyed
// clearance or a live collision test. Retain deficit rather than certify it.
export function diningClearance(g){
 g.updateWorldMatrix(true,true);const [cx,cz]=DINING15_PLAN.centre,[xmin,xmax,zmin,zmax]=DINING15_PLAN.bounds;
 const b=o=>new THREE.Box3().setFromObject(o,true),t=b(g.getObjectByName('DINING_TABLE')),rows=[];
 for(const c of g.children.filter(o=>/^DINING_CHAIR_/.test(o.name))){
  const box=b(c),f=new THREE.Vector3(0,0,-1).transformDirection(c.matrixWorld);
  const rear=f.x>.5?box.min.x+cx-xmin:f.x<-.5?xmax-(box.max.x+cx):f.z>.5?box.min.z+cz-zmin:zmax-(box.max.z+cz);
  const frontGap=f.x>.5?t.min.x-box.max.x:f.x<-.5?box.min.x-t.max.x:f.z>.5?t.min.z-box.max.z:box.min.z-t.max.z;
  rows.push({id:c.name,rearClearance:rear,frontGap,trialPullOutFits:rear>=DINING15_PLAN.trialPullOut,preferredClearanceMet:rear>=DINING15_PLAN.pullOutTarget,worldBounds:[box.min.x+cx,box.max.x+cx,box.min.z+cz,box.max.z+cz]});
 }
 return {centre:[cx,cz],rows,preferredClearanceMet:rows.every(r=>r.preferredClearanceMet),liveClearanceCertified:false,sourceFloorVerified:false};
}
