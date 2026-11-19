import assert from 'node:assert/strict';
import {findPhysicalRoute} from '../src/phase2/circulation-routes.js';
const floor=()=>({y:0});
const barrier=(x,z,nx,nz)=>{
 if(!((x<1&&nx>=1)||(x>=1&&nx<1)))return false;
 const dx=nx-x;const zAt=z+(1-x)*(nz-z)/dx;
 return Math.abs(zAt-.11)>.045;
};
const common={start:[0,.11],end:[2,.11],level:0,
  ground:floor,blocked:barrier,gridStep:.24,maxVisited:800,searchMargin:2};
const noPortal=findPhysicalRoute(common);
assert(!noPortal.ok,'grid alone must not claim to pass a too-narrow 0.83m opening off the lattice');
const withPortal=findPhysicalRoute({...common,
 portals:[{id:'plan-confirmed-doorway',cx:1,cz:.11,groundY:0,alongX:false,width:.83}]});
assert(withPortal.ok,'source-anchored opening nodes must let a physical centred path traverse');
assert(withPortal.points.some(p=>Math.abs(p[2]-.11)<.002));
assert(withPortal.points.every(p=>floor(p[0],p[2]).y===p[1]));
assert(withPortal.points.every((p,i)=>i===0||!barrier(
 withPortal.points[i-1][0],withPortal.points[i-1][2],p[0],p[2])),
 'every waypoint connection must still pass strict source collision check');
const closed=findPhysicalRoute({...common,blocked:()=>true,
 portals:[{id:'same-door-but-closed',cx:1,cz:.11,groundY:0,alongX:false,width:.83}]});
assert(!closed.ok,'portal nodes must not turn a closed wall into a teleporter');
const noFloor=findPhysicalRoute({...common,ground:(x,z)=>x>.73&&x<1.31?null:{y:0},
 portals:[{id:'unsupported',cx:1,cz:.11,groundY:0,alongX:false,width:.83}]});
assert(!noFloor.ok,'portal nodes must not create an unsupported floor across a wall');
console.log(JSON.stringify({passed:true,sourceAnchoredWaypoints:true,
 noUnconfirmedShortcuts:true,noFloorFabrication:true,
 sourcePortalCount:withPortal.sourcePortals,
 verifiedRouteMetres:withPortal.distanceMetres}));
