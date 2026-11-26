import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {DINING15,DINING15_PLAN,createPhase15Dining,diningStats,diningClearance,diningYaw} from '../src/phase2/phase15-dining.js';
const bounds=o=>new THREE.Box3().setFromObject(o,true),centre=o=>bounds(o).getCenter(new THREE.Vector3()),near=(a,b,t=.009)=>assert(Math.abs(a-b)<t,'Support mismatch '+a+' '+b);
const rows=[],clearances=[];
for(const id of Object.keys(DINING15)){
 const variants=[];
 for(const detail of ['high','low']){
  const g=createPhase15Dining(id,{detail});g.updateWorldMatrix(true,true);const stats=diningStats(g);variants.push(stats);
  near(stats.min[1],0);g.traverse(o=>{if(o.isMesh){for(const k of ['position','normal','uv'])assert(o.geometry.attributes[k]);assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  const chairs=g.children.filter(c=>c.name==='DINING_CHAIR'||/^DINING_CHAIR_/.test(c.name));
  for(const c of chairs){
   assert.equal(c.children.filter(o=>o.name==='tapered-front-leg').length,2);
   assert.equal(c.children.filter(o=>o.name==='tapered-rear-leg').length,2);
   assert.equal(c.children.filter(o=>o.name==='floor-contact-foot').length,4);
   assert(c.getObjectByName('continuous-curved-timber-wrap'));
   const back=c.getObjectByName('backrest-landmark'),seat=c.getObjectByName('seat-landmark');
   const f=new THREE.Vector3(0,0,-1).transformDirection(c.matrixWorld);
   const delta=centre(seat).sub(centre(back));delta.y=0;
   assert(delta.dot(f)>.20&&delta.normalize().dot(f)>.999,'physical front/back landmarks');
   assert(c.matrixWorld.determinant()>0);
   if(c.userData.target){
    const target=new THREE.Vector3(c.userData.target[0],0,c.userData.target[1]),dir=target.sub(c.position).normalize();
    assert(f.dot(dir)>.999,'chair faces assigned edge');
    const yaw=c.rotation.y;c.rotation.y+=Math.PI;g.updateWorldMatrix(true,true);
    const reversed=centre(seat).sub(centre(back));reversed.y=0;
    assert(reversed.normalize().dot(dir)<-.999,'reversed chair detection');
    c.rotation.y=yaw;g.updateWorldMatrix(true,true);
   }
   assert(bounds(back).min.y-bounds(seat).max.y>.09,'open lower back');
  }
  const t=g.getObjectByName('DINING_TABLE');
  if(t){const top=bounds(t.getObjectByName('rounded-dark-timber-tabletop')),legs=t.children.filter(o=>o.name==='fluted-hourglass-pedestal');assert.equal(legs.length,2);for(const l of legs){near(bounds(l).max.y,top.min.y);near(bounds(l).min.y,.007);assert(bounds(l).getSize(new THREE.Vector3()).x>.48);}
   assert(!bounds(legs[0]).intersectsBox(bounds(legs[1])));
   assert(top.getSize(new THREE.Vector3()).x>2.0);
  }
  if(id==='six-seat-set'){
   assert.equal(chairs.length,6);
   for(let i=0;i<chairs.length;i++){const c=chairs[i],b=bounds(c);assert(!b.intersectsBox(bounds(t)),'chair / table overlap in resting pose '+c.name);
    for(let j=i+1;j<chairs.length;j++)assert(!b.intersectsBox(bounds(chairs[j])),'chair pair overlap');
   }
   const report=diningClearance(g);assert(report.rows.every(r=>r.trialPullOutFits&&r.frontGap>0),'trial pullout or rest gap failed');
   for(const c of chairs){const old=c.position.clone(),f=new THREE.Vector3(0,0,-1).transformDirection(c.matrixWorld);for(const distance of [.15,.30,.45]){c.position.copy(old).addScaledVector(f,-distance);g.updateWorldMatrix(true,true);for(const other of chairs.filter(o=>o!==c))assert(!bounds(c).intersectsBox(bounds(other)));assert(!bounds(c).intersectsBox(bounds(t)));}c.position.copy(old);g.updateWorldMatrix(true,true);}
   clearances.push({detail,...report});
  }
  g.userData.dispose();
 }
 assert(variants[0].triangles>variants[1].triangles);
 assert(variants[0].triangles<200000&&variants[1].triangles<65000);
 rows.push(...variants);
}
// Sample actual IFC slab triangle surfaces at every foot centre, not a
// fabricated flat floor. The scene's exact finished-floor height is 15H.
const manifest=JSON.parse(fs.readFileSync('public/ifc/house/manifest.json','utf8'));
const g=createPhase15Dining('six-seat-set',{detail:'low'});g.updateWorldMatrix(true,true);
const [cx,cz]=DINING15_PLAN.centre,probes=[];
g.traverse(o=>{if(o.isMesh&&['floor-contact-foot','pedestal-recessed-foot'].includes(o.name)){const c=centre(o);probes.push({x:c.x+cx,z:c.z+cz,y:null});}});
const reader={5120:['readInt8',1],5121:['readUInt8',1],5122:['readInt16LE',2],5123:['readUInt16LE',2],5125:['readUInt32LE',4],5126:['readFloatLE',4]};
for(const layer of manifest.layers.filter(l=>l.level==='ground'&&l.category==='slabs')){
 const raw=fs.readFileSync('public'+layer.glb),len=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+len).toString('utf8')),bin=28+len;
 function value(a,i,k=0){const b=j.bufferViews[a.bufferView],r=reader[a.componentType],components=a.type==='VEC3'?3:1;return raw[r[0]](bin+(b.byteOffset??0)+(a.byteOffset??0)+i*(b.byteStride??r[1]*components)+k*r[1]);}
 for(const n of j.nodes){if(n.mesh==null)continue;
  const matrix=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));
  for(const p of j.meshes[n.mesh].primitives){if(p.mode!=null&&p.mode!==4)continue;const a=j.accessors[p.attributes.POSITION];if(!a.min||!a.max)continue;const b=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max)).applyMatrix4(matrix);
   const hit=probes.filter(q=>q.x>=b.min.x-.001&&q.x<=b.max.x+.001&&q.z>=b.min.z-.001&&q.z<=b.max.z+.001&&b.max.y>=-.15&&b.min.y<=.15);if(!hit.length)continue;
   const pts=Array.from({length:a.count},(_,i)=>new THREE.Vector3(value(a,i,0),value(a,i,1),value(a,i,2)).applyMatrix4(matrix));
   const ix=p.indices!=null?j.accessors[p.indices]:null,count=ix?.count??a.count;
   for(let i=0;i<count;i+=3){const [A,B,C]=[i,i+1,i+2].map(k=>pts[ix?value(ix,k):k]);if(!A||!B||!C)continue;const d=(B.z-C.z)*(A.x-C.x)+(C.x-B.x)*(A.z-C.z);if(Math.abs(d)<1e-10)continue;
    for(const q of hit){const u=((B.z-C.z)*(q.x-C.x)+(C.x-B.x)*(q.z-C.z))/d,v=((C.z-A.z)*(q.x-C.x)+(A.x-C.x)*(q.z-C.z))/d;if(u<-.0001||v<-.0001||u+v>1.0001)continue;const y=u*A.y+v*B.y+(1-u-v)*C.y;if(y>=-.15&&y<=.15&&(q.y===null||y>q.y))q.y=y;}
   }
  }
 }
}
assert.equal(probes.length,26);const supported=probes.filter(p=>p.y!==null).length;
assert.equal(supported,probes.length,'Actual source slab support probes '+supported+'/'+probes.length);
const audit=JSON.parse(fs.readFileSync('architecture/phase15a-living-dining-audit.json','utf8'));
const door=audit.protectedSource.find(r=>r.id==='0heo8rPOjCf99YWpmhxp18');
const doorBounds=new THREE.Box3(new THREE.Vector3(...door.min),new THREE.Vector3(...door.max));
for(const c of g.children.filter(o=>/^DINING_CHAIR_/.test(o.name))){const f=new THREE.Vector3(0,0,-1).transformDirection(c.matrixWorld),start=c.position.clone();for(const dist of [0,.15,.30,.45]){c.position.copy(start).addScaledVector(f,-dist);g.updateWorldMatrix(true,true);const box=bounds(c).translate(new THREE.Vector3(cx,0,cz));assert(!box.intersectsBox(doorBounds),'chair intersects source closed door envelope');}c.position.copy(start);}
g.userData.dispose();
console.log('PHASE15D_DINING_GEOMETRY',JSON.stringify({variants:rows,clearances,sourceFloorProbes:{passed:supported,total:probes.length,min:Math.min(...probes.map(p=>p.y)),max:Math.max(...probes.map(p=>p.y))},sourceDoorClosedEnvelopePassed:true,liveClearanceCertified:false}));
