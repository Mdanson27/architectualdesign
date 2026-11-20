import * as THREE from 'three';

/**
 * IFC anchored functional architectural door previews.
 * Never alter the architect's original GLB or IFC source data.
 * Replace multi-part closed IFC door assemblies with actual 3D leaves and frames
 * that continue to exist, cast collision rays and visibly swing/slide when opened.
 */
const wood=new THREE.MeshStandardMaterial({color:0x866047,roughness:.62,metalness:0,side:THREE.DoubleSide});
const darkwood=new THREE.MeshStandardMaterial({color:0x593c2e,roughness:.52,side:THREE.DoubleSide});
const frameMat=new THREE.MeshStandardMaterial({color:0xa17d62,roughness:.65});
const metal=new THREE.MeshStandardMaterial({color:0xb6b2a2,roughness:.32,metalness:.65});
const glass=new THREE.MeshPhysicalMaterial({color:0xc7e5e2,roughness:.10,metalness:.08,transparent:true,opacity:.44,side:THREE.DoubleSide,depthWrite:false});

function element(group,material,w,h,d,x,y,z){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);
 mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
 return mesh;
}
function center(rec){return rec.box.getCenter(new THREE.Vector3());}
function isAlongX(rec){
 const size=rec.box.getSize(new THREE.Vector3());
 return size.x>=size.z;
}
export function clusterDoorSources(records,inside=()=>true){
 const sources=records.filter(r=>inside(r) &&
  (r.category==='doors' || (r.category==='proxies'&&/^DOO\b/i.test(r.mesh.userData.ifc?.name||''))) &&
  ['ground','first'].includes(r.layer.level) &&
  r.box.getSize(new THREE.Vector3()).y>1.65
 ).sort((a,b)=>(a.layer.level.localeCompare(b.layer.level)||center(a).x-center(b).x||center(a).z-center(b).z));
 const groups=[];
 for(const record of sources){
  const position=center(record);
  const size=record.box.getSize(new THREE.Vector3());
  const along=isAlongX(record);
  const candidate=groups.find(g=>{
   if(g.level!==record.layer.level||g.alongX!==along)return false;
   const here=g.bounds.getCenter(new THREE.Vector3());
   const sz=g.bounds.getSize(new THREE.Vector3());
   return Math.hypot(here.x-position.x,here.z-position.z)<.39 &&
      Math.abs(sz.y-size.y)<.30 &&
      Math.abs(Math.max(sz.x,sz.z)-Math.max(size.x,size.z))<.55;
  });
  if(candidate){candidate.sources.push(record);candidate.bounds.union(record.box);}
  else groups.push({id:groups.length+1,level:record.layer.level,alongX:along,sources:[record],bounds:record.box.clone()});
 }
 return groups;
}
function addKnob(group,x,y,z,side){
 const x0=x,zd=z+.054*side;
 element(group,metal,.035,.11,.04,x0,y,zd);
 element(group,metal,.13,.025,.05,x0+.06,y,zd+.035*side);
}
function makeWoodLeaf(group,width,height,hinge,door){
 const leaf=new THREE.Group();
 leaf.position.x=hinge;
 const half=width/2;
 const sign=hinge<0?1:-1;
 const face=sign*half;
 const main=element(leaf,wood,width-.03,height-.16,.065,face,height/2+.04,0);
 main.userData.doorId=door.id;
 // Horizontal panels sit in slightly inset boxes and remain clearly visible while opening.
 for(const y of [height*.26,height*.67]){
  element(leaf,darkwood,width*.77,height*.29,.009,face,y+.06,.04);
  element(leaf,wood,width*.72,height*.24,.015,face,y+.06,.048);
 }
 const handleX=face+sign*width*.35;
 addKnob(leaf,handleX,1.02,0,1);
 addKnob(leaf,handleX,1.02,0,-1);
 group.add(leaf);return {pivot:leaf,main,side:sign};
}
function makeGlassSlider(group,width,height,x,door){
 const leaf=new THREE.Group();leaf.position.x=x;
 const main=element(leaf,glass,width-.015,height-.18,.045,0,height/2+.05,0);
 main.userData.doorId=door.id;
 for(const side of [-1,1])element(leaf,darkwood,.044,height-.13,.057,side*width/2,height/2+.04,0);
 for(const ht of [.08,height-.04])element(leaf,darkwood,width,.04,.055,0,ht,0);
 element(leaf,metal,.035,.28,.035,width*.37,1.02,.05);
 group.add(leaf);return {pivot:leaf,main};
}
function makeDoor(group,index){
 const size=group.bounds.getSize(new THREE.Vector3());
 const c=group.bounds.getCenter(new THREE.Vector3());
 const width=Math.max(.48,Math.min(4.4,group.alongX?size.x:size.z));
 const height=Math.max(1.83,Math.min(2.78,size.y));
 const door={id:index+1,level:group.level,source:group.sources,position:c,groundY:group.bounds.min.y,width,height,
  alongX:group.alongX,current:0,target:0,panels:[],visual:new THREE.Group(),style:width>2.05?'slide':width>1.38?'double':'hinge'};
 door.visual.name='FUNCTIONAL_IFC_DOOR_'+door.id;
 door.visual.position.set(c.x,group.bounds.min.y,c.z);
 // Local X is the width direction; local Z points through the wall.
 door.visual.rotation.y=group.alongX?0:Math.PI/2;
 const frame=new THREE.Group();door.visual.add(frame);
 const post=.072;
 element(frame,frameMat,post,height+.07,.13,-width/2, (height+.07)/2,0);
 element(frame,frameMat,post,height+.07,.13,width/2, (height+.07)/2,0);
 element(frame,frameMat,width+.12,.09,.13,0,height+.045,0);
 // No ground crossbar: the person can cross the actual IFC floor without a step obstruction.
 if(door.style==='slide'){
  const w=width/2+.012;
  for(const direction of [-1,1]){
   const item=makeGlassSlider(door.visual,w,height,direction*width/4,door);
   item.direction=direction;item.closedX=direction*width/4;
   door.panels.push(item);
  }
 }else if(door.style==='double'){
  for(const sign of [-1,1])door.panels.push(makeWoodLeaf(door.visual,width/2,height,sign*width/2,door));
 }else door.panels.push(makeWoodLeaf(door.visual,width,height,-width/2,door));
 // Door source meshes are kept in memory as intact snapshots, for reinspection.
 for(const record of door.source)record.mesh.userData.functionallyReplacedDoorId=door.id;
 door.visual.userData.doorId=door.id;
 return door;
}
function doorLocal(door,vector){
 door.visual.updateWorldMatrix(true,false);
 return door.visual.worldToLocal(vector.clone());
}
export function createDoorSystem(records,scene,inside=()=>true){
 const clusters=clusterDoorSources(records,inside);
 const doors=clusters.map(makeDoor);
 const root=new THREE.Group();root.name='VISIBLE_INTERACTIVE_DOORS';
 for(const d of doors){root.add(d.visual);}
 scene.add(root);
 let changed=null;
 function nearest(point,footY,maxRange=1.85){
  let best=null,bestDistance=maxRange;
  for(const d of doors){
   if(!d.visual.visible||Math.abs(footY-d.groundY)>1.20)continue;
   const q=doorLocal(d,new THREE.Vector3(point.x,footY+1.0,point.z));
   const dist=Math.hypot(Math.max(0,Math.abs(q.x)-d.width/2),q.z);
   if(dist<bestDistance){best=d;bestDistance=dist;}
  }
  return best;
 }
 function toggle(door,viewer){
  if(!door||door.removedFromPlan)return {ok:false,reason:'This transition has no door in the corrected floor plan'};
  if(door.target>0.5){
   const p=doorLocal(door,new THREE.Vector3(viewer.x,door.groundY+1,viewer.z));
   if(Math.abs(p.x)<door.width/2+.38 && Math.abs(p.z)<.62){
    return {ok:false,reason:'Move away from the doorway before closing'};
   }
  }
  door.target=door.target>.5?0:1;
  changed=door;
  return {ok:true,door,open:door.target>.5};
 }
 function update(dt){
  for(const d of doors){
   if(d.removedFromPlan)continue;
   d.current=THREE.MathUtils.damp(d.current,d.target,7,Math.min(dt,.1));
   if(Math.abs(d.current-d.target)<.002)d.current=d.target;
   for(const p of d.panels){
    if(d.style==='slide')p.pivot.position.x=p.closedX+p.direction*d.width*.51*d.current;
    else p.pivot.rotation.y=(p.side>0?-1:1)*Math.PI*.49*d.current;
   }
  }
  root.updateMatrixWorld(true);
 }
 function updateVisibility({floor,mode,sectionEnabled,showSurroundings,inside}){
  for(const d of doors){
   const onFloor=!sectionEnabled||mode==='walk'||floor==='all'||
    (floor==='ground'?d.level==='ground':true);
   d.visual.visible=onFloor&&!d.removedFromPlan;
  }
 }
 function collisionMeshes(){
  const all=[];
  for(const d of doors){
   if(!d.visual.visible)continue;
   for(const p of d.panels)if(p.main.visible)all.push(p.main);
  }
  return all;
 }
 function blocksTraversal(from,to,footY,radius=.32){
  // A narrow seam between two decorative panels must not become a walkable
  // opening. Until the animation is mostly open, the door aperture is solid.
  // Permit walking AWAY from a door instead of trapping the player at its edge.
  for(const d of doors){
   if(!d.visual.visible||d.current>=.85||Math.abs(footY-d.groundY)>1.24)continue;
   const a=doorLocal(d,from),b=doorLocal(d,to);
   if(Math.abs(b.x)>d.width/2+Math.min(.18,radius*.4))continue;
   const blockDepth=.045+radius;
   if(Math.abs(b.z)<blockDepth && Math.abs(b.z)<Math.abs(a.z)+.0001)return true;
   if(a.z*b.z<0 && Math.abs(a.z)<.36&&Math.abs(b.z)<.36)return true;
  }
  return false;
 }
 function isOpenDoorway(point,footY){
  for(const d of doors){
   if(!d.visual.visible||d.current<.85||Math.abs(footY-d.groundY)>1.25)continue;
   const q=doorLocal(d,point);
   if(Math.abs(q.x)<d.width/2-.075&&Math.abs(q.z)<.46 &&
      q.y>.09&&q.y<d.height-.09)return true;
  }
  return false;
 }
 function raycastDoorFromCamera(camera,maxRange=2.7){
  const ray=new THREE.Raycaster();
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  ray.set(camera.position,dir);ray.far=maxRange;
  const hit=ray.intersectObjects(collisionMeshes(),false)[0];
  return hit?doors.find(d=>d.id===hit.object.userData.doorId)||null:null;
 }
 return {root,doors,sourceCount:clusters.reduce((n,g)=>n+g.sources.length,0),nearest,toggle,update,
  collisionMeshes,blocksTraversal,isOpenDoorway,updateVisibility,raycastDoorFromCamera};
}
