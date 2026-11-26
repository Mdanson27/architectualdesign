import * as THREE from 'three';

// Phase 15G: Studio Anne pp9,10,17,18,21. Proposed fixtures, not an electrical design.
// Local Y=0 is floor/table/wall mounting datum; ceiling fixtures use Y=0 at canopy.
export const LIGHT15=Object.freeze({
 'folded-glass-chandelier':{zone:'sitting',layer:'ambient',anchor:'ceiling',kelvin:2800},
 'dining-pendant-cluster':{zone:'dining',layer:'task',anchor:'ceiling',kelvin:2700},
 'brass-arc-floor-lamp':{zone:'sitting',layer:'task',anchor:'floor',kelvin:2800},
 'black-shade-table-lamp':{zone:'sitting',layer:'task',anchor:'tabletop',kelvin:2800},
 'double-branch-wall-sconce':{zone:'sitting',layer:'accent',anchor:'wall',kelvin:2800},
 'recessed-downlight':{zone:'sitting',layer:'ambient',anchor:'ceiling',kelvin:2800},
 'linear-cove-light':{zone:'sitting',layer:'accent',anchor:'ceiling',kelvin:2800}
});
export const DINING_LIGHT15=Object.freeze({tableCentre:[114.80,-2.25],tableHeight:.77,referenceCeiling:2.7964774847,shadeGaps:[.75,.80,.85,.90],maxPointLights:2});
export function createPhase15Light(id,{detail='high',ceilingHeight=DINING_LIGHT15.referenceCeiling,zone=LIGHT15[id]?.zone}={}){
 const spec=LIGHT15[id];if(!spec||!['high','low'].includes(detail)||!['sitting','dining'].includes(zone))throw Error('Invalid light asset');
 const high=detail==='high',g=new THREE.Group();g.name='PHASE15G_'+id;g.userData={assetId:id,detail,zone,layer:spec.layer,anchor:spec.anchor,kelvin:zone==='dining'?2700:spec.kelvin,clientApproved:false};
 const materials=[],emitters=[],lights=[];
 const mat=(name,color,roughness=.6,metalness=0)=>{const m=new THREE.MeshStandardMaterial({name,color,roughness,metalness});materials.push(m);return m;};
 const brass=mat('aged-brushed-brass',0x967247,.36,.65),black=mat('matte-black-shade',0x201e1c,.92),cable=mat('dark-suspension-cable',0x40352b,.8),cream=mat('ivory-ceramic-shade',0xdcd2be,.73),wood=mat('warm-walnut-shade',0x8a6240,.72),white=mat('ceiling-white',0xe9e4da,.82);
 const glass=new THREE.MeshPhysicalMaterial({name:'folded-translucent-glass-preview',color:0xf3dfba,roughness:.23,metalness:0,transparent:true,opacity:.76,side:THREE.DoubleSide,depthWrite:false,clearcoat:.6});materials.push(glass);
 function glow(name){const m=mat(name,0xffebca,.48);m.emissive.setHex(zone==='dining'?0xffbd76:0xffc589);emitters.push(m);return m;}
 function mesh(name,geo,m,x=0,y=0,z=0,parent=g){const o=new THREE.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function cyl(name,r1,r2,h,m,x,y,z,parent=g){return mesh(name,new THREE.CylinderGeometry(r1,r2,h,high?40:16),m,x,y,z,parent);}
 function box(name,w,h,d,m,x,y,z,parent=g){return mesh(name,new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
 function tube(name,pts,r,m,parent=g){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),high?48:16,r,high?8:5),m,0,0,0,parent);}
 function lathe(name,profile,m,x,y,z,parent=g){return mesh(name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),high?48:18),m,x,y,z,parent);}
 function bulb(name,x,y,z,r=.025,parent=g){return mesh(name,new THREE.SphereGeometry(r,high?20:10,high?14:8),glow(name+'-emissive'),x,y,z,parent);}
 function point(name,x,y,z,power,distance=4){
  const l=new THREE.PointLight(zone==='dining'?0xffbd78:0xffc68e,0,distance,2);l.name=name;l.position.set(x,y,z);l.castShadow=false;l.userData.nominalIntensity=power;g.add(l);lights.push(l);return l;
 }
 function spot(name,x,y,z,target,power,angle=.65){
  const l=new THREE.SpotLight(zone==='dining'?0xffbd78:0xffc68e,0,5,angle,.65,2);l.name=name;l.position.set(x,y,z);l.target.position.set(...target);l.castShadow=false;l.userData.nominalIntensity=power;g.add(l,l.target);lights.push(l);return l;
 }
 if(id==='folded-glass-chandelier'){
  // P17 lower reference: round brass canopy, several separate folded
  // translucent glass leaves, each supported by its own cable.
  cyl('round-brass-ceiling-canopy',.26,.26,.038,brass,0,-.019,0);
  const positions=[[-.19,-.42,-.13],[.18,-.47,.11],[.02,-.56,-.15],[-.13,-.68,.13],[.13,-.75,-.03],[0,-.85,.02]];
  for(const [i,[x,y,z]] of positions.entries()){
   tube('individual-suspension-wire',[[x*.65,-.038,z*.65],[x*.82,(y+.11)*.55,z*.82],[x,y+.12,z]],.0025,cable);
   const leaf=new THREE.Group();leaf.name='FOLDED_GLASS_LEAF_'+(i+1);leaf.position.set(x,y,z);leaf.rotation.y=i*1.1;g.add(leaf);
   const n=high?38:16,k=high?20:8,p=[],uv=[],ix=[];
   for(let j=0;j<=k;j++)for(let q=0;q<=n;q++){
    const u=q/n,v=j/k,edge=Math.sin(Math.PI*u),xx=(u-.5)*.36,zz=(v-.5)*.23*(.35+.65*edge),yy=.07*Math.sin(u*Math.PI*2+.7)+.075*Math.cos(v*Math.PI*2)*edge+.025*Math.sin(u*13+v*5);
    p.push(xx,yy,zz);uv.push(u,v);
   }
   for(let j=0;j<k;j++)for(let q=0;q<n;q++){const a=j*(n+1)+q,b=a+n+1;ix.push(a,b,a+1,b,b+1,a+1);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
   mesh('sculptural-folded-glass',geo,glass,0,0,0,leaf);tube('leaf-brass-mount',[[0,.12,0],[0,.04,0]],.009,brass,leaf);bulb('glass-leaf-light-source',0,.025,0,.018,leaf);
  }
  point('chandelier-ambient',0,-.53,0,55);
 }
 if(id==='dining-pendant-cluster'){
  if(!Number.isFinite(ceilingHeight)||ceilingHeight<2.45||ceilingHeight>3.65)throw Error('Unverified ceiling height');
  // p21 four elongated tapered shades, alternating ivory and warm walnut,
  // lowest rims 750–900mm above tabletop, centred over actual table.
  box('four-drop-ceiling-canopy',1.38,.035,.32,brass,0,-.0175,0);
  const xs=[-.53,-.18,.18,.53],zs=[-.10,.10,-.10,.10],hs=[.43,.31,.36,.40];
  for(let i=0;i<4;i++){
   const rim=DINING_LIGHT15.tableHeight+DINING_LIGHT15.shadeGaps[i]-ceilingHeight,h=hs[i],x=xs[i],z=zs[i],r=[.135,.095,.10,.12][i],m=i%2===0?cream:wood;
   const drop=new THREE.Group();drop.name='DINING_DROP_'+(i+1);drop.position.set(x,rim,z);drop.userData={rimAboveTable:DINING_LIGHT15.shadeGaps[i]};g.add(drop);
   // Shell has open bottom and a thin returning inner wall, never a solid cone.
   lathe('elongated-open-bottom-shade',[[r,0],[r*.96,h*.18],[r*.73,h*.46],[r*.42,h*.72],[.023,h*.93],[.018,h],[.012,h],[.015,h*.92],[r*.39,h*.72],[r*.70,h*.46],[r*.91,h*.18],[r-.007,0],[r,0]],m,0,0,0,drop);
   cyl('pendant-neck-fitting',.018,.018,.028,brass,0,h+.014,0,drop);
   bulb('warm-recessed-pendant-bulb',0,.065,0,.028,drop);
   tube('ceiling-to-shade-suspension',[[x,-.035,z],[x,(rim+h+.028-.035)/2,z],[x,rim+h+.028,z]],.0025,cable);
  }
  for(const x of [-.35,.35])spot('dining-downward-task',x,DINING_LIGHT15.tableHeight+.86-ceilingHeight,0,[x,DINING_LIGHT15.tableHeight-ceilingHeight,0],42,.72);
  g.userData.tableCentre=[...DINING_LIGHT15.tableCentre];g.userData.ceilingHeight=ceilingHeight;
 }
 if(id==='brass-arc-floor-lamp'){
  cyl('weighted-brass-floor-base',.145,.145,.035,brass,0,.0175,0);
  tube('continuous-brass-arc',[[0,.035,0],[0,.7,0],[0,1.46,0],[0,1.67,-.11],[0,1.63,-.26],[0,1.49,-.29]],.012,brass);
  lathe('open-brass-dome',[[.105,0],[.105,.038],[.09,.095],[.046,.14],[.018,.15],[.012,.15],[.039,.133],[.083,.087],[.098,.035],[.098,0],[.105,0]],brass,0,1.34,-.29);
  bulb('floor-lamp-recessed-bulb',0,1.38,-.29,.027);spot('floor-reading-task',0,1.33,-.29,[0,.5,-.46],25,.62);
 }
 if(id==='black-shade-table-lamp'){
  lathe('sculpted-brass-teardrop-base',[[0,0],[.09,0],[.103,.035],[.077,.12],[.032,.24],[.018,.35],[.018,.40]],brass,0,0,0);
  lathe('open-black-tapered-shade',[[.15,0],[.118,.22],[.111,.22],[.143,0],[.15,0]],black,0,.34,0);
  bulb('table-lamp-recessed-bulb',0,.435,0,.03);point('table-lamp-task',0,.395,0,10,2.5);
 }
 if(id==='double-branch-wall-sconce'){
  cyl('brass-wall-mount',.045,.045,.025,brass,0,.10,0).rotation.x=Math.PI/2;
  for(const [x,y] of [[-.09,.29],[.07,.40]]){
   tube('curved-brass-sconce-arm',[[0,.10,-.023],[x*.42,y*.55,-.06],[x,y-.045,-.10]],.009,brass);
   const o=bulb('opal-oval-sconce-globe',x,y,-.10,.043);o.scale.set(.70,1.35,.73);
  }
  point('wall-accent',0,.30,-.15,10,2.4);
 }
 if(id==='recessed-downlight'){
  cyl('recessed-housing',.053,.053,.046,white,0,-.023,0);
  cyl('recessed-trim-ring',.062,.062,.008,white,0,-.049,0);
  cyl('opal-downlight-diffuser',.041,.041,.003,glow('downlight-diffuser'),0,-.054,0);
  spot('recessed-ambient',0,-.057,0,[0,-2.5,0],20,.75);
 }
 if(id==='linear-cove-light'){
  box('recessed-aluminium-channel',1.0,.022,.028,brass,0,-.011,0);
  box('continuous-warm-strip-diffuser',.986,.006,.016,glow('strip-diffuser'),0,-.024,0);
  point('cove-indirect-accent',0,-.03,0,8,2.2);
 }
 g.userData.emitters=emitters;g.userData.lights=lights;
 g.userData.setLevel=(v)=>{if(!Number.isFinite(v))throw Error('Invalid dimming level');const level=THREE.MathUtils.clamp(v,0,1);emitters.forEach(m=>m.emissiveIntensity=1.15*level);lights.forEach(l=>l.intensity=l.userData.nominalIntensity*level);return level;};
 g.userData.setLevel(1);
 g.userData.dispose=()=>{g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());};
 return g;
}
export function lightingStats(g){g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g,true);let triangles=0,meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {id:g.userData.assetId,detail:g.userData.detail,dimensions:b.getSize(new THREE.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes,lights:g.userData.lights.length,kelvin:g.userData.kelvin};}
// The visitor day/night switch is a master gate, not a second set of lights.
// Each room retains independent ambient/task/accent levels while master is off.
export function createPhase15LightingController(fixtures){
 const zones=['sitting','dining'],layers=['ambient','task','accent'];
 const state={master:true,levels:Object.fromEntries(zones.map(z=>[z,Object.fromEntries(layers.map(l=>[l,1]))]))};
 function apply(){for(const f of fixtures){const u=f.userData;if(!zones.includes(u.zone)||!layers.includes(u.layer))throw Error('Unknown fixture zone or layer');u.setLevel(state.master?state.levels[u.zone][u.layer]:0);}}
 apply();return {setMaster(v){state.master=Boolean(v);apply();},setLevel(z,l,v){if(!zones.includes(z)||!layers.includes(l)||!Number.isFinite(v))throw Error('Invalid zone dimmer');state.levels[z][l]=THREE.MathUtils.clamp(v,0,1);apply();},status(){return JSON.parse(JSON.stringify(state));}};
}
export function canInstallPhase15Light({sourceSupportVerified,anchorVerified,openingClear,headClearanceVerified,collisionClear}={}){
 return [sourceSupportVerified,anchorVerified,openingClear,headClearanceVerified,collisionClear].every(v=>v===true);
}
