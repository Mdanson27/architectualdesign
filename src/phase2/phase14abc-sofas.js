import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {faceTarget,facingDot} from './phase14abc-integration.js';

// Original tailored upholstered sectional. Local -Z is the seating front.
// Dimensions are adapted to the retained source footprint, not a product survey.
let materials;
function upholsteryMaterials(){
 if(materials)return materials;
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,v=230+Math.round(12*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)+6*Math.cos((x+y)*Math.PI/4));
  pixels.set([v,v,v,255],i);
 }
 const weave=new THREE.DataTexture(pixels,size,size);weave.colorSpace=THREE.SRGBColorSpace;
 weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(12,12);
 weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;
 weave.generateMipmaps=true;weave.needsUpdate=true;
 const cloth=color=>new THREE.MeshStandardMaterial({color,map:weave,roughness:.94});
 materials={cream:cloth(0xe2d5c4),taupe:cloth(0xb5a28d),ivory:cloth(0xeee3d3),accent:cloth(0x93836e),timber:new THREE.MeshStandardMaterial({color:0x4d352b,roughness:.64})};
 return materials;
}
export function createTailoredSectional({width,depth,height,chaise='none',detail='high'}){
 if(![width,depth,height].every(n=>Number.isFinite(n)&&n>0)||width<1.1||depth<.65)throw Error('Invalid source sofa envelope');
 const group=new THREE.Group(),m=upholsteryMaterials(),segments=detail==='high'?3:1;
 const h=Math.min(height,.92),baseDepth=Math.min(depth,.91),back=depth/2,seatCenter=back-baseDepth*.53;
 const add=(tag,w,ht,d,r,mat,x,y,z)=>{
  const o=new THREE.Mesh(new RoundedBoxGeometry(w,ht,d,segments,Math.min(r,w/2,ht/2,d/2)),mat);
  o.name='PHASE14_SOFA_'+tag;o.userData={phase14Asset:'tailored-sectional',component:tag,visualConceptOnly:true,collidable:false};
  o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;group.add(o);return o;
 };
 add('recessed-walnut-plinth',width-.10,h*.12,baseDepth-.10,.045,m.timber,0,h*.08,seatCenter);
 add('rounded-upholstered-base',width,h*.30,baseDepth,.12,m.taupe,0,h*.24,seatCenter);
 const seatWidth=(width-.36)/Math.max(2,Math.round(width/.72)),n=Math.max(2,Math.round(width/.72));
 for(let i=0;i<n;i++){
  const x=(i-(n-1)/2)*seatWidth;
  add('individual-deep-seat-cushion-'+i,seatWidth-.018,h*.20,baseDepth*.68,.085,m.cream,x,h*.46,seatCenter-.025);
  const backCushion=add('padded-back-cushion-'+i,seatWidth-.025,h*.37,.18,.085,m.ivory,x,h*.79,back-.14);backCushion.rotation.x=-.07;
 }
 add('continuous-rounded-back',width-.07,h*.49,.18,.085,m.taupe,0,h*.73,back-.10);
 for(const s of [-1,1]){
  add('curved-wrap-arm',.18,h*.56,baseDepth-.035,.085,m.cream,s*(width/2-.09),h*.48,seatCenter);
 }
 if(chaise!=='none'&&depth>baseDepth+.15){
  const s=chaise==='left'?-1:1,w=Math.min(width*.44,.90),d=depth-baseDepth+.085,x=s*(width/2-w/2),z=-depth/2+d/2;
  add('sectional-return-plinth',w-.07,h*.12,d-.035,.035,m.timber,x,h*.08,z);
  add('sectional-return-base',w,h*.30,d,.10,m.taupe,x,h*.24,z);
  add('long-chaise-cushion',w-.04,h*.20,d-.015,.085,m.cream,x,h*.46,z);
 }
 for(const s of [-1,1]){
  const p=add('loose-tailored-pillow',Math.min(.32,width*.19),h*.29,.13,.06,s<0?m.accent:m.ivory,s*(width/2-.34),h*.72,back-.28);p.rotation.z=s*.14;
 }
 group.userData={phase14Asset:'tailored-sectional',chaise,originalDesign:true,clientApproved:false};
 return group;
}
export function sofaFacing(center,target){
 const dx=target.x-center.x,dz=target.z-center.z;
 return Math.abs(dx)>Math.abs(dz)?faceTarget(center.x,center.z,center.x+Math.sign(dx||1),center.z):faceTarget(center.x,center.z,center.x,center.z+Math.sign(dz||1));
}
// Infer which return already exists from the original mesh silhouette.
// Do not invent an L-shaped projection where the IFC has no supporting shape.
function sourceReturn(preview,center,yaw,width,depth,box){
 if(depth<1.10)return 'none';
 const ray=new THREE.Raycaster(),axis=new THREE.Vector3(0,-1,0),local=new THREE.Vector3();
 let left=0,right=0;
 preview.updateWorldMatrix(true,false);
 for(const side of [-1,1])for(const fraction of [.20,.34,.43])for(const front of [.18,.34,.43]){
  local.set(side*width*fraction,0,-depth*front).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(center);
  ray.set(new THREE.Vector3(local.x,box.max.y+.1,local.z),axis);ray.far=box.max.y-box.min.y+.2;
  if(ray.intersectObject(preview,false).length){if(side<0)left++;else right++;}
 }
 if(Math.max(left,right)<3||Math.abs(left-right)<2)return 'none';
 return left>right?'left':'right';
}
export function replaceSofaVisual(preview,box,target,root){
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),yaw=sofaFacing(center,target);
 const sideways=Math.abs(Math.sin(yaw))>.5,width=sideways?size.z:size.x,depth=sideways?size.x:size.z;
 if(width<1.1||depth<.65||size.y<.40)return null;
 const chaise=sourceReturn(preview,center,yaw,width,depth,box);
 const model=createTailoredSectional({width:width-.025,depth:depth-.025,height:Math.min(size.y-.015,.92),chaise});
 model.position.set(center.x,box.min.y+.008,center.z);model.rotation.y=yaw;
 model.name=preview.name;model.userData={...model.userData,sourceRegion:preview.userData.sourceRegion,originalGUID:preview.userData.originalGUID};
 root.remove(preview);root.add(model);model.updateMatrixWorld(true);
 const visualBox=new THREE.Box3().setFromObject(model,true);
 if(!box.clone().expandByScalar(.015).containsBox(visualBox)){
  root.remove(model);root.add(preview);model.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return null;
 }
 // Preserve source collision raycasts with a non-rendering material on the
 // existing clone. Its world transform, geometry and collider identity stay.
 const world=preview.matrixWorld.clone();model.add(preview);
 preview.matrix.copy(model.matrixWorld.clone().invert().multiply(world));
 preview.matrix.decompose(preview.position,preview.quaternion,preview.scale);
 const old=preview.material;
 preview.material=Array.isArray(old)?old.map(m=>{const c=m.clone();c.visible=false;return c;}):old.clone();
 if(!Array.isArray(preview.material))preview.material.visible=false;
 preview.userData.phase14CollisionOnly=true;
 model.updateMatrixWorld(true);
 const poseUnchanged=preview.matrixWorld.elements.every((v,i)=>Math.abs(v-world.elements[i])<1e-6);
 const hidden=Array.isArray(preview.material)?preview.material.every(m=>!m.visible):!preview.material.visible;
 const direction=facingDot(yaw,center.x,center.z,target.x,target.z);
 return {id:preview.userData.sourceRegion,guid:preview.userData.originalGUID,asset:'tailored-sectional',chaise,orientationYaw:yaw,facingDot:direction,oldMeshNotRendered:hidden,collisionTransformPreserved:poseUnchanged,visualWithinPriorBounds:true,visualBounds:[visualBox.min.toArray(),visualBox.max.toArray()],retainedBounds:[box.min.toArray(),box.max.toArray()],model};
}
