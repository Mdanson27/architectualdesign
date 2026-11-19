/** Reversible collision-only support at IFC slab seams, never visible geometry.
 * Balcony/source slab exports may leave 10–30mm gaps or use downward-only
 * faces. This bridges at most 110mm using genuine neighbouring slab bounds.
 * It does not permit travel over an unsupported void or to any invented floor.
 */
export function sourceSlabSeamSupport(records,x,z,targetY,maxRise=.9,maxFall=1.25,visible=()=>true){
 if(targetY<2.75||targetY>3.65)return null;
 const tolerance=.11,valid=[];
 for(const r of records){
  if(!visible(r)||r.layer?.level!=='first')continue;
  const name=String(r.mesh?.userData?.ifc?.name||'').toUpperCase();
  if(!/^SLA\s*-\s*(001|005|013|014)$/.test(name))continue;
  const b=r.box,dx=b.max.x-b.min.x,dz=b.max.z-b.min.z,dy=b.max.y-b.min.y;
  if(dx>.8+7.2||dz>6.5||dy>.62||dx<.15||dz<.15)continue;
  const y=b.max.y;
  if(y<2.68||y>3.57||y-targetY>maxRise-.02||targetY-y>maxFall)continue;
  const overX=Math.max(b.min.x-x,0,x-b.max.x);
  const overZ=Math.max(b.min.z-z,0,z-b.max.z);
  if(overX>tolerance||overZ>tolerance)continue;
  const dist=Math.hypot(overX,overZ);
  valid.push({record:r,y,dist,score:dist*2.5+Math.abs(y-targetY)*.3});
 }
 valid.sort((a,b)=>a.score-b.score);
 return valid[0]??null;
}
