import * as THREE from 'three';

/**
 * Reversible concept guard and handrail treatment for the actual IFC U-stair.
 *
 * The existing source already contains two tread runs, a 1.72 m intermediate
 * landing and a 3.30 m first-floor slab. The PDF shows the circulation plan
 * but gives no explicit interior balustrade shop drawing. This treatment is
 * therefore tagged as an architectural safety PREVIEW, not engineered work.
 *
 * No additional flight, structural bridge, or fake landing is created.
 */
const metal=new THREE.MeshStandardMaterial({color:'#424c50',metalness:.72,roughness:.33});
const timber=new THREE.MeshStandardMaterial({color:'#94745a',metalness:0,roughness:.47});
const jointMat=new THREE.MeshStandardMaterial({color:'#d9d1c6',metalness:.04,roughness:.68});
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const C=rec=>rec.box.getCenter(new THREE.Vector3());
const round=x=>Number(x.toFixed(3));
const distanceXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function cylinder(parent,start,end,r,material,name,sides=10){
 const delta=end.clone().sub(start),length=delta.length();
 if(length<.008)return null;
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,sides),material);
 mesh.position.copy(start).add(end).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());
 mesh.name=name;parent.add(mesh);return mesh;
}
function post(parent,anchor,height,tag){
 cylinder(parent,anchor.clone().add(V(0,.03,0)),anchor.clone().add(V(0,height,0)),.0185,metal,tag,8);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.034,8,5),metal);
 cap.position.copy(anchor).add(V(0,height-.004,0));cap.name='SAFE_RAIL_POST_CAP';
 parent.add(cap);
}
function interpolate(a,b,t){
 const foot=THREE.MathUtils.lerp(a.y,b.y,t);
 return V(THREE.MathUtils.lerp(a.x,b.x,t),foot,THREE.MathUtils.lerp(a.z,b.z,t));
}
function addGuard(parent,points,label,height=1.05){
 if(points.length<2)throw Error('Safety railing requires two anchored points');
 const colliders=[];
 const anchor=(p,h)=>p.clone().add(V(0,h,0));
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dist=distanceXZ(a,b);
  if(dist<.008)continue;
  cylinder(parent,anchor(a,height),anchor(b,height),.032,timber,'CONTINUOUS_HANDRAIL_'+label,12);
  cylinder(parent,anchor(a,.52),anchor(b,.52),.013,metal,'MID_GUARD_RAIL_'+label,8);
  const segments=Math.max(1,Math.ceil(dist/.145));
  for(let j=0;j<=segments;j++){
   if(i>0&&j===0)continue;
   const q=interpolate(a,b,j/segments);
   // Guard infill follows the slope and is anchored at tread/landing elevations.
   cylinder(parent,anchor(q,.035),anchor(q,height-.045),.0105,metal,'VERTICAL_GUARD_BALUSTER_'+label,7);
  }
  colliders.push({a:a.clone(),b:b.clone(),label,walkHeightMin:Math.min(a.y,b.y),walkHeightMax:Math.max(a.y,b.y)});
 }
 for(let i=0;i<points.length;i++){
  if(i%2!==0&&i!==points.length-1)continue;
  post(parent,points[i],height,'GUARD_POST_'+label);
 }
 return colliders;
}
function addWallHandrail(parent,points,label,height=.91){
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1];
  if(distanceXZ(a,b)<.008)continue;
  cylinder(parent,a.clone().add(V(0,height,0)),b.clone().add(V(0,height,0)),.031,timber,'WALL_HANDRAIL_'+label,12);
  if(i%3===0){
   const p=a.clone().add(V(0,height-.045,0));
   // Small mounting disks show a wall-supported rail rather than floating pipe.
   const disk=new THREE.Mesh(new THREE.SphereGeometry(.044,8,7),metal);
   disk.position.copy(p);disk.name='HANDRAIL_FIXING_'+label;parent.add(disk);
  }
 }
}
function nearest(array,target){
 return array.reduce((best,x)=>Math.abs(C(x).y-target)<Math.abs(C(best).y-target)?x:best);
}
function getSourceStair(records,inside){
 const list=records.filter(r=>inside(r)&&/\bSF TREAD\s*-\s*\d+/i.test(r.mesh.userData.ifc?.name||''));
 const landings=records.filter(r=>inside(r)&&/\bSL TREAD\s*-\s*\d+/i.test(r.mesh.userData.ifc?.name||''));
 // The staircase is in two flights split by the source's intermediate landing.
 const lower=list.filter(r=>C(r).y<1.68).sort((a,b)=>C(a).y-C(b).y);
 const upper=list.filter(r=>C(r).y>1.82&&C(r).y<3.55).sort((a,b)=>C(a).y-C(b).y);
 const landing=landings.find(r=>Math.abs(C(r).y-1.72)<.22);
 return {lower,upper,landing};
}
export function createSourceStairSafety(records,scene,inside=()=>true){
 const {lower,upper,landing}=getSourceStair(records,inside);
 if(lower.length<7||upper.length<7||!landing){
  return {root:null,sourceVerified:false,
   summary:{sourceVerified:false,reason:'Missing source-derived flights or landing'},
   blocksTraversal:()=>false,transitionDeck:null,walkSurfaceBox:null,updateVisibility(){}};
 }
 const group=new THREE.Group();group.name='SOURCE_STAIR_SAFETY_ENHANCEMENT';
 scene.add(group);
 const lowerBounds=new THREE.Box3(),upperBounds=new THREE.Box3();
 lower.forEach(r=>lowerBounds.union(r.box));upper.forEach(r=>upperBounds.union(r.box));
 const floorLanding=landing.box.max.y;
 const upperLevel=Math.round(upper[upper.length-1].box.max.y*100)/100;
 const lowInner=lowerBounds.min.z-.065;
 const highInner=upperBounds.max.z+.065;
 const lowWall=lowerBounds.max.z-.105;   // room-side of existing east wall
 const highWall=upperBounds.min.z+.105;  // room-side of existing west wall

 const railLower=lower.map(r=>{
  const c=C(r);return V(c.x,r.box.max.y,lowInner);
 });
 const railUpper=upper.map(r=>{
  const c=C(r);return V(c.x,r.box.max.y,highInner);
 });
 const bendX=landing.box.max.x-.24;
 const turn=[
  V(bendX,floorLanding,lowInner),
  V(bendX-.11,floorLanding,(lowInner+highInner)/2),
  V(bendX,floorLanding,highInner)
 ];
 const innerPath=[...railLower,...turn,...railUpper];
 const colliders=addGuard(group,innerPath,'CENTRE_U_FLIGHTS');
 // Where the source walls protect the two external sides, fit continuous,
 // wall-supported handrails rather than inappropriate extra freestanding guards.
 const lowerWallRail=lower.map(r=>V(C(r).x,r.box.max.y,lowWall));
 const upperWallRail=upper.map(r=>V(C(r).x,r.box.max.y,highWall));
 addWallHandrail(group,lowerWallRail,'LOWER_WALL');
 addWallHandrail(group,upperWallRail,'UPPER_WALL');
 // The outer return of the intermediate landing is a full-height IFC wall.
 const landingHandrail=[
  V(landing.box.min.x+.14,floorLanding,lowWall),
  V(landing.box.min.x+.14,floorLanding,highWall)
 ];
 addWallHandrail(group,landingHandrail,'MID_LANDING_RETURN');

 // Protect first-floor slab edge beside stair opening. Critically, the
 // upper-flight egress z-range remains unobstructed.
 const top=upper[upper.length-1];
 const slabEdgeX=top.box.max.x+.14;
 const edgePath=[
  V(slabEdgeX,upperLevel,highInner+.105),
  V(slabEdgeX,upperLevel,lowWall-.012)
 ];
 colliders.push(...addGuard(group,edgePath,'FIRST_FLOOR_VOID_EDGE'));

 // Source GLB sampling established ~0.10m between the final tread's front and
 // the supported first-floor slab. Cover ONLY that finish joint, not an invented
 // bridge over the stairwell. The finished top remains source level +3.30m.
 const last=upper[upper.length-1];
 const transitionWidth=.23;
 const deck=new THREE.Mesh(new THREE.BoxGeometry(transitionWidth,.027,
  Math.max(.3,upperBounds.max.z-upperBounds.min.z-.07)),jointMat);
 deck.position.set(last.box.max.x+.063,upperLevel-.0135,
  (upperBounds.min.z+upperBounds.max.z)/2);
 deck.name='SOURCE_STAIR_FIRST_FLOOR_TRANSITION_NOSING';
 deck.userData={visualFinishOnly:true,level:upperLevel,
  source:'Source upper tread and first-floor slab, checked at 3.30m'};
 group.add(deck);
 group.updateWorldMatrix(true);
 const walkSurfaceBox=new THREE.Box3().setFromObject(deck);

 function blocksTraversal(from,to,footY,radius=.32){
  for(const s of colliders){
   if(footY<s.walkHeightMin-.65 || footY>s.walkHeightMax+.55)continue;
   const vx=s.b.x-s.a.x,vz=s.b.z-s.a.z;
   const distance=(p)=>{
    const t=THREE.MathUtils.clamp(((p.x-s.a.x)*vx+(p.z-s.a.z)*vz)/(vx*vx+vz*vz||1),0,1);
    return Math.hypot(p.x-(s.a.x+vx*t),p.z-(s.a.z+vz*t));
   };
   const d0=distance(from),d1=distance(to);
   if(d1<radius+.04&&d1<d0-.00001)return true;
  }
  return false;
 }
 const summary={
  sourceVerified:true,sourceTreads:lower.length+upper.length,
  originalLanding:1,upperFloorMetres:upperLevel,intermediateLandingMetres:round(floorLanding),
  centralGuard:'continuous U-flights',wallHandrails:3,firstFloorVoidGuard:1,
  upperStairExitUnobstructed:true,transitionJointMetres:transitionWidth,
  guardHeightMetres:1.05,conceptOnly:true,engineeredOrCodeCertified:false,
  existingIFCChanged:false,
  sourceReferences:lower.concat(upper,[landing]).map(r=>r.mesh.userData.ifc?.guid)
 };
 function updateVisibility(){group.visible=true;}
 return {root:group,summary,sourceVerified:true,blocksTraversal,
  transitionDeck:deck,walkSurfaceBox,updateVisibility,colliders,upperPath:railUpper,lowerPath:railLower};
}
