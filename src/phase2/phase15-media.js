import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Phase 15C, Studio Anne pp.15,18. Independent assets only; no IFC mutations.
// Local front is -Z. Dimensions are provisional design envelopes, in metres.
export const MEDIA15=Object.freeze({
 'paired-coffee-tables':{dimensions:[1.53,.49,.88],anchor:'floor',pages:[15,18]},
 'pedestal-side-table':{dimensions:[.43,.55,.43],anchor:'floor',pages:[18]},
 'entertainment-wall':{dimensions:[3.36,2.70,.46],anchor:'wall/floor datum',pages:[15,18]}
});
export function createPhase15Media(id,{detail='high'}={}){
 if(!MEDIA15[id]||!['high','low'].includes(detail))throw Error('Unknown media asset or detail');
 const high=detail==='high',g=new THREE.Group();g.name='PHASE15C_'+id;
 g.userData={assetId:id,detail,forward:[0,0,-1],clientApproved:false,briefPages:MEDIA15[id].pages};
 const materials=[],textures=[];
 const mat=(name,color,roughness=.65,metalness=0)=>{const m=new THREE.MeshStandardMaterial({name,color,roughness,metalness});materials.push(m);return m;};
 // Deterministic original stone and timber patterns; no external photo assets.
 function texture(kind){
  const n=high?256:96,bytes=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const u=x/n,v=y/n,k=(y*n+x)*4;
   if(kind==='marble'){
    const p=Math.sin((u*4.6+v*3.8+Math.sin(v*13+u*5)*.36+Math.sin(u*24-v*13)*.10)*Math.PI);
    const vein=Math.exp(-Math.abs(p)*22),fine=Math.exp(-Math.abs(Math.sin((u*9-v*5+Math.sin(v*22)*.2)*Math.PI))*35);
    const grain=3*Math.sin(x*13+y*17);
    bytes[k]=Math.min(255,40+124*vein+45*fine+grain);bytes[k+1]=Math.min(255,29+105*vein+36*fine+grain);bytes[k+2]=Math.min(255,23+82*vein+25*fine+grain);
   }else{
    const a=8*Math.sin(v*85+Math.sin(u*6)*1.1)+4*Math.sin(v*220+u*9)+2*Math.sin(x*9+y*3);
    bytes[k]=139+a;bytes[k+1]=97+a;bytes[k+2]=65+a;
   }
   bytes[k+3]=255;
  }
  const t=new THREE.DataTexture(bytes,n,n);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.push(t);return t;
 }
 const marble=mat('dark-brown-veined-marble',0xffffff,.26);marble.map=texture('marble');
 const timber=mat('warm-walnut-grain',0xffffff,.54);timber.map=texture('wood');
 const cocoa=mat('polished-cocoa',0x503d33,.25),base=mat('dark-chocolate-pedestal',0x3a2d26,.56),ivory=mat('warm-ivory-panel',0xe0d5c3,.83),reveal=mat('dark-shadow-reveal',0x32291f,.85),screen=mat('black-tv-glass',0x101313,.19),frame=mat('tv-dark-frame',0x262627,.38),brass=mat('warm-brass',0x9e8050,.4,.6),ceramic=mat('warm-ceramic',0xc5b49b,.54),book=mat('linen-book-cover',0xb6a48f,.9),paper=mat('book-paper',0xe5d9c4,.95),led=mat('warm-2700K-diffuser',0xffe0b0,.55);led.emissive.setHex(0xffc17d);led.emissiveIntensity=.75;
 function add(name,geo,m,x=0,y=0,z=0,parent=g){const o=new THREE.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData={phase15Asset:id,component:name};parent.add(o);return o;}
 function box(name,w,h,d,r,m,x,y,z,parent=g){return add(name,new RoundedBoxGeometry(w,h,d,high?3:1,Math.min(r,w/2,h/2,d/2)),m,x,y,z,parent);}
 function cyl(name,r1,r2,h,m,x,y,z,parent=g){return add(name,new THREE.CylinderGeometry(r1,r2,h,high?48:16),m,x,y,z,parent);}
 function organicTop(name,w,d,h,m,x,y,z,parent=g){
  const n=high?64:24,shape=new THREE.Shape();
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n,r=1+.055*Math.cos(3*a+.4)+.025*Math.sin(2*a);const px=w*.5*Math.cos(a)*r,pz=d*.5*Math.sin(a)*r;if(i===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);}shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h-.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:high?3:1,steps:1,curveSegments:1});geo.rotateX(-Math.PI/2);geo.translate(0,-(h-.012)/2,0);
  // Normalize top UVs to table scale for continuous veins.
  const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/w+.5,pos.getZ(i)/d+.5);uv.needsUpdate=true;
  return add(name,geo,m,x,y,z,parent);
 }
 function lathe(name,profile,m,x,y,z,parent=g){return add(name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),high?48:16),m,x,y,z,parent);}
 function tube(name,points,r,m,parent=g){return add(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),high?24:8,r,high?6:4,false),m,0,0,0,parent);}
 if(id==='paired-coffee-tables'){
  // Two independent drums. Overlapping tabletop projections have vertical
  // separation; the actual bases are separate and do not intersect.
  const low=new THREE.Group();low.name='LOW_MARBLE_TABLE';low.position.set(-.38,0,.10);g.add(low);
  cyl('low-recessed-foot',.229,.229,.025,base,0,.0125,0,low);
  cyl('low-dark-drum-pedestal',.245,.245,.315,base,0,.1825,0,low);
  organicTop('low-veined-marble-organic-top',.83,.81,.045,marble,0,.3625,0,low);
  const tall=new THREE.Group();tall.name='TALL_COCOA_TABLE';tall.position.set(.31,0,-.12);g.add(tall);
  cyl('tall-recessed-foot',.209,.209,.025,base,0,.0125,0,tall);
  cyl('tall-dark-drum-pedestal',.235,.235,.415,base,0,.2325,0,tall);
  organicTop('tall-polished-organic-top',.79,.78,.046,cocoa,0,.463,0,tall);
  // p15 styling: two dark glass-like bottles on low top and a book on tall.
  const decor=new THREE.Group();decor.name='REMOVABLE_TABLE_STYLING';g.add(decor);
  const bottle=mat('smoked-amber-glass-appearance',0x44301e,.21,.12);
  for(const [x,z,h] of [[-.53,.15,.22],[-.29,.27,.28]])lathe('dark-sculptural-bottle',[[0,0],[.055,0],[.067,.07],[.053,h*.65],[.025,h*.78],[.024,h],[.016,h]],bottle,x,.385,z,decor);
  box('linen-book',.19,.038,.24,.004,book,.31,.505,-.12,decor);
  box('book-page-block',.18,.024,.228,.001,paper,.31,.505,-.12,decor);
  // Sculptural pale branch ornament, independently supported on book.
  const ornament=new THREE.Group();ornament.name='SCULPTURAL_ORNAMENT';ornament.position.set(.31,.524,-.12);decor.add(ornament);
  lathe('ornament-base',[[0,0],[.045,0],[.052,.025],[.031,.045]],ceramic,0,0,0,ornament);
  for(let i=0;i<7;i++){const a=i*2*Math.PI/7;const dx=Math.cos(a),dz=Math.sin(a);tube('ceramic-branch',[[0,.028,0],[dx*.026,.07,dz*.026],[dx*.047,.11+(i%3)*.014,dz*.047],[dx*.042,.14+(i%2)*.02,dz*.042]],.009,ceramic,ornament);}
 }
 if(id==='pedestal-side-table'){
  lathe('sculpted-timber-pedestal',[[0,0],[.16,0],[.17,.035],[.092,.20],[.082,.34],[.14,.49],[0,.49]],timber,0,0,0);
  organicTop('rounded-stone-side-top',.43,.42,.045,cocoa,0,.5125,0);
 }
 if(id==='entertainment-wall'){
  // p15: left tall timber illuminated niche, large ivory field, black TV,
  // continuous low floating timber ledge; right decorative vase/branches.
  // Actual anchoring, wall fixings and electrical design remain unverified.
  box('ivory-feature-wall-panel',2.76,2.63,.035,.002,ivory,.30,1.385,.185);
  box('left-walnut-niche-back',.58,2.22,.035,.002,timber,-1.37,1.30,.175);
  for(const x of [-1.645,-1.095])box('niche-vertical-timber-jamb',.045,2.22,.22,.003,timber,x,1.30,.065);
  for(const y of [.20,2.40])box('niche-horizontal-timber-frame',.58,.045,.22,.003,timber,-1.37,y,.065);
  box('niche-inner-ivory-inset',.37,1.78,.024,.002,ivory,-1.37,1.30,.135);
  box('niche-warm-light-strip',.35,.013,.020,.002,led,-1.37,2.185,.09);
  box('floating-console-top',3.36,.055,.43,.009,timber,0,.325,0);
  box('console-recessed-bottom',3.29,.035,.37,.004,reveal,0,.127,.03);
  box('console-back',3.30,.15,.028,.002,timber,0,.218,.18);
  for(const x of [-1.65,-.825,0,.825,1.65])box('console-divider',.025,.15,.35,.002,timber,x,.218,.012);
  for(let i=0;i<4;i++)box('handleless-concealed-storage-front-'+i,.818,.154,.025,.003,timber,(i-1.5)*.827,.222,-.192);
  box('recessed-tv-mount',.45,.28,.06,.002,reveal,.22,1.35,.119);
  box('tv-thin-black-bezel',1.48,.86,.045,.006,frame,.22,1.35,.055);
  box('tv-screen',1.45,.83,.012,.004,screen,.22,1.35,.026);
  // Concealed equipment zone is modelled as physical ventilation holes
  // represented by gaps between slats, not exposed cables.
  for(let i=0;i<12;i++)box('speaker-vent-slat',.025,.095,.015,.001,reveal,1.26+i*.024,.221,-.207);
  lathe('right-tall-ceramic-vase',[[0,0],[.087,0],[.102,.07],[.083,.19],[.038,.26],[.039,.30],[.027,.30]],ceramic,1.38,.3525,-.015);
  for(let i=0;i<6;i++){const dx=(i-2.5)*.055;const x=1.38;const pts=[[x,.60,-.015],[x+dx*.4,.86,.005],[x+dx,1.12+(i%3)*.095,-.02],[x+dx*1.4,1.34+(i%2)*.13,.005]];tube('decorative-dry-branch',pts,.004,base);}
  lathe('left-niche-vessel',[[0,0],[.06,0],[.075,.07],[.045,.14],[.03,.19],[.02,.19]],brass,-1.37,.3525,.035);
  g.userData.wallMountRequired=true;g.userData.cableAndElectricalCertified=false;
 }
 g.userData.dispose=()=>{g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
 return g;
}
export function mediaStats(g){
 g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g,true);let triangles=0,meshes=0;
 g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 return {id:g.userData.assetId,detail:g.userData.detail,min:b.min.toArray(),max:b.max.toArray(),dimensions:b.getSize(new THREE.Vector3()).toArray(),triangles,meshes};
}
