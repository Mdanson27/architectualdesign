/**
 * Strict IFC-backed route probes.
 * A regular grid alone misses narrow openings when no grid column coincides
 * with their clear centre. Add source-verified aperture waypoints, but test
 * every walking edge with the exact same floor and obstacle functions as WASD.
 * No through-wall graph edges, fabricated floors, or teleporting.
 */
export const PLAN_ROUTE_TARGETS=[
 {id:'ground-stair-living',label:'Stair foyer → ground Sitting Room',level:0,
  start:[110.15,-6.70],end:[115.12,-6.86],
  // S1 sitting-room safe standing point confirmed in the real-browser route;
  // the earlier nominal anchor lay 24cm behind local room furniture.
  drawing:'S1 ground floor stair / 35m² sitting room'},
 // Phase 15H: the old dining target (114.65,-2.38) is inside the new
 // table. Use the south dining aisle, still inside the same mapped room.
 // Every grid edge retains the original source floor and collision tests.
 {id:'ground-sitting-dining',label:'Sitting Room → Dining · no door',level:0,
  start:[115.12,-6.86],end:[114.65,-3.95],
  drawing:'Client-corrected S1 · no partition or sliding leaf'},
 {id:'ground-stair-dining',label:'Stair foyer → Dining Room',level:0,
  start:[110.15,-6.70],end:[114.65,-3.95],
  drawing:'S1 ground floor stair / 19m² dining room'},
 {id:'ground-dining-kitchen',label:'Dining Room → Kitchen',level:0,
  start:[114.65,-3.95],end:[109.65,-2.38],
  drawing:'S1 ground floor dining / 25m² kitchen'},
 {id:'first-stair-family',label:'Upper stair landing → first-floor Family Room',level:3.3,
  // Clear arrival point inside the west side of the 19m² Family Room.
  // The earlier (-2.20m) centre target now falls within the organized sofa/
  // coffee-table footprint; this source-tested point remains physically clear.
  start:[110.15,-6.70],end:[113.02,-2.44],
  drawing:'S1 first floor stair / 19m² family room'}
];
const hyp=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const snap=(n,step)=>Math.round(n/step)*step;
function pathTo(last,seen,parents,max=240){
 const result=[];let k=last.key;
 while(k&&result.length<max){
  const p=seen.get(k);if(!p)break;
  result.push([+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)]);
  k=parents.get(k);
 }
 return result.reverse();
}
export function findPhysicalRoute(options){
 const {start,end,level,ground,blocked,portals=[],
  gridStep=.24,maxVisited=3200,maxWorldRadius=26,maxDeltaY=.29,searchMargin=5.2}=options;
 if(!Number.isFinite(gridStep)||gridStep<=0||
  typeof ground!=='function'||typeof blocked!=='function')
  throw Error('A valid grid, source floor and collision callbacks are required');
 const cache=new Map(),dirs=[[1,0],[-1,0],[0,1],[0,-1],
   [1,1],[1,-1],[-1,1],[-1,-1]];
 const inside=(x,z)=>Math.hypot(x-start[0],z-start[1])<=maxWorldRadius &&
   x>=Math.min(start[0],end[0])-searchMargin &&
   x<=Math.max(start[0],end[0])+searchMargin &&
   z>=Math.min(start[1],end[1])-searchMargin &&
   z<=Math.max(start[1],end[1])+searchMargin;
 function grid(x,z){
  x=snap(x,gridStep);z=snap(z,gridStep);
  const key='g:'+Math.round(x/gridStep)+','+Math.round(z/gridStep);
  if(cache.has(key))return cache.get(key);
  if(!inside(x,z)){cache.set(key,null);return null;}
  const floor=ground(x,z,level);
  const value=floor?{x,z,y:floor.y,key,kind:'grid'}:null;
  cache.set(key,value);
  return value;
 }
 const portalNodes=[];
 for(let i=0;i<portals.length;i++){
  const p=portals[i];
  if(p.groundY!==undefined&&Math.abs(p.groundY-level)>.5)continue;
  if(!Number.isFinite(p.cx)||!Number.isFinite(p.cz))continue;
  // Keep the original S1 opening width and protect the source wall's piers.
  // Centres are source-backed; no offset beyond ±0.72m along its normal.
  for(let k=-6;k<=6;k++){
   const x=p.cx+(p.alongX?0:k*.12),z=p.cz+(p.alongX?k*.12:0);
   if(!inside(x,z))continue;
   const fl=ground(x,z,level);
   if(!fl||Math.abs(fl.y-level)>.44)continue;
   portalNodes.push({x,z,y:fl.y,key:'p:'+i+':'+k,kind:'portal',portalId:p.id});
  }
 }
 function nearest(point){
  const choices=[];
  for(let ix=-4;ix<=4;ix++)for(let iz=-4;iz<=4;iz++){
   if(Math.hypot(ix,iz)>4.1)continue;
   const c=grid(point[0]+ix*gridStep,point[1]+iz*gridStep);
   if(!c||Math.abs(c.y-level)>.44)continue;
   let accessible=0;
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n=grid(c.x+dx*gridStep,c.z+dz*gridStep);
    if(n&&Math.abs(n.y-c.y)<=maxDeltaY&&
      !blocked(c.x,c.z,n.x,n.z,c.y))accessible++;
   }
   if(accessible>=2)choices.push({c,dist:Math.hypot(c.x-point[0],c.z-point[1]),accessible});
  }
  choices.sort((a,b)=>a.dist-b.dist||b.accessible-a.accessible);
  return choices[0]?.c??null;
 }
 const from=nearest(start),to=nearest(end);
 if(!from||!to)return {ok:false,reason:!from?'no source-supported starting floor':'no source-supported destination floor',
  visited:0,points:[],sourcePortals:portalNodes.length};
 const open=[{...from,g:0,f:hyp(from,to)}];
 const visited=new Set(),parents=new Map(),seen=new Map([[from.key,from]]);
 const score=new Map([[from.key,0]]);
 let closest=from,close=hyp(from,to),edges=0,blockedEdges=0,levelEdges=0;
 function candidates(curr){
  const next=[];
  if(curr.kind==='grid'){
   for(const [dx,dz] of dirs){
    const n=grid(curr.x+dx*gridStep,curr.z+dz*gridStep);
    if(!n)continue;
    // No diagonal passage through the corner of two structural barriers.
    if(dx&&dz){
     const p1=grid(curr.x+dx*gridStep,curr.z),p2=grid(curr.x,curr.z+dz*gridStep);
     if(!p1||!p2||
       blocked(curr.x,curr.z,p1.x,p1.z,curr.y)||
       blocked(curr.x,curr.z,p2.x,p2.z,curr.y)){blockedEdges++;continue;}
    }
    next.push(n);
   }
  }else{
   const x=snap(curr.x,gridStep),z=snap(curr.z,gridStep);
   for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++){
    const n=grid(x+ix*gridStep,z+iz*gridStep);
    if(n&&hyp(curr,n)<=gridStep*1.30)next.push(n);
   }
  }
  // A source aperture joins the grid *only* through short verified edges.
  // With a 0.83m passage and 0.32m avatar radius, using only the grid's
  // z=-7.10 sampling row can falsely collide with the jamb at z=-7.02.
  for(const p of portalNodes)if(p.key!==curr.key&&
    hyp(curr,p)<=Math.max(.185,gridStep*1.26))next.push(p);
  return next;
 }
 while(open.length&&visited.size<maxVisited){
  open.sort((a,b)=>a.f-b.f);
  const curr=open.shift();
  if(visited.has(curr.key))continue;
  visited.add(curr.key);
  const goal=hyp(curr,to);
  if(goal<close){close=goal;closest=curr;}
  if(curr.key===to.key||goal<=gridStep*.65){
   const points=pathTo(curr,seen,parents);
   return {ok:true,reason:'continuous path through source-supported floor and confirmed openings',
    visited:visited.size,sourcePortals:portalNodes.length,edges,blockedEdges,levelEdges,
    distanceMetres:+points.reduce((s,p,i)=>i?s+Math.hypot(p[0]-points[i-1][0],p[2]-points[i-1][2]):0,0).toFixed(2),
    points};
  }
  for(const n of candidates(curr)){
   if(visited.has(n.key))continue;
   const rise=n.y-curr.y;
   if(rise>maxDeltaY||rise<-.58){levelEdges++;continue;}
   if(blocked(curr.x,curr.z,n.x,n.z,curr.y)){blockedEdges++;continue;}
   edges++;
   const g=curr.g+hyp(curr,n)+Math.abs(rise)*.35;
   if(g>=(score.get(n.key)??Infinity))continue;
   score.set(n.key,g);parents.set(n.key,curr.key);seen.set(n.key,n);
   open.push({...n,g,f:g+hyp(n,to)});
  }
 }
 return {ok:false,reason:'no continuous source-backed floor/collision route',
  visited:visited.size,sourcePortals:portalNodes.length,
  originalStart:start,originalEnd:end,
  resolvedStart:[from.x,from.y,from.z],resolvedEnd:[to.x,to.y,to.z],
  closestToDestination:[closest.x,closest.y,closest.z],
  closestDistanceMetres:+close.toFixed(2),
  partialPath:pathTo(closest,seen,parents),
  points:[],edges,blockedEdges,levelEdges};
}
