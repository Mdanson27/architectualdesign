import * as THREE from 'three';

/**
 * The IFC export classifies a set of vertical 1.5m × 2.1m glass-like
 * partitions at first-floor Z=-4.29 as SLA - 012 (slabs).
 * An opaque stone finish on those planes closes the upstairs living area.
 * Match the source name, location, orientation and dimensions; never
 * globally treat slabs, external walls or balcony safety guards as glass.
 */
export const VERIFIED_FACADE_INFILL={
  ifcName:'SLA - 012',level:'first',
  xMin:112.6,xMax:117.55,zMin:-4.85,zMax:-4.16,
  minHeight:1.15,maxHeight:2.4,maxThickness:.09
};
const glass=new THREE.MeshPhysicalMaterial({
  color:0xe1f6f9,metalness:0,roughness:.07,
  transparent:true,opacity:.17,depthWrite:false,
  side:THREE.DoubleSide,clearcoat:.84,clearcoatRoughness:.08
});
export function isVerifiedFirstFloorGlassInfill(source,sourceBox,level,origin={x:0,z:0}){
  const cfg=VERIFIED_FACADE_INFILL;
  const name=String(source?.name||'').trim().toUpperCase();
  if(name!==cfg.ifcName||level!==cfg.level||!sourceBox)return false;
  const c=sourceBox.getCenter(new THREE.Vector3()),s=sourceBox.getSize(new THREE.Vector3());
  const thickness=Math.min(s.x,s.z),width=Math.max(s.x,s.z);
  return c.x+origin.x>=cfg.xMin&&c.x+origin.x<=cfg.xMax&&
    c.z+origin.z>=cfg.zMin&&c.z+origin.z<=cfg.zMax &&
    s.y>=cfg.minHeight&&s.y<=cfg.maxHeight &&
    thickness<=cfg.maxThickness&&width>=.9&&width<=2.8;
}
export function applyFacadeInfillTreatment(record,origin={x:0,z:0}){
  const meta=record.mesh.userData.ifc||{};
  if(!isVerifiedFirstFloorGlassInfill(meta,record.box,record.layer.level,origin))return false;
  record.mesh.material=glass;
  record.mesh.renderOrder=2;
  record.mesh.userData.verifiedGlazingInfill=true;
  record.mesh.userData.originalIFCSemantic='SLA - 012';
  return true;
}
export function auditFacadeInfills(records,inside=()=>true,origin={x:0,z:0}){
  const converted=records.filter(r=>inside(r)&&applyFacadeInfillTreatment(r,origin));
  const candidates=converted.map(r=>{
    const c=r.box.getCenter(new THREE.Vector3()),size=r.box.getSize(new THREE.Vector3());
    return {position:c,width:Math.max(size.x,size.z),height:size.y,
      alongX:size.x>=size.z,level:r.layer.level,
      sourceGuids:[r.mesh.userData.ifc?.guid],source:r};
  });
  const panels=[],duplicates=[];
  for(const c of candidates){
    const match=panels.find(p=>p.alongX===c.alongX&&
      Math.abs(p.position.x-c.position.x)<.16&&
      Math.abs(p.position.y-c.position.y)<.13&&
      Math.abs(p.position.z-c.position.z)<.18&&
      Math.abs(p.width-c.width)<.35&&Math.abs(p.height-c.height)<.25);
    if(match){
      c.source.mesh.visible=false;
      c.source.mesh.userData.facadeDuplicateHidden=true;
      match.sourceGuids.push(...c.sourceGuids);
      duplicates.push(c);
    }else panels.push(c);
  }
  function blocksTraversal(from,to,footY,radius=.32){
    for(const p of panels){
      if(footY+1.65<p.position.y-p.height/2||footY+.15>p.position.y+p.height/2)continue;
      const lateral=p.alongX?to.x-p.position.x:to.z-p.position.z;
      if(Math.abs(lateral)>p.width/2+radius)continue;
      const a=p.alongX?from.z-p.position.z:from.x-p.position.x;
      const b=p.alongX?to.z-p.position.z:to.x-p.position.x;
      if(Math.abs(b)<radius+.02&&Math.abs(b)<Math.abs(a)-.0001)return true;
    }
    return false;
  }
  const summary={sourceAlignedPanels:panels.length,
    duplicateIFCPanelsConcealed:duplicates.length,
    sourceGuids:converted.map(r=>r.mesh.userData.ifc?.guid),
    originalIFCVerticesChanged:false,
    appearance:'transparent glass replacing opaque stone on source-verified vertical panels'};
  return {...summary,summary,panels,blocksTraversal};
}
