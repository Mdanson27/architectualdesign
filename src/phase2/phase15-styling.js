import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Studio Anne pp16,18,19 and dining rug in p20. Isolated assets only.
// Coordinates in metres; front is -Z. Proposed dimensions, not site approval.
export const STYLE15=Object.freeze({
 'living-contour-rug':{anchor:'floor',width:3.2,depth:2.4,page:16},
 'dining-woven-rug':{anchor:'floor',width:3.6,depth:2.65,page:20},
 'layered-curtains':{anchor:'ceiling/wall',width:2.65,height:2.70,page:18},
 'cushion-set':{anchor:'sofa',page:16},
 'olive-planter':{anchor:'floor',page:16},
 'vases-and-books':{anchor:'tabletop',page:16},
 'organic-mirror':{anchor:'wall',page:16},
 'contour-artwork':{anchor:'wall',page:16}
});
const sp=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);
export function createPhase15Style(id,{detail='high'}={}){
 if(!STYLE15[id]||!['high','low'].includes(detail))throw Error('Unknown styling asset');
 const high=detail==='high',g=new THREE.Group();g.name='PHASE15F_'+id;g.userData={assetId:id,detail,anchor:STYLE15[id].anchor,clientApproved:false,forward:[0,0,-1]};
 const materials=[],textures=[],reflectors=[];
 const mat=(name,color,roughness=.86,metalness=0)=>{const m=new THREE.MeshStandardMaterial({name,color,roughness,metalness});materials.push(m);return m;};
 const ivory=mat('ivory woven textile',0xe1d7c6),taupe=mat('taupe linen',0xb4a18d),sheer=mat('ivory sheer',0xf5ede0),dark=mat('dark cocoa',0x4a3932),brass=mat('brushed brass',0x9a7950,.38,.6),cream=mat('warm ceramic',0xd4c3a9,.57),plum=mat('muted plum',0x704559,.6),burgundy=mat('burgundy fabric',0x783b37),blue=mat('muted blue-grey fabric',0x78878b),green=mat('olive leaf',0x6b794b,.91),leafPale=mat('sage leaf underside',0x939a72,.94),soil=mat('dark soil',0x45382c),paper=mat('book paper',0xe2d7c3,.9);
 function add(name,geo,m,x=0,y=0,z=0,parent=g){const o=new THREE.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function box(name,w,h,d,r,m,x,y,z,parent=g){return add(name,new RoundedBoxGeometry(w,h,d,high?3:1,Math.min(r,w/2,h/2,d/2)),m,x,y,z,parent);}
 function lathe(name,profile,m,x,y,z,parent=g){return add(name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),high?40:18),m,x,y,z,parent);}
 function tube(name,points,r,m,parent=g,closed=false){return add(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),high?32:12,r,high?7:4,closed),m,0,0,0,parent);}
 function surface(name,p,uv,ix,m,parent=g){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();return add(name,geo,m,0,0,0,parent);}
 function textile(kind){
  const n=high?512:256,data=new Uint8Array(n*n*4);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const u=i/n,v=j/n,x=u*2-1,y=v*2-1,k=(j*n+i)*4;
   const field=Math.hypot((x+.20*Math.sin(y*4))*1.18,(y-.22*Math.sin(x*4))*.85)+.085*Math.sin(x*5+y*3);
   const ridge=Math.pow(.5+.5*Math.cos(field*Math.PI*36),5);
   const weave=.5+.5*Math.cos(i*Math.PI/2)*Math.cos(j*Math.PI/2);
   const diamond=Math.abs(((u*8+.5)%1)-.5)+Math.abs(((v*8+.5)%1)-.5);
   const val=kind==='contour'?218-24*ridge+6*weave:kind==='dining'?219-19*Math.pow(.5+.5*Math.cos((Math.abs(x)+Math.abs(y))*Math.PI*20),5)+5*weave:kind==='pillow'?(diamond<.31?91:207)+5*weave:220+8*weave;
   data[k]=val;data[k+1]=val*.973;data[k+2]=val*.925;data[k+3]=255;
  }
  const t=new THREE.DataTexture(data,n,n);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.push(t);return t;
 }
 if(id.includes('rug')){
  const {width:w,depth:d}=STYLE15[id],kind=id.startsWith('living')?'contour':'dining';
  const rugMat=mat('woven relief pattern',0xffffff,.98);rugMat.map=textile(kind);rugMat.bumpMap=rugMat.map;rugMat.bumpScale=high?.003:.001;
  box('low-profile-rug-backing',w,.009,d,.003,taupe,0,.0045,0);
  const n=high?80:32,m=high?64:24,p=[],uv=[],ix=[];
  for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/m,x=(u-.5)*(w-.012),z=(v-.5)*(d-.012),f=Math.hypot((2*u-1+.20*Math.sin((2*v-1)*4))*1.18,(2*v-1-.22*Math.sin((2*u-1)*4))*.85)+.085*Math.sin((2*u-1)*5+(2*v-1)*3);const relief=kind==='contour'?Math.pow(.5+.5*Math.cos(f*Math.PI*36),5):0;p.push(x,.012+.0015*relief,z);uv.push(u,v);}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
  surface('woven-rug-pile',p,uv,ix,rugMat);
  g.userData.proposedFloorCovering=true;
 }
 if(id==='layered-curtains'){
  // Open centre, not an opaque curtain placed across a door. Real folds in
  // both drape and sheer; installation only after support and opening audit.
  const w=2.65,h=2.70;
  sheer.transparent=true;sheer.opacity=.48;sheer.depthWrite=false;sheer.side=THREE.DoubleSide;
  taupe.side=THREE.DoubleSide;sheer.roughness=1;
  const linen=textile('linen');taupe.bumpMap=linen;taupe.bumpScale=.001;
  box('ceiling-double-track',w,.035,.13,.006,cream,0,h-.0175,.035);
  function cloth(name,x0,x1,z,folds,m){
   const n=high?100:44,rows=high?34:14,p=[],uv=[],ix=[];
   for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=n;i++){const u=i/n,a=u*Math.PI*2*folds;const amp=.035+.012*Math.sin(t*Math.PI);p.push(x0+(x1-x0)*u+.006*Math.sin(a)*Math.sin(t*Math.PI),.012+t*(h-.057),z+amp*Math.cos(a)+.006*Math.sin(t*12+u*3));uv.push(u,t);}}
   for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
   return surface(name,p,uv,ix,m);
  }
  cloth('left-full-height-linen-drape',-1.30,-.84,-.045,5,taupe);
  cloth('right-full-height-linen-drape',.84,1.30,-.045,5,taupe);
  cloth('left-translucent-sheer',-1.25,-.25,.055,9,sheer);
  cloth('right-translucent-sheer',.25,1.25,.055,9,sheer);
  for(const [a,b,z] of [[-1.30,-.84,-.045],[.84,1.30,-.045],[-1.25,-.25,.055],[.25,1.25,.055]])for(let i=0;i<5;i++)box('concealed-curtain-track-glider',.012,.031,.018,.002,cream,a+(b-a)*(i+.5)/5,h-.051,z);
  g.userData.installationRequiresOpeningAudit=true;
 }
 if(id==='cushion-set'){
  const patterned=mat('woven geometric cushion',0xffffff,.97);patterned.map=textile('pillow');
  const variants=[[-.47,burgundy],[0,patterned],[.47,blue]];
  for(const [x,m] of variants){const n=high?36:18,k=high?20:10,p=[],uv=[],ix=[],w=.43,h=.43,d=.17;
   for(let j=0;j<=k;j++){const t=-Math.PI/2+j*Math.PI/k;for(let i=0;i<=n;i++){const a=i*Math.PI*2/n,c=sp(Math.cos(t),.52);p.push(x+w/2*c*sp(Math.cos(a),.42),h/2+h/2*sp(Math.sin(t),.56),d/2*c*sp(Math.sin(a),.65));uv.push(i/n,j/k);}}
   for(let j=0;j<k;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
   surface('tailored-throw-cushion',p,uv,ix,m);
  }
 }
 if(id==='olive-planter'){
  lathe('tapered-ceramic-planter',[[0,0],[.19,0],[.22,.025],[.25,.42],[.238,.44],[.21,.44],[.205,.40],[.17,.05],[0,.05]],cream,0,0,0);
  add('soil-supported-root-bed',new THREE.CylinderGeometry(.21,.20,.03,high?36:16),soil,0,.401,0);
  const trunk=[[0,.40,0],[-.03,.72,.018],[.025,1.13,-.01],[.012,1.53,.025],[.02,1.83,0]];
  tube('olive-trunk',trunk,.023,dark);
  const branches=[];
  for(let i=0;i<10;i++){const a=i*2.399963,dy=i*.043,start=[.012,1.13+dy,.015],end=[Math.cos(a)*(.31+.05*Math.sin(i)),1.43+dy,Math.sin(a)*.31],mid=[end[0]*.48,start[1]+.17,end[2]*.48];tube('olive-branch',[start,mid,end],.007,dark);branches.push([mid,end,a]);}
  const leafGeo=new THREE.SphereGeometry(1,high?7:5,4),leafCount=branches.length*(high?38:16);
  const leaves=new THREE.InstancedMesh(leafGeo,green,leafCount);leaves.name='instanced-olive-leaves';leaves.castShadow=true;let k=0;const dummy=new THREE.Object3D();
  for(const [mid,end,a] of branches){const count=high?38:16;for(let i=0;i<count;i++){const t=(i+.5)/count,angle=a+i*2.399963,spread=.035+.075*Math.sin(Math.PI*t);dummy.position.set(mid[0]+(end[0]-mid[0])*t+Math.cos(angle)*spread,mid[1]+(end[1]-mid[1])*t+.065*Math.sin(angle*1.7),mid[2]+(end[2]-mid[2])*t+Math.sin(angle)*spread);dummy.rotation.set(.4*Math.sin(angle),angle,.7*Math.cos(angle));dummy.scale.set(.012,.005,.041);dummy.updateMatrix();leaves.setMatrixAt(k,dummy.matrix);leaves.setColorAt(k,new THREE.Color(i%3===0?0xabb78e:0xe4e8cb));k++;}}
  leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;g.add(leaves);
 }
 if(id==='vases-and-books'){
  // Independently supported tabletop pieces, not one fused decorative mesh.
  const tall=[[0,0],[.085,0],[.107,.08],[.091,.20],[.033,.34],[.029,.39],[.021,.39],[.021,.35]];
  lathe('tall-plum-vase',tall,plum,-.40,0,0);
  lathe('small-taupe-vase',[[0,0],[.078,0],[.097,.065],[.085,.15],[.036,.24],[.029,.24]],cream,-.17,0,.05);
  const blossom=mat('soft rose blossom',0xbc899c,.85),petal=mat('ivory flower',0xe4cfc4,.9);
  for(let i=0;i<7;i++){const a=i*2.399963,dx=Math.cos(a)*.16,dz=Math.sin(a)*.15,y=.56+(i%4)*.075;
   tube('flower-stem',[[-.40,.30,0],[-.40+dx*.4,.47,dz*.4],[-.40+dx,y,dz]],.004,dark);
   for(let j=0;j<5;j++){const q=j*Math.PI*2/5;const o=add('flower-petal',new THREE.SphereGeometry(.023,high?10:6,6),i%2?blossom:petal,-.40+dx+Math.cos(q)*.021,y+.007,dz+Math.sin(q)*.021);o.scale.set(.7,.42,1.25);}
  }
  for(let i=0;i<3;i++){const y=.018+i*.037;box('linen-book-cover',.29-i*.018,.036,.22-i*.012,.003,i===1?taupe:cream,.25,y,0);box('book-page-block',.27-i*.018,.025,.205-i*.012,.001,paper,.25,y,-.004);}
  // Small brass bird sculpture resting on the stack.
  const body=add('brass-bird-body',new THREE.SphereGeometry(.046,high?18:10,10),brass,.25,.172,0);body.scale.set(1.2,.65,.6);
  add('brass-bird-head',new THREE.SphereGeometry(.022,high?14:8,8),brass,.294,.199,-.008);
  for(const x of [.23,.27])tube('brass-bird-leg',[[x,.110,0],[x,.15,0]],.004,brass);
  const beak=add('brass-bird-beak',new THREE.ConeGeometry(.009,.035,8),brass,.325,.20,-.008);beak.rotation.z=-Math.PI/2;
 }
 if(id==='organic-mirror'){
  // Actual planar reflection in the irregular mirror silhouette, with
  // modest texture allocation and a separate, non-certified backlight.
  const n=high?96:40,points=[];for(let i=0;i<n;i++){const a=i*Math.PI*2/n,r=1+.12*Math.sin(3*a+.4)+.06*Math.cos(5*a);points.push(new THREE.Vector2(.36*r*Math.cos(a),.63*r*Math.sin(a)+.72));}
  const shape=new THREE.Shape(points);shape.closePath();
  // Reflector calculates its reflection plane from its object transform, not its geometry normals.
  const glassGeo=new THREE.ShapeGeometry(shape);
  const mirror=new Reflector(glassGeo,{textureWidth:high?512:256,textureHeight:high?512:256,color:0xbdbdbd,clipBias:.003});mirror.name='organic-real-planar-reflection';mirror.rotation.y=Math.PI;mirror.position.z=-.028;g.add(mirror);reflectors.push(mirror);
  // Live mode can reuse the most recent planar capture between frames.
  // Independent reviews render every frame; explicit QA captures force a
  // fresh reflection. A periodic refresh also catches animated doors.
  const renderReflection=mirror.onBeforeRender;let last=-Infinity,updates=0,skipped=0,force=false;
  mirror.userData.reflectionBudget={intervalMs:120,enabled:false};
  mirror.userData.forceReflection=()=>{force=true;};
  mirror.userData.reflectionStats=()=>({updates,skipped,intervalMs:mirror.userData.reflectionBudget.intervalMs});
  mirror.onBeforeRender=function(renderer,scene,camera,geometry,material,group){
   const now=performance.now(),budget=mirror.userData.reflectionBudget;
   if(budget.enabled&&!force&&now-last<budget.intervalMs){skipped++;return;}
   force=false;last=now;updates++;return renderReflection.call(this,renderer,scene,camera,geometry,material,group);
  };
  const border=points.map(p=>[-p.x,p.y,-.021]);tube('organic-mirror-brushed-frame',border,.012,brass,g,true);
  const halo=mat('warm-mirror-perimeter-diffuser',0xffd7a0,.6);halo.emissive.setHex(0xffc17c);halo.emissiveIntensity=.8;
  tube('concealed-mirror-halo',points.map(p=>[-p.x*1.055,.72+(p.y-.72)*1.055,.007]),.011,halo,g,true);
  const back=new THREE.ShapeGeometry(shape);back.rotateY(Math.PI);add('mirror-wall-backing',back,dark,0,0,.016);
  g.userData.mountingRequired=true;
 }
 if(id==='contour-artwork'){
  box('artwork-walnut-frame',.95,.70,.035,.006,dark,0,.36,.025);
  const palette=[0xded2bd,0xc3c1a4,0x8e9b87,0xe7dfd0].map((c,i)=>mat('relief-art-tone-'+i,c,.89));
  const n=high?70:30,k=high?38:18,p=[],uv=[],ix=[];
  for(let j=0;j<=k;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/k;const phase=(v+.10*Math.sin(u*9)+.045*Math.sin(u*18+v*4))*Math.PI*18;p.push((u-.5)*.89,.36+(v-.5)*.64,-.006-.013*Math.pow(.5+.5*Math.sin(phase),3));uv.push(u,v);}
  for(let j=0;j<k;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
  const o=surface('sculptural-wavy-art-relief',p,uv,ix,palette[0]);const colors=[];
  for(let j=0;j<=k;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/k,phase=(v+.10*Math.sin(u*9)+.045*Math.sin(u*18+v*4))*Math.PI*18;const a=(.5+.5*Math.sin(phase))*3,c=palette[Math.floor(a)].color.clone().lerp(palette[Math.min(3,Math.floor(a)+1)].color,a%1);colors.push(c.r,c.g,c.b);}
  o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));o.material=mat('continuous multitone sculptural art',0xffffff,.89);o.material.vertexColors=true;

 }
 g.userData.dispose=()=>{reflectors.forEach(r=>r.dispose());g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
 return g;
}
export function stylingStats(g){g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g,true);let triangles=0,meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return {id:g.userData.assetId,detail:g.userData.detail,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes};}
// Explicit installation gate. Never block an opening or invent support.
export function canPlaceStyle({sourceSupportVerified,openingClear,ventilationClear,collisionClear,withinRoom,anchorVerified}={}){
 return [sourceSupportVerified,openingClear,ventilationClear,collisionClear,withinRoom,anchorVerified].every(v=>v===true);
}
