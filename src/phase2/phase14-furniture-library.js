import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original procedural models, authored for AutoMinds Spaces. Dimensions
// are design proposals in metres, not surveyed product specifications.
export const FURNITURE_CATALOG=Object.freeze({
 'curved-sofa':{pages:[14,18,19],dimensions:[2.25,0.92,.96],category:'seating'},
 'rest-chaise':{pages:[14],dimensions:[1.65,.88,.87],category:'seating'},
 'sculptural-accent-chair':{pages:[14,18],dimensions:[.80,1.175,.74],category:'seating'},
 'curved-dining-chair':{pages:[20],dimensions:[.51,.91,.55],category:'dining'},
 'sculptural-dining-table':{pages:[20],dimensions:[2.2,.81,1.14],category:'dining'},
 'rounded-coffee-table':{pages:[15],dimensions:[1.07,.47,.61],category:'living'},
 'pedestal-side-table':{pages:[18],dimensions:[.36,.58,.36],category:'living'},
 'upholstered-bed':{pages:[22,23],dimensions:[1.80,1.20,2.10],category:'bedroom'},
 'storage-ottoman':{pages:[13,22],dimensions:[.55,.48,.55],category:'bedroom'},
 'fitted-wardrobe':{pages:[23,24],dimensions:[1.8,2.45,.6],category:'storage'},
 'fluted-writing-desk':{pages:[25],dimensions:[1.45,.76,.65],category:'study'},
 'recessed-kitchen-cabinet':{pages:[26,30,31,32],dimensions:[.9,.91,.61],category:'kitchen'},
 'floating-vanity':{pages:[38,39],dimensions:[1.10,.53,.48],category:'bathroom'},
 'layered-pendant':{pages:[9,21,29],dimensions:[.31,.84,.31],category:'lighting'},
 'balcony-chair':{pages:[36],dimensions:[.62,.89,.64],category:'outdoor'}
});
export function createFurnitureMaterials(){
 const m=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 return {cream:m(0xeee5d9,.9),taupe:m(0xa99888,.9),sage:m(0x788772,.93),
 ivory:m(0xdad2c4,.91),timber:m(0x745742,.57,.03),walnut:m(0x4d352b,.57),
 bronze:m(0xbaa079,.35,.68),stone:m(0xcfc6bc,.54),ceramic:m(0xf0e5d7,.28),
 textile:m(0x8c7563,.95),steel:m(0x9da5a7,.31,.75),lamp:m(0xffe4b9,.65)};
}
const bounds=o=>new THREE.Box3().setFromObject(o,true);
export function furnitureStats(root){
 let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 const b=bounds(root);
 return {meshes,triangles,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray()};
}
// Bake the fitted envelope into each mesh so placement remains flat and
// the existing Stage 4 collision routine can keep its current mesh anchor.
export function fitFurnitureEnvelope(root,min,max){
 root.updateMatrixWorld(true);
 const b=bounds(root),size=b.getSize(new THREE.Vector3()),target=new THREE.Vector3().subVectors(max,min);
 if(size.toArray().some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid furniture bounds');
 const s=target.divide(size);
 const offset=min.clone().sub(b.min.clone().multiply(s));
 const fit=new THREE.Matrix4().compose(offset,new THREE.Quaternion(),s);
 for(const o of root.children){
  if(!o.isMesh)throw Error('Expected flat furniture asset');
  o.updateMatrix();o.geometry.applyMatrix4(fit.clone().multiply(o.matrix));
  o.position.set(0,0,0);o.quaternion.identity();o.scale.setScalar(1);o.updateMatrix();
 }
 root.updateMatrixWorld(true);return root;
}
export function createFurnitureAsset(id,{detail='high',materials}={}){
 const spec=FURNITURE_CATALOG[id];if(!spec||!['high','low'].includes(detail))throw Error('Unknown furniture asset or detail');
 const m=materials??createFurnitureMaterials(),g=new THREE.Group();
 g.name='PHASE14_'+id.toUpperCase().replaceAll('-','_');
 g.userData={assetId:id,detail,originalDesign:true,briefPages:spec.pages,clientApproved:false,visualConceptOnly:true};
 const high=detail==='high',round=high?3:1,radial=high?32:12;
 function add(tag,geo,mat,x,y,z,rx=0,ry=0,rz=0){
  const o=new THREE.Mesh(geo,mat);o.name=tag;o.position.set(x,y,z);o.rotation.set(rx,ry,rz);
  o.userData={furnitureAsset:id,component:tag,visualConceptOnly:true};g.add(o);return o;
 }
 const box=(tag,w,h,d,r,mat,x,y,z)=>add(tag,new RoundedBoxGeometry(w,h,d,round,Math.min(r,w/2,h/2,d/2)),mat,x,y,z);
 const cyl=(tag,r1,r2,h,mat,x,y,z)=>add(tag,new THREE.CylinderGeometry(r1,r2,h,radial),mat,x,y,z);
 function curveTube(tag,points,r,mat){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return add(tag,new THREE.TubeGeometry(curve,high?24:8,r,high?6:3,false),mat,0,0,0);
 }
 function shell(tag,width,depth,y,height,thickness,mat){
  // Sweep a padded U-shaped back and arms as a continuous curved shell.
  const points=[],n=high?36:12;
  for(let i=0;i<=n;i++){const a=Math.PI*i/n;points.push(new THREE.Vector3(Math.cos(a)*width/2,y,Math.sin(a)*depth));}
  const path=new THREE.CatmullRomCurve3(points);
  const seg=high?48:16,ring=high?12:6,pos=[],uv=[],idx=[];
  for(let i=0;i<=seg;i++){
   const p=path.getPointAt(i/seg),t=path.getTangentAt(i/seg),out=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(let j=0;j<=ring;j++){
    const a=2*Math.PI*j/ring,v=p.clone().addScaledVector(out,Math.cos(a)*thickness/2);
    v.y+=Math.sin(a)*height/2;pos.push(...v.toArray());uv.push(i/seg,j/ring);
   }
  }
  for(let i=0;i<seg;i++)for(let j=0;j<ring;j++){const a=i*(ring+1)+j,b=a+ring+1;idx.push(a,b,a+1,b,b+1,a+1);}
  for(const end of [0,seg]){const p=path.getPointAt(end/seg),c=pos.length/3;pos.push(...p.toArray());uv.push(.5,.5);
   for(let j=0;j<ring;j++){const a=end*(ring+1)+j;idx.push(...(end===0?[c,a+1,a]:[c,a,a+1]));}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  add(tag,geo,mat,0,0,0);
 }
 function feet(w,d,y=.095){for(const x of [-w,w])for(const z of [-d,d])cyl('tapered-timber-foot',.022,.032,y*2,m.timber,x,y,z);}
 function upholstery(w,d,h,mat){box('upholstered-plinth',w,.20,d,.09,mat,0,.23,0);
  box('deep-loose-seat-cushion',w-.09,.18,d-.10,.085,m.cream,0,.43,-.025);
  shell('continuous-curved-upholstered-shell',w-.13,d*.43,.72,h,.15,mat);
  if(high){curveTube('tailored-seat-piping',[[-w*.40,.44,-d*.42],[0,.44,-d*.44],[w*.40,.44,-d*.42]],.005,m.taupe);}
 }
 function pedestal(x,z,h,r){const p=[new THREE.Vector2(0,0),new THREE.Vector2(r*.88,0),new THREE.Vector2(r,h*.08),new THREE.Vector2(r*.52,h*.45),new THREE.Vector2(r*.43,h*.62),new THREE.Vector2(r*.72,h*.98),new THREE.Vector2(0,h)];add('sculptural-pedestal',new THREE.LatheGeometry(p,radial),m.walnut,x,0,z);}
 switch(id){
 case 'curved-sofa':
 case 'rest-chaise':{
  const w=id==='curved-sofa'?2.25:1.65,d=.9;
  box('curved-timber-base',w,.12,d,.06,m.walnut,0,.12,0);upholstery(w,d,.53,m.taupe);
  for(let i=0;i<(id==='curved-sofa'?3:2);i++){const n=id==='curved-sofa'?3:2;box('loose-seat-section',w/n-.08,.14,.65,.07,m.cream,(i-(n-1)/2)*w/n,.49,-.04);}
  box('loose-lumbar-cushion',.38,.31,.15,.065,m.textile,w*.29,.74,.25);
  if(high)box('folded-throw',.38,.035,.63,.015,m.taupe,-w*.27,.58,-.05);break;
 }
 case 'sculptural-accent-chair':
 case 'balcony-chair':{
  const w=id==='balcony-chair'?.62:.80,d=.72,mat=id==='balcony-chair'?m.ivory:m.sage;
  feet(w*.32,d*.34);upholstery(w,d,.62,mat);
  box('lumbar-cushion',w*.57,.25,.13,.06,m.cream,0,.73,.23);
  if(high)for(let i=0;i<9;i++){const a=.2+Math.PI*.9*i/8;const x=Math.cos(a)*(w-.13)/2,z=Math.sin(a)*d*.43;curveTube('subtle-upholstery-rib',[[x,.48,z],[x*1.11,.68,z*1.10],[x,.89,z]],.004,mat);}
  break;
 }
 case 'curved-dining-chair':
  feet(.205,.205,.205);box('timber-seat-frame',.49,.07,.51,.035,m.timber,0,.43,0);
  box('shaped-seat-upholstery',.45,.10,.45,.045,m.taupe,0,.50,0);
  shell('curved-wood-back-shell',.43,.18,.76,.31,.075,m.timber);
  box('upholstered-back-pad',.37,.24,.085,.038,m.taupe,0,.77,.18);break;
 case 'sculptural-dining-table':
  pedestal(-.59,0,.72,.26);pedestal(.59,0,.72,.26);
  box('soft-oval-timber-top',2.2,.085,1.14,.042,m.timber,0,.7625,0);break;
 case 'rounded-coffee-table':
  pedestal(-.28,0,.39,.16);pedestal(.28,0,.39,.16);
  box('rounded-stone-top',1.07,.08,.61,.04,m.stone,0,.43,0);break;
 case 'pedestal-side-table':
  pedestal(0,0,.53,.14);cyl('rounded-stone-top',.18,.18,.05,m.stone,0,.555,0);break;
 case 'upholstered-bed':
  box('upholstered-platform',1.8,.30,2.10,.12,m.taupe,0,.20,0);
  box('mattress',1.69,.22,1.94,.095,m.ivory,0,.44,-.02);
  box('soft-headboard',1.80,1.20,.16,.075,m.taupe,0,.60,.97);
  box('draped-duvet',1.72,.12,1.42,.055,m.cream,0,.57,-.20);
  for(const x of [-.42,.42])box('pillow',.69,.15,.43,.07,m.cream,x,.60,.62);
  if(high){for(let i=0;i<5;i++)curveTube('duvet-seam',[[-.78,.625,-.84+i*.10],[0,.645,-.82+i*.10],[.78,.625,-.84+i*.10]],.004,m.ivory);}
  box('folded-bed-throw',1.7,.055,.36,.025,m.textile,0,.65,-.57);break;
 case 'storage-ottoman':
  cyl('recessed-timber-base',.24,.24,.045,m.walnut,0,.025,0);
  box('rounded-storage-body',.54,.35,.54,.15,m.taupe,0,.22,0);
  box('removable-upholstered-lid',.55,.11,.55,.055,m.cream,0,.425,0);break;
 case 'fitted-wardrobe':
  box('full-height-cabinet-shell',1.80,2.45,.57,.015,m.walnut,0,1.225,0);
  for(let i=0;i<3;i++){let x=(i-1)*.59;box('full-height-panel',.57,2.34,.035,.008,m.timber,x,1.25,-.295);
   box('brass-pull',.022,.22,.027,.008,m.bronze,x+.22,1.11,-.324);}
  box('recessed-plinth',1.68,.07,.49,.008,m.walnut,0,.035,0);break;
 case 'fluted-writing-desk':
  pedestal(-.47,0,.70,.17);pedestal(.47,0,.70,.17);
  box('softened-timber-worktop',1.45,.06,.65,.029,m.timber,0,.73,0);
  box('concealed-drawer',.64,.10,.48,.012,m.walnut,0,.65,0);break;
 case 'recessed-kitchen-cabinet':
  box('cabinet-carcass',.90,.79,.57,.01,m.ivory,0,.49,0);
  box('recessed-steel-toekick',.83,.085,.47,.008,m.steel,0,.043,.025);
  for(const x of [-.225,.225]){box('soft-close-door',.44,.72,.035,.009,m.timber,x,.46,-.294);
   box('recessed-brass-pull',.14,.018,.027,.007,m.bronze,x,.72,-.322);}
  box('rounded-countertop',.90,.05,.61,.024,m.stone,0,.885,0);break;
 case 'floating-vanity':
  box('concealed-vanity-storage',1.10,.41,.46,.025,m.timber,0,.21,0);
  box('porcelain-counter',1.10,.05,.48,.024,m.ceramic,0,.445,0);
  box('drawer-front',1.03,.27,.027,.012,m.ivory,0,.24,-.245);
  box('brushed-brass-handle',.20,.016,.025,.006,m.bronze,0,.29,-.264);break;
 case 'layered-pendant':{
  cyl('ceiling-rose',.075,.075,.027,m.bronze,0,.826,0);
  cyl('suspension-stem',.004,.004,.53,m.bronze,0,.55,0);
  const p=[new THREE.Vector2(.04,.02),new THREE.Vector2(.155,.10),new THREE.Vector2(.145,.21),new THREE.Vector2(.06,.28)];
  add('sculptural-pendant-shade',new THREE.LatheGeometry(p,radial),m.bronze,0,0,0);
  cyl('warm-diffuser',.115,.115,.012,m.lamp,0,.078,0);break;
 }
 }
 const [w,h,d]=spec.dimensions;
 fitFurnitureEnvelope(g,new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,h,d/2));
 g.userData.stats=furnitureStats(g);
 return g;
}
