import * as THREE from 'three';
// Clip grid cells to every triangle of a concave provisional room polygon.
// Only source-supported fragments are rendered. No collision geometry changes.
function clip(poly,axis,limit,sign){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a[axis]-limit),db=sign*(b[axis]-limit);
  if(da>=-1e-9)out.push(a);
  if((da>1e-9&&db< -1e-9)||(da< -1e-9&&db>1e-9)){
   const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
  }else if(da< -1e-9&&Math.abs(db)<=1e-9)out.push(b);
 }
 return out;
}
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
export function buildClippedFloor({polygon,origin={x:0,z:0},step=.55,sample,datum,tolerance=.18,offset=.014,uvScale=.55}){
 const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const triangles=THREE.ShapeUtils.triangulateShape(polygon.map(p=>new THREE.Vector2(...p)),[]).map(t=>t.map(i=>polygon[i]));
 const positions=[],uvs=[],cells=new Set(),cache=new Map();let supportedArea=0,skippedArea=0,cutFragments=0;
 const probe=(x,z)=>{const key=x.toFixed(5)+','+z.toFixed(5);if(!cache.has(key))cache.set(key,sample(x-(origin.x||0),z-(origin.z||0),datum));return cache.get(key);};
 for(let ix=Math.floor(minX/step);ix<Math.ceil(maxX/step);ix++)for(let iz=Math.floor(minZ/step);iz<Math.ceil(maxZ/step);iz++){
  const x=ix*step,z=iz*step;
  for(const tri of triangles){
   let p=clip(clip(clip(clip(tri,0,x,1),0,x+step,-1),1,z,1),1,z+step,-1);
   if(p.length<3)continue;const a=area(p);if(a<1e-7)continue;
   const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length;
   const hit=probe(cx,cz),y=hit?.y;
   // Probe each inset corner as well as the centre. Keep gaps where floor
   // evidence is absent, not merely where a complete square does not fit.
   if(!Number.isFinite(y)||Math.abs(y-datum)>tolerance||p.some(v=>{
    const h=probe(v[0]*.92+cx*.08,v[1]*.92+cz*.08);
    return !Number.isFinite(h?.y)||Math.abs(h.y-y)>.035;
   })){skippedArea+=a;continue;}
   const signed=p.reduce((s,v,i)=>{const b=p[(i+1)%p.length];return s+v[0]*b[1]-b[0]*v[1];},0);
   if(signed>0)p=p.reverse(); // x/z clockwise yields upward-facing normals
   for(let i=1;i<p.length-1;i++)for(const v of [p[0],p[i],p[i+1]]){
    positions.push(v[0]-(origin.x||0),y+offset,v[1]-(origin.z||0));uvs.push(v[0]/uvScale,v[1]/uvScale);
   }
   supportedArea+=a;cells.add(ix+','+iz);if(a<step*step-.00001)cutFragments++;
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
 return {geometry,cells:cells.size,supportedArea,skippedArea,cutFragments,polygonArea:area(polygon)};
}
