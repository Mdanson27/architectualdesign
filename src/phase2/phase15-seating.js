import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Studio Anne p14: original reference-driven models, ground sitting room only.
// All front directions are local -Z. Dimensions are proposals, not product specs.
export const SEATING15=Object.freeze({
 'main-sofa':{width:2.42,depth:1.01,height:.90,reference:14},
 'rest-sofa':{width:1.79,depth:1.02,height:.89,reference:14},
 'accent-chair':{width:.80,depth:.81,height:.94,reference:14}
});
const pow=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);
export function createPhase15Seating(id,{detail='high'}={}){
 if(!SEATING15[id]||!['high','low'].includes(detail))throw Error('Unknown Phase 15 seating variant');
 const high=detail==='high',g=new THREE.Group();g.name='PHASE15_'+id;
 g.userData={assetId:id,detail,briefPage:14,forward:[0,0,-1],clientApproved:false};
 // Shared, tiny procedural fabric grain (not a photograph). UV repeat is
 // intentionally small enough to avoid large visible noise.
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,v=224+Math.round(9*Math.sin(x*Math.PI/2)+7*Math.sin(y*Math.PI/2)+4*Math.sin(x*13+y*17));
  data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const fabric=new THREE.DataTexture(data,size,size);fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(5,5);fabric.magFilter=THREE.LinearFilter;fabric.minFilter=THREE.LinearMipmapLinearFilter;fabric.generateMipmaps=true;fabric.needsUpdate=true;
 const cloth=c=>new THREE.MeshStandardMaterial({color:c,roughness:.96,bumpMap:high?fabric:null,bumpScale:.0012});
 const ivory=cloth(0xddd1bf),cream=cloth(0xe8dfd0),taupe=cloth(0x8f7b67),olive=cloth(0x777847),oliveDark=cloth(0x65663d),walnut=new THREE.MeshStandardMaterial({color:0x563b2c,roughness:.55}),piping=cloth(0x625449),throwMat=cloth(0x9b8e7d);
 const materials=[ivory,cream,taupe,olive,oliveDark,walnut,piping,throwMat];
 function add(name,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData={phase15Asset:id,component:name};g.add(m);return m;}
 function rounded(name,w,h,d,r,mat,x,y,z){return add(name,new RoundedBoxGeometry(w,h,d,high?5:2,Math.min(r,w/2,h/2,d/2)),mat,x,y,z);}
 // Smooth tailored cushion surface with broad faces and softened corners.
 function cushion(name,w,h,d,mat,x,y,z,ex=.48,ey=.65){
  const n=high?40:20,m=high?24:12,p=[],uv=[],ix=[];
  for(let j=0;j<=m;j++){const t=-Math.PI/2+j*Math.PI/m;for(let i=0;i<=n;i++){const a=i*Math.PI*2/n,ct=pow(Math.cos(t),ey);p.push(w/2*ct*pow(Math.cos(a),ex),h/2*pow(Math.sin(t),ey),d/2*ct*pow(Math.sin(a),ex));uv.push(i/n,j/m);}}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();return add(name,geo,mat,x,y,z);
 }
 function tube(name,pts,r,mat,closed=false){return add(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),closed),high?64:24,r,high?8:5,closed),mat);}
 // Upholstered curved vertical shell. Cross section is a rounded rectangle;
 // exterior ribs are true displaced geometry rather than painted stripes.
 function shell(name,path,top,bottom,thickness,mat,{ribs=0,segments=72}={}){
  const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(p[0],0,p[1])));
  const n=high?segments:Math.max(20,Math.round(segments/3)),ring=high?20:10,p=[],uv=[],ix=[];
  for(let i=0;i<=n;i++){
   const t=i/n,c=curve.getPointAt(t),v=curve.getTangentAt(t),normal=new THREE.Vector3(-v.z,0,v.x).normalize(),h=top(t);
   for(let j=0;j<=ring;j++){
    const a=2*Math.PI*j/ring,cs=pow(Math.cos(a),.45),sn=pow(Math.sin(a),.50);
    const rib=high&&ribs?.0045*(1+Math.cos(2*Math.PI*ribs*t))*Math.max(0,-cs):0;
    const q=c.clone().addScaledVector(normal,cs*(thickness/2+rib));q.y=(h+bottom)/2+sn*(h-bottom)/2;p.push(...q.toArray());uv.push(t,j/ring);
   }
  }
  for(let i=0;i<n;i++)for(let j=0;j<ring;j++){const a=i*(ring+1)+j,b=a+ring+1;ix.push(a,a+1,b,b,a+1,b+1);}
  for(const end of [0,n]){const a=end*(ring+1),c=p.length/3;let x=0,y=0,z=0;for(let j=0;j<ring;j++){x+=p[(a+j)*3];y+=p[(a+j)*3+1];z+=p[(a+j)*3+2];}p.push(x/ring,y/ring,z/ring);uv.push(end/n,.5);for(let j=0;j<ring;j++)ix.push(...(end===0?[c,a+j+1,a+j]:[c,a+j,a+j+1]));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
  return add(name,geo,mat);
 }
 // Floor-hugging sofa shell with distinct timber surround and three pillows.
 if(id==='main-sofa'){
  rounded('walnut-recessed-plinth',2.25,.085,.83,.035,walnut,0,.045,.035);
  const outline=[[-1.12,-.39],[-1.12,.15],[-1.02,.36],[-.73,.43],[0,.44],[.73,.43],[1.02,.36],[1.12,.15],[1.12,-.39]];
  shell('continuous-walnut-outer-wrap',outline,t=>.63+.12*Math.sin(Math.PI*t),.025,.105,walnut,{segments:84});
  const inside=outline.map(([x,z])=>[x*.94,z*.91]);
  shell('enveloping-upholstered-arms-and-back',inside,t=>.75+.13*Math.sin(Math.PI*t),.11,.215,ivory,{segments:84});
  rounded('upholstered-seat-deck',2.00,.28,.84,.12,ivory,0,.25,-.015);
  for(let i=0;i<3;i++){
   const x=(i-1)*.655;
   cushion('individual-seat-cushion-'+(i+1),.65,.26,.74,ivory,x,.43,-.055,.35,.62);
  }
  cushion('backrest-landmark',1.99,.46,.24,ivory,0,.65,.31,.38,.67);
  for(const side of [-1,1]){
   const p=cushion('loose-pillow-'+side,.36,.39,.16,side<0?cream:taupe,side*.81,.65,.15,.65,.75);p.rotation.z=side*.19;p.rotation.x=-.13;
  }
 }
 if(id==='rest-sofa'){
  // Asymmetrical plan: one rounded open end and a rising curved back,
  // not a sectional or a mirrored copy of the main sofa.
  cushion('continuous-rounded-rest-base',1.78,.31,.98,cream,0,.18,0,.56,.47);
  cushion('single-rest-seat',1.72,.22,.92,cream,0,.43,-.035,.54,.58);
  const path=[[-.78,.25],[-.52,.38],[-.16,.43],[.25,.42],[.57,.32],[.75,.12],[.78,-.19]];
  shell('asymmetric-crescent-backrest',path,t=>.53+.33*Math.sin(Math.PI*t*.91),.28,.15,cream,{segments:72});
  // Dark contour piping follows the upholstered base perimeter.
  const pts=[];for(let i=0;i<32;i++){const a=2*Math.PI*i/32;pts.push([.883*pow(Math.cos(a),.56),.295,.48*pow(Math.sin(a),.56)]);}tube('dark-contour-piping',pts,.005,piping,true);
  const p=cushion('backrest-landmark',.30,.35,.14,taupe,.34,.65,.25,.6,.7);p.rotation.z=-.11;
  cushion('second-loose-pillow',.27,.31,.13,throwMat,.09,.63,.30,.56,.7);
  // One continuous folded textile surface following the open end and front.
  const nu=high?20:10,nv=high?28:14,verts=[],uv=[],ix=[];
  for(let j=0;j<=nv;j++){const t=j/nv;for(let i=0;i<=nu;i++){const u=i/nu,x=-.56+(u-.5)*.34,theta=t*Math.PI*.57,z=.21-.74*Math.sin(theta),y=.548-Math.max(0,t-.58)*.94+.009*Math.sin(u*Math.PI*9);verts.push(x,y,z);uv.push(u,t);}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;ix.push(a,b,a+1,b,b+1,a+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();throwMat.side=THREE.DoubleSide;add('draped-folded-throw',geo,throwMat);
 }
 if(id==='accent-chair'){
  rounded('hidden-floor-plinth',.63,.045,.61,.022,oliveDark,0,.023,.025);
  cushion('floor-hugging-upholstered-base',.68,.37,.67,olive,0,.225,-.014,.44,.57);
  const path=[[-.34,-.28],[-.345,-.06],[-.29,.23],[-.16,.32],[0,.35],[.16,.32],[.29,.23],[.345,-.06],[.34,-.28]];
  shell('vertically-ribbed-wraparound-shell',path,t=>.67+.255*Math.sin(Math.PI*t),.035,.105,olive,{ribs:60,segments:360});
  cushion('deep-seat-cushion',.63,.19,.63,olive,0,.45,-.045,.40,.65);
  const p=cushion('backrest-landmark',.48,.37,.18,oliveDark,0,.68,.205,.62,.68);p.rotation.x=-.15;
 }
 // Anchor ground at y=0, preserve scale and orientation; no envelope
 // stretching or reflected geometry is permitted.
 g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g,true);
 for(const m of g.children)m.position.y-=b.min.y;
 g.updateMatrixWorld(true);
 g.userData.dispose=()=>{g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());fabric.dispose();};
 return g;
}
export function seatingStats(g){
 g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g,true);
 let triangles=0;g.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 return {id:g.userData.assetId,detail:g.userData.detail,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes:g.children.length};
}
