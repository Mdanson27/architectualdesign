import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {FINISHES15,FINISH15_SPEC,createPhase15Finishes,finishesStats,createPhase15SourceFloors,createPhase15SourceCeilings,canInstallBotanicalPanel} from '../src/phase2/phase15-finishes.js';
const variants=[];
for(const id of Object.keys(FINISHES15)){
 const pair=[];
 for(const detail of ['high','low']){
  const g=createPhase15Finishes(id,{detail}),s=finishesStats(g);pair.push(s);
  assert(s.triangles>0&&s.triangles<30000);
  g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  if(id!=='sitting-finishes'){
   const p=g.getObjectByName('botanical-plaster-panel'),r=g.getObjectByName('sculpted-botanical-branch-relief');
   assert(p&&r);const a=new THREE.Box3().setFromObject(p,true),b=new THREE.Box3().setFromObject(r,true);
   assert(b.min.x>a.min.x&&b.max.x<a.max.x&&b.min.y>a.min.y&&b.max.y<a.max.y);
   assert(b.min.z<a.min.z&&b.max.z>=a.min.z-.001,'relief must emerge from backing');
   assert(r.geometry.attributes.position.count>100);
  }
  if(id!=='botanical-relief'){
   const skirt=g.getObjectByName('flush-skirting-6mm-allowance');assert.equal(skirt.geometry.parameters.depth,.006);
   assert(g.getObjectByName('continuous-porcelain-review-floor').material.map);
   assert(g.getObjectByName('continuous-suspended-ceiling-centre'));
   assert.equal(g.getObjectByName('CEILING_REVIEW_ASSEMBLY').children.filter(o=>o.name==='recessed-linear-diffuser').length,4);
  }
  g.userData.dispose();
 }
 assert(pair[0].triangles>pair[1].triangles);variants.push(...pair);
}
const ok={uninterruptedWidth:1.8,uninterruptedHeight:2.6,sourceWallVisible:true,openingIntersects:false,sourceSurfaceProbesPassed:true,clientApproved:true};
assert(canInstallBotanicalPanel(ok));
for(const p of [{openingIntersects:true},{sourceWallVisible:false},{sourceSurfaceProbesPassed:false},{clientApproved:false},{uninterruptedWidth:.8}])assert(!canInstallBotanicalPanel({...ok,...p}));
assert(!FINISH15_SPEC.placementApproved);
// Load source GLB triangle surfaces, independently of the isolated review.
const manifest=JSON.parse(fs.readFileSync('public/ifc/house/manifest.json','utf8'));
const reader={5120:['readInt8',1],5121:['readUInt8',1],5122:['readInt16LE',2],5123:['readUInt16LE',2],5125:['readUInt32LE',4],5126:['readFloatLE',4]};
const floorTriangles=[],ceilingTriangles=[],sourceBoxes=new Map();
for(const layer of manifest.layers.filter(l=>(l.level==='ground'&&['slabs','walls','proxies'].includes(l.category))||(l.level==='first'&&l.category==='slabs'))){
 const raw=fs.readFileSync('public'+layer.glb),len=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+len).toString('utf8')),bin=28+len;
 function value(a,i,k=0){const b=j.bufferViews[a.bufferView],r=reader[a.componentType],components=a.type==='VEC3'?3:1;return raw[r[0]](bin+(b.byteOffset??0)+(a.byteOffset??0)+i*(b.byteStride??r[1]*components)+k*r[1]);}
 for(const n of j.nodes){if(n.mesh==null)continue;
  const matrix=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));
  for(const p of j.meshes[n.mesh].primitives){if(p.mode!=null&&p.mode!==4)continue;const a=j.accessors[p.attributes.POSITION];if(!a.min||!a.max)continue;
   const b=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max)).applyMatrix4(matrix);
   if(sourceBoxes.has(n.name))sourceBoxes.get(n.name).union(b);else sourceBoxes.set(n.name,b.clone());
   if(layer.category!=='slabs'||b.max.x<112.25||b.min.x>119.73||b.max.z< -9.62||b.min.z>-.38)continue;
   if(!(b.max.y>=-.15&&b.min.y<=.15)&&!(b.max.y>=2.5&&b.min.y<=3.65))continue;
   const pts=Array.from({length:a.count},(_,i)=>new THREE.Vector3(value(a,i,0),value(a,i,1),value(a,i,2)).applyMatrix4(matrix));
   const ix=p.indices!=null?j.accessors[p.indices]:null,count=ix?.count??a.count;
   for(let i=0;i<count;i+=3){const [A,B,C]=[i,i+1,i+2].map(k=>pts[ix?value(ix,k):k]);if(!A||!B||!C)continue;
    const d=(B.z-C.z)*(A.x-C.x)+(C.x-B.x)*(A.z-C.z);if(Math.abs(d)<1e-10)continue;
    const min=Math.min(A.y,B.y,C.y),max=Math.max(A.y,B.y,C.y),tri={A,B,C,d,x0:Math.min(A.x,B.x,C.x),x1:Math.max(A.x,B.x,C.x),z0:Math.min(A.z,B.z,C.z),z1:Math.max(A.z,B.z,C.z)};
    if(min>=-.15&&max<=.15)floorTriangles.push(tri);
    if(min>=2.50&&max<=3.65)ceilingTriangles.push(tri);
   }
  }
 }
}
function sample(triangles,x,z,highest){let y=null;for(const t of triangles){if(x<t.x0-.0001||x>t.x1+.0001||z<t.z0-.0001||z>t.z1+.0001)continue;const {A,B,C,d}=t,u=((B.z-C.z)*(x-C.x)+(C.x-B.x)*(z-C.z))/d,v=((C.z-A.z)*(x-C.x)+(A.x-C.x)*(z-C.z))/d;if(u<-.0001||v<-.0001||u+v>1.0001)continue;const q=u*A.y+v*B.y+(1-u-v)*C.y;if(y===null||(highest?q>y:q<y))y=q;}return y===null?null:{y};}
const floor=createPhase15SourceFloors({floorSampler:(x,z)=>sample(floorTriangles,x,z,true),detail:'low'});
assert.equal(floor.regions.length,4);assert(floor.regions.slice(0,2).every(r=>r.supported>r.area*.75),'source floor majority support');
for(const r of floor.regions)assert(Math.abs(r.area-r.supported-r.unverified)<.001);
for(const m of floor.root.children){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)assert(a.getX(i)>=112.25-.0001,'kitchen protection');}
const noFloor=createPhase15SourceFloors({floorSampler:()=>null});assert.equal(noFloor.root.children.length,0);noFloor.root.userData.dispose();
const ceiling=createPhase15SourceCeilings({ceilingSampler:(x,z)=>sample(ceilingTriangles,x,z,false),detail:'low'});
const noCeiling=createPhase15SourceCeilings({ceilingSampler:()=>null});assert.equal(noCeiling.root.children.length,0);noCeiling.root.userData.dispose();
const wall=sourceBoxes.get('3f10ygYFX3EeQRTHm4CgZl'),door=sourceBoxes.get('0_jbkpuc59BOPaG_zMQH_6'),east=sourceBoxes.get('2axYJRzojAfxQ3W1Phspg0'),window=sourceBoxes.get('3$SsS73oTD9xjTkkK_wxPq'),eastDoor=sourceBoxes.get('0heo8rPOjCf99YWpmhxp18');
assert(wall&&door&&east&&window&&eastDoor);
const northFree=Math.max(door.min.x-wall.min.x,wall.max.x-door.max.x);
const eastFree=Math.max(eastDoor.min.z-east.min.z,window.min.z-eastDoor.max.z,east.max.z-window.max.z);
assert(northFree<1.75&&eastFree<1.75,'full-size feature panel requires verified alternative');
const schedule=JSON.parse(fs.readFileSync('architecture/stage2-finishes-schedule.json','utf8'));
for(const id of ['G-SITTING','G-DINING'])assert.equal(schedule.rooms.find(r=>r.id===id).proposed.floor,'porcelain');
assert.equal(schedule.rooms.find(r=>r.id==='G-KITCHEN').proposed.floor,'caramel');
console.log('PHASE15E_FINISHES',JSON.stringify({variants,floor:floor.regions,ceiling:ceiling.regions,sourceWall:{northFree,eastFree,fullHeightPlacementApproved:false},floorTriangles:floorTriangles.length,ceilingTriangles:ceilingTriangles.length,liveInstalled:false}));
floor.root.userData.dispose();ceiling.root.userData.dispose();
