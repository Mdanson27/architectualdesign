/** Floor-source classification for first-person walking.
 * Small elevated IFC SLA - 003 pads are fittings, not main floor slabs.
 * Do not let a ray-cast step onto their 4.0m tops and mistake that for a
 * walkable first-floor surface at architectural level +3.30m.
 */
export function isWalkableSourceSurface(record){
 if(record.category!=='slabs')return true;
 const name=String(record.mesh?.userData?.ifc?.name||'').trim().toUpperCase();
 if(!/^SLA\s*-\s*003$/.test(name)||record.layer?.level!=='first')return true;
 const width=record.box.max.x-record.box.min.x;
 const depth=record.box.max.z-record.box.min.z;
 return !(width<1.05&&depth<.9 &&
   record.box.min.y>3.65&&record.box.max.y<4.4);
}
