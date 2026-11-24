import {productionPixelRatio} from './stage9-quality-policy.js';

export const GRAPHICS_PROFILES=Object.freeze([
 Object.freeze({id:'lightweight',scale:.65,maxPixels:1500000}),
 Object.freeze({id:'balanced',scale:.85,maxPixels:2500000}),
 Object.freeze({id:'high',scale:1,maxPixels:4000000})
]);
export const PHASE12_POLICY=Object.freeze({windowMs:1500,minSamples:12,maxSamples:240,slowMs:38,fastMs:20,slowWindows:2,fastWindows:4,cooldownMs:4000});
export function initialGraphicsLevel(memory){
 return Number.isFinite(memory)&&memory>0&&memory<=4?0:1;
}
export function graphicsPixelRatio(deviceDpr,width,height,level){
 const cap=productionPixelRatio(deviceDpr,width);
 const p=GRAPHICS_PROFILES[level]??GRAPHICS_PROFILES[1];
 const area=Math.max(1,(Number.isFinite(width)?Math.max(1,width):1280)*(Number.isFinite(height)?Math.max(1,height):800));
 return Math.min(cap,Math.max(.25,Math.min(cap*p.scale,Math.sqrt(p.maxPixels/area))));
}
// Measured frame intervals, not device labels, drive ongoing decisions.
// A sustained slow window lowers the workload; recovery requires more
// evidence and a cooldown to avoid visible quality oscillation.
export function createAdaptiveGraphics({deviceMemory,initialLevel=initialGraphicsLevel(deviceMemory)}={}){
 const p=PHASE12_POLICY;
 let level=Math.max(0,Math.min(2,Number.isInteger(initialLevel)?initialLevel:1));
 let samples=[],sum=0,elapsed=0,lastChange=-Infinity,lastTime=null;
 let slow=0,fast=0,changes=0,frames=0,lastP75=null,windows=0;
 function suspend(){lastTime=null;samples=[];sum=0;slow=0;fast=0;}
 function sample(ms){
  if(!Number.isFinite(ms)||ms<=0)return false;
  ms=Math.min(ms,250); // bound one scheduling stall's contribution
  elapsed+=ms;frames++;samples.push(ms);sum+=ms;
  if(samples.length>p.maxSamples)sum-=samples.shift();
  if((sum<p.windowMs&&samples.length<p.maxSamples)||samples.length<p.minSamples)return false;
  const sorted=samples.slice().sort((a,b)=>a-b);
  lastP75=sorted[Math.ceil(sorted.length*.75)-1];windows++;
  samples=[];sum=0;
  if(lastP75>=p.slowMs){slow++;fast=0;}
  else if(lastP75<=p.fastMs){fast++;slow=0;}
  else{slow=0;fast=0;}
  if(elapsed-lastChange<p.cooldownMs)return false;
  const next=slow>=p.slowWindows?Math.max(0,level-1):fast>=p.fastWindows?Math.min(2,level+1):level;
  if(next===level)return false;
  level=next;changes++;lastChange=elapsed;slow=0;fast=0;return true;
 }
 function tick(time){
  if(!Number.isFinite(time))return false;
  if(lastTime===null){lastTime=time;return false;}
  const delta=time-lastTime;lastTime=time;return sample(delta);
 }
 function status(){return {automatic:true,level,profile:GRAPHICS_PROFILES[level].id,
  scale:GRAPHICS_PROFILES[level].scale,frames,windows,changes,p75FrameMs:lastP75,
  estimatedFps:lastP75?1000/lastP75:null,sourceGeometryRetained:true};}
 return {sample,tick,suspend,status,pixelRatio:(dpr,w,h)=>graphicsPixelRatio(dpr,w,h,level)};
}
