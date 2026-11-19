import * as THREE from 'three';

/**
 * S1 first-floor plan + S2 front/side elevations.
 * Reconstruct *viewer presentation*, without editing IFC vertex buffers.
 *
 * The three source supported balcony slabs occur at y=3.20m.
 * S2 shows glazed guards, not 3.3m tall enclosing masonry at exposed edges.
 * We only conceal precisely identified first-floor SW-024 facade infills.
 * All columns, rear room walls, access doors and source floor slabs survive.
 */
export const BALCONY_SPECS=Object.freeze([
  {
    id:'front-west',label:'Bedroom front balcony',
    slabName:'SLA - 005',slabBox:[107.64,110.08,.04,1.55],
    door:[108.8,-.06],floorY:3.2,
    segments:[
      [[107.72,1.46],[109.98,1.46]],
      [[107.72,.59],[107.72,1.46]],
      [[109.98,.76],[109.98,1.46]]
    ],
    outerWall:[],
    drawing:'S1 first-floor plan / S2 front elevation, west balcony'
  },
  {
    id:'front-family',label:'Family room front balcony',
    slabName:'SLA - 005',slabBox:[112.15,119.21,-2.66,1.42],
    door:[114.93,-.05],floorY:3.2,
    segments:[
      [[112.38,1.35],[119.06,1.35]],
      [[119.06,.10],[119.06,1.35]]
    ],
    outerWall:[{name:'SW - 024',level:'first',x:[112.15,119.20],z:[1.16,1.44],y:[3.0,6.7],minYSpan:2.8}],
    drawing:'S1 first-floor plan / S2 front elevation, family room balcony'
  },
  {
    id:'east-projection',label:'Eastern side balcony',
    slabName:'SLA - 005',slabBox:[119.92,122.64,-9.49,-5.48],
    door:[119.83,-7.395],floorY:3.2,
    segments:[
      [[122.52,-9.29],[122.52,-5.62]],
      [[119.97,-9.29],[122.52,-9.29]],
      [[119.97,-5.62],[122.52,-5.62]]
    ],
    outerWall:[
      {name:'SW - 024',level:'first',x:[122.38,122.67],z:[-9.32,-5.48],y:[3.0,6.7],minYSpan:2.8},
      {name:'SW - 024',level:'first',x:[119.90,122.67],z:[-9.48,-9.20],y:[3.0,6.7],minYSpan:2.8},
      {name:'SW - 024',level:'first',x:[119.70,122.67],z:[-5.76,-5.48],y:[3.0,6.7],minYSpan:2.8}
    ],
    drawing:'S1 first-floor plan / S2 side elevation, east balcony projection'
  }
]);

