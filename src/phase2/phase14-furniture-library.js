import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original procedural models, authored for AutoMinds Spaces. Dimensions
// are design proposals in metres, not surveyed product specifications.
export const FURNITURE_CATALOG=Object.freeze({
 'curved-sofa':{pages:[14,18,19],dimensions:[2.25,0.92,.96],category:'seating'},
 'rest-chaise':{pages:[14],dimensions:[1.65,.88,.87],category:'seating'},
 'sculptural-accent-chair':{pages:[14,18],dimensions:[.80,.94,.74],category:'seating'},
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
 // Vertically fluted, continuous upholstered barrel shell (Studio Anne p.14).
 // Geometry carries the ribs rather than floating tubes; lower detail keeps
 // the same overall silhouette with fewer samples.
 function barrelShell(w,d,mat){
  const steps=high?192:48,ring=8,pos=[],uv=[],idx=[];
  for(let i=0;i<=steps;i++){
   const a=Math.PI*i/steps,top=.70+.24*Math.sin(a),x=Math.cos(a)*(w/2-.055),z=-.25+d*.83*Math.sin(a);
   const normal=new THREE.Vector3(Math.cos(a),0,Math.sin(a)).normalize();
   const rib=high?.007*(.5+.5*Math.cos(a*64)):0;
   for(let j=0;j<=ring;j++){
    const theta=2*Math.PI*j/ring;
    const thickness=.052+rib*Math.max(0,Math.cos(theta));
    const p=new THREE.Vector3(x,(top+.035)/2,z).addScaledVector(normal,Math.cos(theta)*thickness);
    p.y+=Math.sin(theta)*(top-.035)/2;pos.push(...p.toArray());uv.push(i/steps,j/ring);
   }
  }
  for(let i=0;i<steps;i++)for(let j=0;j<ring;j++){const a=i*(ring+1)+j,b=a+ring+1;idx.push(a,a+1,b,b,a+1,b+1);}
  for(const end of [0,steps]){const a=end*(ring+1),c=pos.length/3;let x=0,y=0,z=0;for(let j=0;j<ring;j++){x+=pos[(a+j)*3];y+=pos[(a+j)*3+1];z+=pos[(a+j)*3+2];}pos.push(x/ring,y/ring,z/ring);uv.push(end/steps,.5);for(let j=0;j<ring;j++)idx.push(...(end===0?[c,a+j,a+j+1]:[c,a+j+1,a+j]));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  add('floor-hugging-vertically-ribbed-barrel-shell',geo,mat,0,0,0);
 }
 function flutedPedestal(tag,x,z,h,r,mat,elongated=false){
  const n=high?96:24,rows=high?24:10,pos=[],uv=[],idx=[];
  for(let j=0;j<=rows;j++){
   const t=j/rows,base=elongated?.82+.18*Math.cos(t*Math.PI):.53+.47*Math.pow(Math.abs(Math.cos(Math.PI*t)),1.2);
   for(let i=0;i<=n;i++){
    const a=2*Math.PI*i/n,flute=high?.018*(.5+.5*Math.cos(a*24)):0;
    const radius=r*base-flute;
    pos.push(Math.cos(a)*radius,h*t,Math.sin(a)*radius);uv.push(i/n,t);
   }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,b,b+1,a+1);}
  for(const row of [0,rows]){const c=pos.length/3;pos.push(0,h*row/rows,0);uv.push(.5,.5);for(let i=0;i<n;i++){const a=row*(n+1)+i;idx.push(...(row===0?[c,a,a+1]:[c,a+1,a]));}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  add(tag,geo,mat,x,0,z);
 }
 function ovalTop(tag,w,h,d,mat,x,y,z){
  const shape=new THREE.Shape();shape.absellipse(0,0,w/2-h*.12,d/2-h*.12,0,2*Math.PI,false);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h*.65,bevelEnabled:true,bevelSegments:high?3:1,steps:1,bevelSize:h*.12,bevelThickness:h*.175,curveSegments:high?24:8});
  geo.rotateX(-Math.PI/2);geo.translate(0,-h*.325,0);return add(tag,geo,mat,x,y,z);
 }
 function feet(w,d,y=.095){for(const x of [-w,w])for(const z of [-d,d])cyl('tapered-timber-foot',.022,.032,y*2,m.timber,x,y,z);}
 function upholstery(w,d,h,mat){box('upholstered-plinth',w,.20,d,.09,mat,0,.23,0);
  box('deep-loose-seat-cushion',w-.09,.18,d-.10,.085,m.cream,0,.43,-.025);
  shell('continuous-curved-upholstered-shell',w-.13,d*.43,.72,h,.15,mat);
  if(high){curveTube('tailored-seat-piping',[[-w*.40,.44,-d*.42],[0,.44,-d*.44],[w*.40,.44,-d*.42]],.005,m.taupe);}
 }
 function pedestal(x,z,h,r){const p=[new THREE.Vector2(0,0),new THREE.Vector2(r*.88,0),new THREE.Vector2(r,h*.08),new THREE.Vector2(r*.52,h*.45),new THREE.Vector2(r*.43,h*.62),new THREE.Vector2(r*.72,h*.98),new THREE.Vector2(0,h)];add('sculptural-pedestal',new THREE.LatheGeometry(p,radial),m.walnut,x,0,z);}
 switch(id){
 case 'curved-sofa':{
  const w=2.25,d=.9;
  box('recessed-dark-timber-plinth',w,.09,d,.045,m.walnut,0,.065,0);
  box('soft-upholstered-base',w-.08,.26,d-.07,.12,m.taupe,0,.24,0);
  // Broad continuous back plus soft wrap arms and three distinct deep cushions.
  box('continuous-soft-back',w-.20,.54,.24,.12,m.cream,0,.65,.31);
  for(const side of [-1,1]){
   box('rounded-wrap-arm',.22,.69,.83,.105,m.cream,side*(w/2-.13),.51,.015);
   box('contrasting-timber-side-trim',.065,.57,.70,.03,m.walnut,side*(w/2-.045),.34,.055);
   const p=box('loose-throw-pillow',.34,.34,.14,.065,side<0?m.ivory:m.textile,side*.71,.71,.20);p.rotation.z=side*.14;
  }
  for(let i=0;i<3;i++)box('separate-deep-seat-cushion',.625,.23,.65,.10,m.cream,(i-1)*.64,.44,-.045);
  break;
 }
 case 'rest-chaise':{
  box('low-asymmetric-chaise-base',1.65,.28,.87,.135,m.ivory,0,.16,0);
  box('one-piece-chaise-seat',1.56,.20,.79,.095,m.cream,-.015,.39,-.025);
  shell('asymmetric-backrest',1.05,.30,.63,.47,.16,m.cream,.0);
  // Raised right-side arm, open left end like the p.14 rest sofa.
  box('single-raised-side',.18,.52,.68,.085,m.cream,.72,.52,.04);
  const p=box('textured-lumbar-pillow',.31,.31,.12,.052,m.textile,.35,.64,.20);p.rotation.z=-.18;
  box('folded-draped-throw',.35,.045,.80,.019,m.taupe,-.51,.51,-.02);
  break;
 }
 case 'sculptural-accent-chair':{
  barrelShell(.80,.74,m.sage);
  box('concealed-plinth',.65,.07,.55,.035,m.walnut,0,.05,.02);
  box('deep-single-seat',.61,.19,.59,.085,m.sage,0,.40,-.015);
  const p=box('olive-loose-back-cushion',.50,.31,.17,.065,m.sage,0,.68,.16);p.rotation.x=-.15;
  break;
 }
 case 'balcony-chair':{
  // p.36: slender outdoor frame, distinct light seat and back, open sides.
  for(const side of [-1,1]){
   const x=side*.27;
   curveTube('slender-weather-resistant-frame',[[x,.02,-.27],[x,.44,-.25],[x,.61,-.19],[x,.72,.19],[x,.85,.25],[x,.02,.27]],.014,m.steel);
   for(let i=0;i<(high?11:5);i++){
    const z=-.17+i*.034*(high?1:2);curveTube('open-woven-side-cord',[[x,.44,z],[x,.55,z],[x,.64,z+.025]],.0035,m.ivory);
   }
  }
  box('outdoor-seat-cushion',.49,.095,.53,.043,m.ivory,0,.46,0);
  const p=box('separate-light-back-cushion',.48,.37,.10,.049,m.cream,0,.69,.23);p.rotation.x=-.13;
  break;
 }
 case 'curved-dining-chair':
  feet(.205,.205,.205);box('timber-seat-frame',.49,.065,.51,.03,m.timber,0,.43,0);
  box('shaped-seat-upholstery',.45,.11,.45,.05,m.taupe,0,.50,0);
  shell('continuous-curved-walnut-back-and-arm',.43,.18,.76,.31,.075,m.walnut);
  box('upholstered-back-pad',.37,.24,.085,.038,m.taupe,0,.77,.18);break;
 case 'sculptural-dining-table':
  flutedPedestal('hourglass-fluted-timber-pedestal',-.59,0,.72,.26,m.walnut);
  flutedPedestal('hourglass-fluted-timber-pedestal',.59,0,.72,.26,m.walnut);
  ovalTop('oval-dark-timber-top',2.2,.075,1.14,m.walnut,0,.77,0);break;
 case 'rounded-coffee-table':
  // p.15: overlapping sculptural tables with dark stone and bronze-brown tops.
  cyl('low-round-drum-base',.23,.25,.35,m.walnut,-.23,.175,.055);
  cyl('tall-round-drum-base',.19,.21,.40,m.walnut,.26,.20,-.06);
  ovalTop('dark-stone-organic-top',.66,.055,.57,m.walnut,-.23,.375,.055);
  ovalTop('soft-brown-organic-top',.57,.055,.51,m.timber,.26,.435,-.06);break;
 case 'pedestal-side-table':
  pedestal(0,0,.53,.14);cyl('rounded-stone-top',.18,.18,.05,m.stone,0,.555,0);break;
 case 'upholstered-bed':
  box('upholstered-platform',1.8,.30,2.10,.12,m.taupe,0,.20,0);
  box('mattress',1.69,.22,1.94,.095,m.ivory,0,.44,-.02);
  for(const x of [-.45,.45])box('twin-upholstered-headboard-panel',.89,1.20,.16,.075,m.taupe,x,.60,.97);
  box('draped-duvet',1.72,.12,1.42,.055,m.cream,0,.57,-.20);
  for(const x of [-.42,.42])box('pillow',.69,.15,.43,.07,m.cream,x,.60,.62);
  if(high){for(let i=0;i<5;i++)curveTube('duvet-seam',[[-.78,.625,-.84+i*.10],[0,.645,-.82+i*.10],[.78,.625,-.84+i*.10]],.004,m.ivory);}
  box('folded-bed-throw',1.7,.055,.36,.025,m.textile,0,.65,-.57);break;
 case 'storage-ottoman':
  cyl('recessed-timber-base',.24,.24,.045,m.walnut,0,.025,0);
  box('rounded-storage-body',.54,.35,.54,.15,m.taupe,0,.22,0);
  box('removable-upholstered-lid',.55,.11,.55,.055,m.cream,0,.425,0);
  shell('wraparound-entry-ottoman-back',.45,.15,.38,.20,.065,m.taupe);break;
 case 'fitted-wardrobe':
  box('full-height-cabinet-shell',1.80,2.45,.57,.015,m.walnut,0,1.225,0);
  for(let i=0;i<3;i++){let x=(i-1)*.59;box('full-height-panel',.57,2.34,.035,.008,m.timber,x,1.25,-.295);
   box('brass-pull',.022,.22,.027,.008,m.bronze,x+.22,1.11,-.324);}
  box('recessed-plinth',1.68,.07,.49,.008,m.walnut,0,.035,0);break;
 case 'fluted-writing-desk':
  flutedPedestal('vertical-fluted-writing-desk-support',-.47,0,.70,.17,m.walnut,true);flutedPedestal('vertical-fluted-writing-desk-support',.47,0,.70,.17,m.walnut,true);
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
  const p=[new THREE.Vector2(.145,.04),new THREE.Vector2(.147,.052),new THREE.Vector2(.13,.11),new THREE.Vector2(.082,.20),new THREE.Vector2(.035,.29),new THREE.Vector2(.012,.34)];
  add('tapered-ceramic-pendant-shade',new THREE.LatheGeometry(p,radial),m.cream,0,0,0);
  cyl('warm-diffuser',.129,.129,.012,m.lamp,0,.046,0);break;
 }
 }
 const [w,h,d]=spec.dimensions;
 fitFurnitureEnvelope(g,new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,h,d/2));
 g.userData.stats=furnitureStats(g);
 return g;
}
