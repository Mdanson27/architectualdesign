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
 'balcony-chair':{pages:[36],dimensions:[.62,.89,.64],category:'outdoor'},
 "entry-console":{"pages":[13],"dimensions":[1.1,0.8,0.35],"category":"entry"},
 "oval-entry-mirror":{"pages":[13],"dimensions":[0.65,1.05,0.055],"category":"entry"},
 "entertainment-unit":{"pages":[15,18,33],"dimensions":[2.6,0.62,0.42],"category":"living"},
 "bedroom-bench":{"pages":[22],"dimensions":[1.2,0.58,0.45],"category":"bedroom"},
 "bedside-drawers":{"pages":[22,23],"dimensions":[0.52,0.48,0.43],"category":"bedroom"},
 "study-shelving":{"pages":[25],"dimensions":[2,2.45,0.37],"category":"study"},
 "pantry-shelving":{"pages":[41],"dimensions":[1.2,2.45,0.5],"category":"kitchen"},
 "balcony-wire-table":{"pages":[36],"dimensions":[0.65,0.72,0.65],"category":"outdoor"},
 "concealed-appliance-tower":{"pages":[26,30],"dimensions":[0.65,2.3,0.65],"category":"kitchen"},
 "double-undermount-sink":{"pages":[27],"dimensions":[0.87,0.2,0.48],"category":"kitchen"},
 "wall-mount-faucet":{"pages":[27,38,39],"dimensions":[0.3,0.24,0.27],"category":"fixtures"},
 "pull-out-bin":{"pages":[28],"dimensions":[0.4,0.56,0.48],"category":"kitchen"},
 "floor-lamp":{"pages":[9,17],"dimensions":[0.44,1.6,0.49],"category":"lighting"},
 "table-lamp":{"pages":[9,16,17],"dimensions":[0.3,0.55,0.3],"category":"lighting"},
 "wall-sconce":{"pages":[9,17],"dimensions":[0.22,0.42,0.21],"category":"lighting"},
 "full-height-curtain-panel":{"pages":[18],"dimensions":[1.25,2.65,0.14],"category":"soft-furnishing"},
 "contour-area-rug":{"pages":[16,18],"dimensions":[2.8,0.025,2],"category":"soft-furnishing"},
 "decorative-vase":{"pages":[13,16],"dimensions":[0.24,0.55,0.24],"category":"accessory"},
 "shower-set":{"pages":[38,39],"dimensions":[0.32,0.95,0.32],"category":"fixtures"},
 "handheld-bidet":{"pages":[38,39],"dimensions":[0.24,0.7,0.13],"category":"fixtures"}
});
export function createFurnitureMaterials(){
 const m=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const materials={cream:m(0xeee5d9,.9),taupe:m(0xa99888,.9),sage:m(0x788772,.93),
 ivory:m(0xdad2c4,.91),timber:m(0x745742,.57,.03),walnut:m(0x4d352b,.57),
 bronze:m(0xbaa079,.35,.68),stone:m(0xcfc6bc,.54),ceramic:m(0xf0e5d7,.28),
 textile:m(0x8c7563,.95),steel:m(0x9da5a7,.31,.75),lamp:m(0xffe4b9,.65),charcoal:m(0x303030,.63),mirror:m(0xcbd3d7,.12,.92)};
 for(const [key,mat] of Object.entries(materials))mat.name='PHASE14_'+key;
 return materials;
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

 case 'entry-console':{
  box('slim-walnut-console-top',1.1,.10,.35,.025,m.walnut,0,.75,0);
  for(const side of [-1,1]){const o=box('crossed-sculptural-console-leg',.12,.78,.23,.025,m.walnut,0,.36,0);o.rotation.z=side*.51;}
  break;}
 case 'oval-entry-mirror':{
  const rim=new THREE.Shape();rim.absellipse(0,0,.325,.525,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absellipse(0,0,.297,.496,0,Math.PI*2,true);rim.holes.push(hole);
  add('dark-oval-mirror-frame',new THREE.ExtrudeGeometry(rim,{depth:.035,bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:round,curveSegments:radial}),m.walnut,0,.525,0);
  const face=new THREE.Shape();face.absellipse(0,0,.297,.496,0,Math.PI*2,false);
  add('mirror-inset',new THREE.ShapeGeometry(face,radial),m.mirror,0,.525,.02);break;}
 case 'entertainment-unit':
  box('floating-walnut-storage',2.6,.38,.42,.018,m.walnut,0,.20,0);
  for(let i=0;i<4;i++)box('concealed-flush-front',.63,.32,.032,.006,m.timber,(i-1.5)*.65,.20,-.216);
  box('long-floating-display-ledge',2.6,.05,.38,.016,m.timber,0,.59,.02);break;
 case 'bedroom-bench':
  for(const x of [-.50,.50]){for(const z of [-.16,.16])cyl('slim-bronze-foot',.014,.017,.13,m.bronze,x,.065,z);
   box('rounded-end-bolster',.18,.29,.44,.089,m.ivory,x,.43,0);}
  box('upholstered-bench-base',1.15,.25,.45,.06,m.cream,0,.255,0);
  box('padded-bench-seat',.91,.11,.43,.045,m.ivory,0,.435,0);break;
 case 'bedside-drawers':
  box('floating-drawer-case',.52,.48,.43,.018,m.timber,0,.24,0);
  for(const y of [.13,.35]){box('concealed-drawer-face',.50,.20,.025,.007,m.ivory,0,y,-.217);box('fine-brass-pull',.12,.012,.022,.005,m.bronze,0,y+.045,-.235);}
  break;
 case 'study-shelving':
 case 'pantry-shelving':{
  const w=id==='study-shelving'?2:1.2,d=id==='study-shelving'?.37:.50,mat=id==='study-shelving'?m.walnut:m.ivory;
  box('full-height-backing',w,2.45,.025,.004,mat,0,1.225,d/2-.013);
  for(const x of [-w/2+.02,0,w/2-.02])box('vertical-shelf-divider',.04,2.45,d,.008,mat,x,1.225,0);
  for(const y of [.04,.66,1.08,1.52,1.96,2.41])box('adjustable-shelf',w-.06,.035,d-.03,.005,mat,0,y,0);
  for(const x of [-w/4,w/4]){box('lower-closed-storage',w/2-.06,.54,d-.04,.012,m.timber,x,.31,0);box('lower-storage-front',w/2-.07,.50,.03,.006,mat,x,.32,-d/2);box('drawer-handle',.13,.016,.025,.004,m.bronze,x,.47,-d/2-.017);}
  break;}
 case 'balcony-wire-table':
  cyl('round-dark-outdoor-top',.325,.325,.045,m.charcoal,0,.6975,0);
  for(const y of [.04,.65]){const r=y<.1?.25:.12;add('cage-support-ring',new THREE.TorusGeometry(r,.011,high?8:4,radial),m.charcoal,0,y,0,Math.PI/2);}
  for(let i=0;i<(high?32:12);i++){const a=i*2*Math.PI/(high?32:12);curveTube('slender-cage-wire',[[.25*Math.cos(a),.04,.25*Math.sin(a)],[.17*Math.cos(a),.34,.17*Math.sin(a)],[.12*Math.cos(a),.65,.12*Math.sin(a)]],.0045,m.charcoal);}break;
 case 'concealed-appliance-tower':
  box('full-height-integrated-carcass',.65,2.3,.65,.012,m.timber,0,1.15,0);
  box('concealed-fridge-upper-door',.60,1.25,.035,.007,m.ivory,0,1.64,-.333);
  box('integrated-oven-panel',.56,.56,.05,.01,m.charcoal,0,.79,-.337);
  box('oven-glass-window',.47,.34,.015,.007,m.charcoal,0,.78,-.367);
  box('oven-steel-handle',.42,.024,.04,.01,m.steel,0,1.00,-.375);
  box('lower-concealed-drawer',.60,.45,.03,.008,m.ivory,0,.25,-.333);break;
 case 'double-undermount-sink':{
  // Open bowls made from five joined surfaces, never solid filled blocks.
  for(const x of [-.22,.22]){
   box('basin-bottom',.40,.025,.43,.01,m.steel,x,.02,0);
   for(const side of [-1,1]){box('basin-side-wall',.021,.18,.43,.009,m.steel,x+side*.19,.105,0);box('basin-end-wall',.40,.18,.021,.009,m.steel,x,.105,side*.205);}
   cyl('drain-flange',.045,.045,.008,m.charcoal,x,.035,0);
  }break;}
 case 'wall-mount-faucet':
  for(const x of [-.105,.105]){const o=cyl('brass-wall-control',.034,.034,.035,m.bronze,x,.14,.12);o.rotation.x=Math.PI/2;}
  curveTube('arched-wall-spout',[[0,.17,.12],[0,.23,.03],[0,.20,-.10],[0,.08,-.12]],.016,m.bronze);break;
 case 'pull-out-bin':
  box('stainless-bin-tray',.40,.04,.48,.015,m.steel,0,.025,0);
  for(const x of [-.09,.09]){box('removable-bin-bottom',.16,.03,.43,.01,m.charcoal,x,.06,0);for(const s of [-1,1]){box('bin-side',.015,.46,.43,.005,m.charcoal,x+s*.073,.30,0);box('bin-end',.16,.46,.015,.005,m.charcoal,x,.30,s*.206);}}
  break;
 case 'floor-lamp':
  cyl('brass-disc-base',.19,.19,.035,m.bronze,0,.0175,0);
  curveTube('arched-brass-stem',[[0,.035,0],[0,1.15,0],[0,1.55,.12],[0,1.49,.32],[0,1.36,.34]],.013,m.bronze);
  add('downward-bell-shade',new THREE.LatheGeometry([new THREE.Vector2(.16,0),new THREE.Vector2(.14,.11),new THREE.Vector2(.055,.20),new THREE.Vector2(.017,.22)],radial),m.bronze,0,1.14,.34);break;
 case 'table-lamp':
  cyl('brass-lamp-base',.11,.12,.025,m.bronze,0,.0125,0);
  add('sculpted-ceramic-lamp-body',new THREE.LatheGeometry([new THREE.Vector2(.075,0),new THREE.Vector2(.105,.08),new THREE.Vector2(.07,.22),new THREE.Vector2(.025,.31)],radial),m.walnut,0,.025,0);
  cyl('linen-shade',.125,.15,.22,m.cream,0,.44,0);break;
 case 'wall-sconce':
  {const o=cyl('bronze-wall-rosette',.065,.065,.024,m.bronze,0,.22,.09);o.rotation.x=Math.PI/2;}
  curveTube('curved-sconce-arm',[[0,.09,.08],[0,.34,.07],[0,.39,-.03],[0,.29,-.09]],.012,m.bronze);
  add('opal-diffuser',new THREE.SphereGeometry(.09,radial,high?16:6),m.cream,0,.20,-.09);break;
 case 'full-height-curtain-panel':{
  // Actual pleated cloth surface, not a rectangular slab.
  const n=high?120:32,rows=high?32:8,pos=[],uv=[],idx=[];
  for(let y=0;y<=rows;y++)for(let x=0;x<=n;x++){const u=x/n,v=y/rows;pos.push((u-.5)*1.25,2.65*v,.055*Math.sin(u*Math.PI*20)*(1-.18*v));uv.push(u,v);}
  for(let y=0;y<rows;y++)for(let x=0;x<n;x++){const a=y*(n+1)+x,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const mat=m.ivory.clone();mat.side=THREE.DoubleSide;add('continuous-pleated-fabric',geo,mat,0,0,0);break;}
 case 'contour-area-rug':
  box('low-profile-ivory-rug',2.8,.019,2,.009,m.ivory,0,.0095,0);
  for(let i=0;i<(high?20:7);i++){const t=i/(high?19:6),points=[];for(let j=0;j<=12;j++){const x=-1.32+2.64*j/12;points.push([x,.020,-.87+1.74*t+.05*Math.sin(x*3+t*6)]);}curveTube('woven-contour-detail',points,.0018,m.cream);}break;
 case 'decorative-vase':
  add('hollow-sculptural-vase',new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.09,0),new THREE.Vector2(.12,.20),new THREE.Vector2(.08,.40),new THREE.Vector2(.042,.55),new THREE.Vector2(.034,.55),new THREE.Vector2(.034,.50),new THREE.Vector2(.07,.18),new THREE.Vector2(0,.03)],radial),m.ceramic,0,0,0);break;
 case 'shower-set':
  curveTube('brushed-brass-riser',[[0,.05,.11],[0,.88,.11],[0,.92,-.12]],.014,m.bronze);
  cyl('rain-shower-head',.145,.145,.028,m.steel,0,.90,-.12);
  for(const x of [-.075,.075]){const o=cyl('wall-control',.035,.035,.035,m.bronze,x,.16,.11);o.rotation.x=Math.PI/2;}break;
 case 'handheld-bidet':
  curveTube('flexible-bidet-hose',[[.08,.60,.035],[.11,.22,.04],[0,.03,.035],[-.09,.22,.03],[-.08,.53,.03]],.008,m.bronze);
  {const o=cyl('handheld-brass-spray',.019,.022,.17,m.bronze,-.08,.59,.02);o.rotation.z=-.2;}
  {const o=cyl('wall-mounted-control',.035,.035,.025,m.bronze,.08,.60,.055);o.rotation.x=Math.PI/2;}break;
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