const metal=new THREE.MeshStandardMaterial({color:0x293d42,metalness:.72,roughness:.32});
const glass=new THREE.MeshPhysicalMaterial({
 color:0xc6e5e6,metalness:0,roughness:.08,
 transparent:true,opacity:.23,depthWrite:false,
 side:THREE.DoubleSide,clearcoat:.8,clearcoatRoughness:.08
});
function sourceBounds(record,origin){
 const b=record.box;
 return {x0:b.min.x+origin.x,x1:b.max.x+origin.x,
   z0:b.min.z+origin.z,z1:b.max.z+origin.z,
   y0:b.min.y,y1:b.max.y};
}
function matchBox(b,[x0,x1,z0,z1],tol=.12){
 return Math.abs(b.x0-x0)<tol&&Math.abs(b.x1-x1)<tol&&
   Math.abs(b.z0-z0)<tol&&Math.abs(b.z1-z1)<tol;
}
function matchesFacadeWall(record,origin,spec){
 if(record.category!=='walls'||record.layer.level!=='first')return false;
 const name=String(record.mesh.userData.ifc?.name||'').trim().toUpperCase();
 const b=sourceBounds(record,origin);
 return spec.outerWall.some(x=>name===x.name && x.level===record.layer.level &&
   b.y1-b.y0>=x.minYSpan && b.y0>x.y[0] && b.y1<x.y[1] &&
   b.x0>=x.x[0]-.08&&b.x1<=x.x[1]+.08 &&
   b.z0>=x.z[0]-.08&&b.z1<=x.z[1]+.08);
}
function beam(group,a,b,r,name){
 const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);
 const dir=vb.clone().sub(va),length=dir.length();
 if(length<.005)return;
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,9),metal);
 m.position.copy(va).add(vb).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 m.name=name;group.add(m);
}
function makeGuard(group,spec,origin){
 const segments=[];
 let glassCount=0,postCount=0;
 for(const [from,to] of spec.segments){
  const ax=from[0]-origin.x,az=from[1]-origin.z;
  const bx=to[0]-origin.x,bz=to[1]-origin.z;
  const floor=spec.floorY;
  const len=Math.hypot(bx-ax,bz-az);
  const count=Math.max(1,Math.ceil(len/1.08));
  for(let i=0;i<count;i++){
   const t0=i/count,t1=(i+1)/count;
   const x0=ax+(bx-ax)*t0,z0=az+(bz-az)*t0;
   const x1=ax+(bx-ax)*t1,z1=az+(bz-az)*t1;
   const dist=Math.hypot(x1-x0,z1-z0);
   // Glass is an actual transparent 3D panel, not an opaque line on a wall.
   const panel=new THREE.Mesh(new THREE.BoxGeometry(dist-.055,.87,.016),glass);
   panel.position.set((x0+x1)/2,floor+.54,(z0+z1)/2);
   panel.rotation.y=-Math.atan2(z1-z0,x1-x0);
   panel.renderOrder=3;
   panel.name='S2_GLAZED_BALCONY_GUARD_'+spec.id;group.add(panel);
   glassCount++;
   if(i===0){beam(group,[x0,floor+.07,z0],[x0,floor+1.08,z0],.018,'BALCONY_GUARD_POST');postCount++;}
   beam(group,[x1,floor+.07,z1],[x1,floor+1.08,z1],.018,'BALCONY_GUARD_POST');postCount++;
   beam(group,[x0,floor+1.075,z0],[x1,floor+1.075,z1],.022,'BALCONY_HANDRAIL');
   beam(group,[x0,floor+.105,z0],[x1,floor+.105,z1],.016,'BALCONY_BOTTOM_RAIL');
  }
  segments.push({a:new THREE.Vector3(ax,floor,az),b:new THREE.Vector3(bx,floor,bz),
    height:1.09,source:'S2 glass balustrade'});
 }
 return {segments,glassCount,postCount};
}
function pointSegmentDistance2D(x,z,a,b){
 const vx=b.x-a.x,vz=b.z-a.z;
 const t=THREE.MathUtils.clamp(((x-a.x)*vx+(z-a.z)*vz)/(vx*vx+vz*vz||1),0,1);
 return Math.hypot(x-(a.x+vx*t),z-(a.z+vz*t));
}
export function createSourceBalconyRestoration(records,scene,origin,inside=()=>true){
 const root=new THREE.Group();root.name='S1_S2_VERIFIED_GLASS_BALCONIES';
 scene.add(root);
 const concealed=new Set();
 const balconies=[];
 const allSegments=[];
 for(const spec of BALCONY_SPECS){
  // Never fabricate a balcony in the absence of its actual IFC structural floor.
  const slabs=records.filter(r=>inside(r)&&r.layer.level==='first'&&
   String(r.mesh.userData.ifc?.name||'').trim().toUpperCase()===spec.slabName&&
   matchBox(sourceBounds(r,origin),spec.slabBox,.09)&&
   Math.abs(r.box.max.y-spec.floorY)<.10&&
   r.box.max.y-r.box.min.y>=.32);
  const entrance=records.filter(r=>inside(r)&&r.layer.level==='first'&&
    /^DOO\s*-/.test(String(r.mesh.userData.ifc?.name||''))&&
    Math.abs((r.box.min.x+r.box.max.x)/2+origin.x-spec.door[0])<.23 &&
    Math.abs((r.box.min.z+r.box.max.z)/2+origin.z-spec.door[1])<.26);
  if(!slabs.length||!entrance.length){
   balconies.push({id:spec.id,label:spec.label,verified:false,reason:'Source slab or balcony entrance missing',sourceSlabCount:slabs.length,sourceDoors:entrance.length});
   continue;
  }
  const wallCandidates=records.filter(r=>inside(r)&&matchesFacadeWall(r,origin,spec));
  wallCandidates.forEach(w=>concealed.add(w));
  const obj=new THREE.Group();obj.name='SOURCE_BALCONY_'+spec.id;
  root.add(obj);
  const guards=makeGuard(obj,spec,origin);
  allSegments.push(...guards.segments);
  balconies.push({
   id:spec.id,label:spec.label,verified:true,
   floorMetres:spec.floorY,sourceSlabCount:slabs.length,
   sourceSlabGuids:slabs.map(s=>s.mesh.userData.ifc.guid),
   sourceEntranceGuids:entrance.map(s=>s.mesh.userData.ifc.guid),
   concealedOpaqueEdgeWallGuids:wallCandidates.map(r=>r.mesh.userData.ifc.guid),
   guardPanels:guards.glassCount,guardHeight:1.075,
   drawing:spec.drawing,
   approximateDeck:spec.slabBox,
   sourceGeometryPreserved:true
  });
 }
 function blocksTraversal(from,to,footY,radius=.32){
  if(footY<2.65||footY>3.65)return false;
  for(const segment of allSegments){
   const da=pointSegmentDistance2D(from.x,from.z,segment.a,segment.b);
   const db=pointSegmentDistance2D(to.x,to.z,segment.a,segment.b);
   if(db<=radius+.035 && db<da-.00001)return true;
  }
  return false;
 }
 return {root,concealed,balconies,blocksTraversal,
  summary:{restored:balconies.filter(b=>b.verified).length,
    expected:BALCONY_SPECS.length,
    concealedOpaqueEdgeMeshes:concealed.size,
    sourcePreserved:true,
    balconies}};
}
