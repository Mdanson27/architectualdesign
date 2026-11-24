// Offline atlas preparation for opaque, non-repeating sRGB furniture charts.
// Input and output pixel rows use bottom-left origin to match glTF UVs.
// Repeating floor/wall textures and normal/roughness/metallic data are rejected.
const pow2=n=>Number.isInteger(n)&&n>0&&(n&(n-1))===0;
const nextPow2=n=>2**Math.ceil(Math.log2(n));
const linear=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
const srgb=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055));
export function bakeClampedAtlas(charts,{gutter=8,maxSize=2048}={}){
 if(!charts.length||!pow2(gutter)||!pow2(maxSize))throw Error('Atlas requires nonempty charts and power-of-two limits');
 const ids=new Set(),w=charts[0].width,h=charts[0].height;
 if(!pow2(w)||!pow2(h)||w!==h||w<gutter)throw Error('Atlas charts must use equal square power-of-two dimensions');
 for(const c of charts){
  if(!c.id||ids.has(c.id)||c.width!==w||c.height!==h||c.wrapS!=='clamp'||c.wrapT!=='clamp'||
     c.colorSpace!=='srgb'||!(c.rgba instanceof Uint8Array)||c.rgba.length!==w*h*4)
    throw Error('Atlas rejects repeating, incompatible or missing charts');
  for(let i=3;i<c.rgba.length;i+=4)if(c.rgba[i]!==255)throw Error('Atlas only supports opaque color charts');
  ids.add(c.id);
 }
 const cell=nextPow2(w+2*gutter),grid=nextPow2(Math.ceil(Math.sqrt(charts.length))),size=cell*grid;
 if(size>maxSize)throw Error('Atlas exceeds pixel budget');
 const safeMip=Math.min(Math.log2(gutter),Math.log2(w));
 const regions=charts.map((c,i)=>({id:c.id,x:(i%grid)*cell+gutter,y:Math.floor(i/grid)*cell+gutter,
  width:w,height:h,scale:[w/size,h/size],offset:[((i%grid)*cell+gutter)/size,(Math.floor(i/grid)*cell+gutter)/size]}));
 const levels=[];
 for(let mip=0;mip<=safeMip;mip++){
  const f=2**mip,s=size/f,t=cell/f,g=gutter/f,inner=w/f;
  const rgba=new Uint8Array(s*s*4);
  charts.forEach((c,i)=>{
   const data=new Uint8Array(inner*inner*4);
   for(let y=0;y<inner;y++)for(let x=0;x<inner;x++){
    const p=(y*inner+x)*4;
    if(f===1)data.set(c.rgba.subarray(p,p+4),p);
    else{
     for(let k=0;k<3;k++){let sum=0;for(let dy=0;dy<f;dy++)for(let dx=0;dx<f;dx++)sum+=linear(c.rgba[((y*f+dy)*w+x*f+dx)*4+k]);data[p+k]=srgb(sum/(f*f));}
     data[p+3]=255;
    }
   }
   const ox=(i%grid)*t,oy=Math.floor(i/grid)*t;
   for(let y=0;y<t;y++)for(let x=0;x<t;x++){
    const ix=Math.max(0,Math.min(inner-1,x-g)),iy=Math.max(0,Math.min(inner-1,y-g)),p=(iy*inner+ix)*4;
    rgba.set(data.subarray(p,p+4),((oy+y)*s+ox+x)*4);
   }
  });
  levels.push({width:s,height:s,rgba});
 }
 return {width:size,height:size,regions,levels,maxSafeMip:safeMip,requiresExplicitMipLimit:true,colorSpace:'srgb'};
}
export function atlasUV(region,u,v){
 if(![u,v].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Atlas cannot remap repeating UVs');
 return [region.offset[0]+region.scale[0]*u,region.offset[1]+region.scale[1]*v];
}
