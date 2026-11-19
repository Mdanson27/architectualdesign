import * as THREE from 'three';

/**
 * Non-structural first-person support for the S1 curated compound.
 * Uses the actual plan-aligned lawn/paving surface; never creates floors
 * inside the house or beyond the plotted boundary.
 * This is viewer site geometry, NOT a surveyed legal site outline.
 */
export function createSiteWalkSupport(site,origin){
 const {house,root,bounds}=site;
 const front=site.siteFrontZ;
 const minX=bounds.min.x+origin.x,maxX=bounds.max.x+origin.x;
 const minZ=bounds.min.z+origin.z;
 const rightChamfer=4.2;
 const polygon=[
  [minX,minZ],[maxX,minZ],[maxX,front-rightChamfer],
  [maxX-rightChamfer,front],[minX,front]
 ];
 const siteY=-.255;
 const radius=.32;
 // Exact walk boundaries are inset to prevent slipping through perimeter walls.
 const footprint={minX:house.minX,maxX:house.maxX,minZ:house.minZ,maxZ:house.maxZ};
 function insidePlot(x,z,margin=radius){
  return x>=minX+margin && x<=maxX-margin &&
   z>=minZ+margin && z<=front-margin &&
   // Inside the chamfer the permitted half plane is below the diagonal.
   (x<=maxX-rightChamfer-margin ||
    z<=front+maxX-rightChamfer-x-margin*1.4143);
 }
 function insideHouse(x,z,pad=0){
  return x>footprint.minX-pad&&x<footprint.maxX+pad&&
   z>footprint.minZ-pad&&z<footprint.maxZ+pad;
 }
 const blockers=[];
 root.updateWorldMatrix(true,true);
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  if(!/^(APPROVED_BOUNDARY_WALL|APPROVED_BOUNDARY_PILLAR|S1_DUST_BIN|FRONT_PLANTER_EDGE)$/.test(obj.name))return;
  const box=new THREE.Box3().setFromObject(obj);
  blockers.push({name:obj.name,box});
 });
 // Trees are physical trunks, not impassable canopies.
 root.traverse(obj=>{
  if(obj.name!=='PLAN_LANDSCAPE_TREE')return;
  const p=obj.getWorldPosition(new THREE.Vector3());
  blockers.push({name:'TREE_TRUNK',circle:[p.x,p.z,.27]});
 });
 function blockAt(x,z,y=siteY){
  for(const record of blockers){
   if(record.circle){
    const [cx,cz,rad]=record.circle;
    if(Math.hypot(x-cx,z-cz)<rad+radius)return record.name;
    continue;
   }
   const box=record.box;
   if(y+1.35<box.min.y || y+.27>box.max.y)continue;
   if(x>box.min.x-radius&&x<box.max.x+radius&&
      z>box.min.z-radius&&z<box.max.z+radius)return record.name;
  }
  return null;
 }
 function sample(x,z,targetY,maxRise=.27,maxFall=.67){
  // No fake ground in a bedroom, stair shaft or below elevated balconies.
  if(targetY>1.25||!insidePlot(x+origin.x,z+origin.z))return null;
  const gx=x+origin.x,gz=z+origin.z;
  if(insideHouse(gx,gz,.012))return null;
  if(siteY-targetY>maxRise+.02 || targetY-siteY>maxFall+.02)return null;
  return {x,z,y:siteY,source:'S1-curated-compound'};
 }
 function blocksTraversal(x,z,nextX,nextZ,y){
  if(y>1.25)return false;
  const gx=nextX+origin.x,gz=nextZ+origin.z;
  if(!insidePlot(gx,gz))return true;
  // Only test site obstacles outside the actual footprint. Real IFC walls
  // continue to block interior movement and are evaluated separately.
  if(insideHouse(gx,gz,.02))return false;
  return Boolean(blockAt(nextX,nextZ,y));
 }
 // This outdoor standing point is just beyond the central front balcony/front
 // terrace (not on a planter or outside the property).
 function outdoorSpawn(){
  const candidates=[[114.75,house.maxZ+2.1],[115.5,house.maxZ+2.5],
    [113.7,house.maxZ+2.1],[116.6,house.maxZ+2.8]];
  for(const [gx,gz] of candidates){
   const x=gx-origin.x,z=gz-origin.z;
   if(sample(x,z,0,.4,.7)&&!blockAt(x,z,siteY))
    return new THREE.Vector3(x,siteY,z);
  }
  return null;
 }
 return {sample,blocksTraversal,outdoorSpawn,insidePlot,insideHouse,blockAt,
  summary:{siteY,plotMetres:[48.5,25],house,blockerCount:blockers.length,
    preservesIFC:true,walkSurface:'curated S1 lawn / paving, excluding house',
    noWalkingOutsideBoundary:true,noIndoorFakeGround:true}};
}
