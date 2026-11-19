/**
 * Real floor-and-collision-constrained route probes.
 * No synthetic shortcuts, traversable voids or invented room-to-room openings.
 * The callbacks are provided by the same raycast engine used by WASD walking.
 */
export const PLAN_ROUTE_TARGETS=[
 {id:'ground-stair-living',label:'Stair foyer → ground Sitting Room',level:0,
  start:[110.15,-6.70],end:[114.75,-6.70],
  drawing:'S1 ground floor stair / 35m² sitting room'},
 {id:'ground-stair-dining',label:'Stair foyer → Dining Room',level:0,
  start:[110.15,-6.70],end:[114.65,-2.38],
  drawing:'S1 ground floor stair / 19m² dining room'},
 {id:'ground-dining-kitchen',label:'Dining Room → Kitchen',level:0,
  start:[114.65,-2.38],end:[109.65,-2.38],
  drawing:'S1 ground floor dining / 25m² kitchen'},
 {id:'first-stair-family',label:'Upper stair landing → first-floor Family Room',level:3.3,
  start:[110.15,-6.70],end:[114.7,-2.20],
  drawing:'S1 first floor stair / 19m² family room'}
];
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function quantized(v,step){return Math.round(v/step);}
export function findPhysicalRoute(options){
 const {start,end,level,ground,blocked,gridStep=.48,maxVisited=1850,
  maxWorldRadius=26,maxDeltaY=.29}=options;
 if(typeof ground!=='function'||typeof blocked!=='function')throw Error('Source floor and collision callbacks required');
 const cache=new Map(),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 function pos(x,z){return {x:quantized(x,gridStep)*gridStep,z:quantized(z,gridStep)*gridStep};}
 function key(p){return quantized(p.x,gridStep)+','+quantized(p.z,gridStep);}
 function cell(x,z,alt=level){
  const p=pos(x,z),k=key(p);
  if(cache.has(k))return cache.get(k);
  if(Math.hypot(p.x-start[0],p.z-start[1])>maxWorldRadius)return null;
  // We cannot use a floor without a real IFC supporting slab/tread.
  const floor=ground(p.x,p.z,alt);
  const item=floor?{...p,y:floor.y,key:k}:null;
  cache.set(k,item);
  return item;
 }
 function nearest(point){
  const offsets=[[0,0],[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1],
   [0,2],[0,-2],[2,0],[-2,0]];
  for(const [ix,iz] of offsets){
   const c=cell(point[0]+ix*gridStep,point[1]+iz*gridStep,level);
   if(c&&Math.abs(c.y-level)<.44)return c;
  }
  return null;
 }
 const from=nearest(start),to=nearest(end);
 if(!from||!to)return {ok:false,reason:!from?'no source-supported starting floor':'no source-supported destination floor',visited:0,points:[]};
 const open=[{...from,g:0,f:dist(from,to)}],score=new Map([[from.key,0]]);
 const visited=new Set(),parents=new Map(),seen=new Map([[from.key,from]]);
 let close=Infinity,closest=from,edges=0,blockedEdges=0,levelEdges=0;
 while(open.length&&visited.size<maxVisited){
  open.sort((a,b)=>a.f-b.f);
  const curr=open.shift();
  if(visited.has(curr.key))continue;
  visited.add(curr.key);
  const dGoal=dist(curr,to);
  if(dGoal<close){close=dGoal;closest=curr;}
  if(curr.key===to.key||dGoal<=gridStep*.65){
   const points=[];let k=curr.key;
   while(k){const p=seen.get(k);points.push([p.x,p.y,p.z]);k=parents.get(k);}
   points.reverse();
   return {ok:true,reason:'source-backed continuous path found',visited:visited.size,
     distanceMetres:+points.reduce((s,p,i)=>i?s+Math.hypot(p[0]-points[i-1][0],p[2]-points[i-1][2]):0,0).toFixed(2),
     points,edges,blockedEdges,levelEdges};
  }
  for(const [dx,dz] of dirs){
   const next=cell(curr.x+dx*gridStep,curr.z+dz*gridStep,curr.y);
   if(!next||visited.has(next.key))continue;
   const rise=next.y-curr.y;
   if(rise>maxDeltaY||rise<-.58){levelEdges++;continue;}
   // A diagonal must not slip through the corner of two solid walls.
   if(dx&&dz){
    const p1=cell(curr.x+dx*gridStep,curr.z,curr.y);
    const p2=cell(curr.x,curr.z+dz*gridStep,curr.y);
    if(!p1||!p2||blocked(curr.x,curr.z,p1.x,p1.z,curr.y)||
       blocked(curr.x,curr.z,p2.x,p2.z,curr.y)){blockedEdges++;continue;}
   }
   if(blocked(curr.x,curr.z,next.x,next.z,curr.y)){blockedEdges++;continue;}
   edges++;
   const increment=Math.hypot(dx,dz)*gridStep+Math.abs(rise)*.35;
   const g=curr.g+increment;
   if(g>=(score.get(next.key)??Infinity))continue;
   score.set(next.key,g);parents.set(next.key,curr.key);seen.set(next.key,next);
   open.push({...next,g,f:g+dist(next,to)});
  }
 }
 return {ok:false,reason:'no continuous route through source-backed floor and collisions',
  visited:visited.size,closestDistanceMetres:+close.toFixed(2),
  closestToDestination:[closest.x,closest.y,closest.z],points:[],
  edges,blockedEdges,levelEdges};
}
