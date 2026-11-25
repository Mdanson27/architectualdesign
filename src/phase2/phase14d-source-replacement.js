import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Exact IFC node IDs from the ground-furniture-00/01 and proxy GLBs.
// No name-only filtering, no room-wide removal of walls, doors or slabs.
const CABINETS=new Set([
'1z1dcHC8L6AwKtKZzduvYU','22988$1J18i87mjrvxJTV6','0NH20fl5TDdxlLF4WjEvLf','2oXk9nEQL5ng52DHW$4DJg','1iIIusqLH0fgu_CACtAKJ$','3ybT_6q8b5WhcIlWtI9fnX','1i4uGbbCb1sfVKL64tKps7','3N3hwcD2j8_A5Rn$uD7T0o','3ng6YU7YH17fTQMNmbMy1C','2VwmdgVG98iR_5aCtntVj9','2TOZFggLn7awtQzAkPkZHW','1zZMP66nD1NP$twHOIMIzO','0D8hgT7b93vgxwFkNd5anC','0TK4MxT$DD49QQb3DWYwRK','3UB$8Lj71DFQV8YPTc$WBz','1VEk$BBS17avTrlcZLOZV7','0S6OXg0lbBefoBa4ySJIj0','0a_xrShaHDJem4uw$N6rT8','0lXJPLaYX88AKKiVh_8cX9','39QSJ9d1fElO$3qg96SG0g','337SOQDcf2TBwH7JWRGTmp','2gh3FUjUn2BBVjNRb0wVti','19jK_A8fz1nAOxwkS3B3mA','3mvL4s6Rz1KBmb7ZNa5TId','3WUaHa63L6ceK9Ccrfjzpw','1ou6QbQbL9jAfm2NQ5tttv','2vBpszWl952hsKtJIQtPe6','1FuhmFvfLCSe44ETtSWjnL','2CvxGfAIP98AR5n9NIT2l6','3ck8YePSbANwP9cyiA8T7J','3Mdu2pZQz4FhSpbU_Es6Eq','16Zyjbtk93gPv_raMJFUkV','3EqMUItTb0_hA18P1sH416','3rs56RjjzAsOtfrLskwYlR','136lpXDrL7CBIU52HfqIZR']);
const APPLIANCES=new Set(['1c6$kmtff5tBi5I9g2iYVz','025N7z_HX3mRkE0kooSBYP','16DJgqQcHChxwsLDJooVJ6','2keCsr0mD6VQFrRoVeV3j3']);
const TOPS=new Set(['19go1i7iz7WwdR7zI9GLh5','1KrJo$zOr25ApAHBtfgeqa']);
export const kitchenSourceIds={cabinets:CABINETS,appliances:APPLIANCES,worktops:TOPS};
export function createSourceKitchenReplacement({scene,origin,records,floorSampler,requirements}){
 const id=r=>r.mesh?.userData?.ifc?.guid;
 const eligible=records.filter(r=>r.layer?.level==='ground'&&r.box&&CABINETS.has(id(r)));
 const top=records.filter(r=>r.layer?.level==='ground'&&TOPS.has(id(r)));
 if(eligible.length<25||top.length!==2)return null;
 const ox=origin.x||0,oz=origin.z||0;
 const sourceSet=new Set(),root=new THREE.Group();root.name='PHASE14D_REAL_KITCHEN_REPLACEMENT';root.visible=false;scene.add(root);
 const groups=Object.fromEntries(['cabinetry','appliances','storage','lighting','floor'].map(k=>[k,new THREE.Group()]));Object.entries(groups).forEach(([k,g])=>{g.name='KITCHEN_'+k;root.add(g)});
 const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const sage=mat(0x92927c),ivory=mat(0xeee8de),stone=mat(0xf7f3eb,.38),brass=mat(0xb28b50,.36,.65),steel=mat(0xb9bdbe,.36,.65),black=mat(0x202323,.23),oak=mat(0xb58c65),cream=mat(0xe8ddcc),glass=new THREE.MeshStandardMaterial({color:0xc6d0cd,transparent:true,opacity:.32,roughness:.15,depthWrite:false}),led=new THREE.MeshStandardMaterial({color:0xffe7c0,emissive:0xffd6a0,emissiveIntensity:.8});
 const materials=[sage,ivory,stone,brass,steel,black,oak,cream,glass,led],cache=new Map(),colliders=[],lights=[],moving=[],switches={cabinetry:true,appliances:true,storage:true,lighting:true};
 let enabled=false,opening=false,progress=0;
 const report={revision:'14D-source-repair',sourceCabinetCandidates:eligible.length,replacedCabinets:0,replacedAppliances:0,upperCabinets:0,baseCabinets:0,glassCabinets:0,fridges:0,applianceTowers:0,stools:0,islands:0,worktopGuids:top.map(id),floorPlanks:0,ledStrips:0,rejected:[],visualApproved:false};
 function mesh(g,name,geo,material,x,y,z){const m=new THREE.Mesh(geo,material);m.name='KITCHEN_'+name;m.userData={stage3:true,part:name,previewOnly:false,collidable:false};m.position.set(x,y,z);m.receiveShadow=true;g.add(m);return m;}
 function box(g,name,w,h,d,m,x,y,z,rounded=false){if(Math.min(w,h,d)<=0)return null;const key=[w,h,d,rounded].join('/');if(!cache.has(key))cache.set(key,rounded?new RoundedBoxGeometry(w,h,d,2,Math.min(.025,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d));return mesh(g,name,cache.get(key),m,x,y,z);}
 function group(parent,name,x,y,z,yaw=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=yaw;parent.add(g);return g;}
 function rod(g,name,a,b,r,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const o=mesh(g,name,new THREE.CylinderGeometry(r,r,v.length(),8),m,...A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
 function tube(g,name,points,r,m){return mesh(g,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,8,false),m,0,0,0);}
 function door(g,w,h,x,y,z,m,glazed=false,handle=true){const rail=Math.min(.055,w*.19,h*.19);if(!glazed)box(g,'shaker-inset',w,h,.022,m,x,y,z);else box(g,'display-glass',w-rail*2,h-rail*2,.008,glass,x,y,z);
 for(const a of [-1,1]){box(g,'shaker-rail',w,rail,.023,m,x,y+a*(h-rail)/2,z+.017);box(g,'shaker-stile',rail,h-2*rail,.023,m,x+a*(w-rail)/2,y,z+.017);}
 if(handle){const xx=x+w*.32;rod(g,'brass-handle',[xx,y-.065,z+.043],[xx,y+.065,z+.043],.009,brass);}}
 function layout(r){const b=r.box,c=b.getCenter(new THREE.Vector3()),d=b.getSize(new THREE.Vector3());const x=c.x+ox,z=c.z+oz;
 const yaw=x<108.48&&z>-4.55&&z<-.1?Math.PI/2:z>-.2?Math.PI:0;
 return {c,d,x,z,yaw,w:Math.abs(Math.sin(yaw))>.5?d.z:d.x,depth:Math.abs(Math.sin(yaw))>.5?d.x:d.z,h:d.y};}
 function collision(g){g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g);colliders.push({group:g,box:b});}
 function hide(r){sourceSet.add(r);}
 const applianceTowerId='1i4uGbbCb1sfVKL64tKps7',fridgeId='2VwmdgVG98iR_5aCtntVj9';
 for(const r of eligible){
  const L=layout(r),{c,d,w,depth,h,yaw}=L,upper=r.box.min.y>1.45;
  if(w<.12||depth<.035||h<.12){report.rejected.push(id(r));continue;}
  const g=group(groups.cabinetry,'REPLACEMENT_'+id(r),c.x,r.box.min.y,c.z,yaw);
  if(id(r)===fridgeId){
   box(g,'fridge-body',w,h,depth,steel,0,h/2,0,true);
   for(const a of [-1,1]){box(g,'fridge-door',w/2-.008,h*.65,.04,steel,a*w/4,h*.66,depth/2+.018,true);tube(g,'curved-fridge-pull',[[a*.05,h*.39,depth/2+.06],[a*.05,h*.59,depth/2+.10],[a*.05,h*.90,depth/2+.06]],.012,steel);}
   for(const y of [h*.105,h*.265]){box(g,'freezer-drawer',w-.01,h*.15,.04,steel,0,y,depth/2+.02,true);rod(g,'drawer-pull',[-w*.3,y+.04,depth/2+.06],[w*.3,y+.04,depth/2+.06],.012,steel);}report.fridges++;
  }else if(id(r)===applianceTowerId){
   box(g,'tower-case',w,h,depth,ivory,0,h/2,0);
   for(const [y,hh] of [[h*.31,h*.58],[h*.82,h*.30]]){box(g,'appliance-metal-frame',w-.022,hh,.034,steel,0,y,depth/2+.016);box(g,'appliance-glass',w-.085,hh-.075,.025,black,0,y-.012,depth/2+.039);rod(g,'appliance-pull',[-w*.36,y+hh*.32,depth/2+.067],[w*.36,y+hh*.32,depth/2+.067],.012,steel);}report.applianceTowers++;
  }else{
   const m=upper?ivory:sage,plinth=upper?0:Math.min(.10,h*.13);
   const front=depth/2+.003,glazed=upper&&w>.40&&report.upperCabinets%3===0;
   if(glazed){
    box(g,'cabinet-back',w,h,.025,ivory,0,h/2,-depth/2+.013);
    for(const a of [-1,1])box(g,'cabinet-side',.025,h,depth,ivory,a*(w-.025)/2,h/2,0);
    for(let i=0;i<4;i++){const y=.025+i*(h-.05)/3;box(g,'display-shelf',w-.05,.024,depth-.03,ivory,0,y,0);if(i<3)mesh(g,'ceramic-bowl',new THREE.CylinderGeometry(.075,.04,.055,16),cream,0,y+.044,0);}
    report.glassCabinets++;
   }else box(g,'cabinet-carcass',w,h-plinth,depth,m,0,(h+plinth)/2,0);
   if(plinth)box(g,'recessed-steel-toekick',w-.025,plinth,Math.max(.025,depth-.08),steel,0,plinth/2,-.025);
   const doorH=h-plinth-.025;
   if(!upper&&w>.4&&h<.85&&report.baseCabinets%3===1){
    for(let j=0;j<3;j++){const draw=group(g,'STORAGE_DRAWER',0,plinth+doorH*(j+.5)/3,front);door(draw,w-.012,doorH/3-.008,0,0,0,m,false,false);rod(draw,'drawer-brass-pull',[-w*.22,0,.045],[w*.22,0,.045],.009,brass);
     if(j===0){box(draw,'cutlery-tray',w*.85,.035,Math.min(depth*.65,.30),oak,0,-.045,-Math.min(depth*.30,.14));moving.push(draw);}}
   }else if(w>.75){for(const a of [-1,1])door(g,w/2-.01,doorH,a*w/4,(h+plinth)/2,front,m,glazed);}
   else door(g,w-.012,doorH,0,(h+plinth)/2,front,m,glazed);
   if(upper){report.upperCabinets++;box(g,'crown-moulding',w+.014,.05,depth+.025,ivory,0,h-.015,.006);box(g,'task-led',w-.04,.012,.022,led,0,-.007,depth*.30);report.ledStrips++;}
   else report.baseCabinets++;
  }
  hide(r);report.replacedCabinets++;if(!upper)collision(g);
 }
 // Original oven/fridge meshes duplicate the new exact-envelope models.
 for(const r of records){if(r.layer?.level!=='ground'||!APPLIANCES.has(id(r)))continue;
  if(id(r)==='2keCsr0mD6VQFrRoVeV3j3')continue; // preserve original mounted fixture pending identification
  if((id(r)==='16DJgqQcHChxwsLDJooVJ6'&&report.fridges)||(id(r)!=='16DJgqQcHChxwsLDJooVJ6'&&report.applianceTowers)){hide(r);report.replacedAppliances++;}
 }
 // Preserve the two actual L-shaped worktops and existing sink geometry.
 // A cooktop belongs to the west counter, not the empty bounding-box centre.
 const cookX=108.16-ox,cookZ=-3.45-oz,topY=top[0].box.max.y;
 const cook=group(groups.appliances,'COOKTOP_ON_SOURCE_RUN',cookX,topY+.008,cookZ,Math.PI/2);
 box(cook,'gas-cooktop',.48,.025,.46,black,0,0,0,true);
 for(const x of [-.12,.12])for(const z of [-.105,.105]){const t=mesh(cook,'burner',new THREE.TorusGeometry(.064,.008,8,16),steel,x,.023,z);t.rotation.x=Math.PI/2;for(const a of [-1,1])box(cook,'burner-grate',.12,.017,.012,black,x,.035,z+a*.055);}
 const hood=group(groups.appliances,'IVORY_HOOD',108.09-ox,1.94,-3.45-oz,Math.PI/2);
 box(hood,'hood-body',.48,.61,.42,ivory,0,.31,0);box(hood,'hood-moulding',.51,.065,.46,ivory,0,.045,.015);box(hood,'hood-crown',.52,.055,.46,ivory,0,.59,0);
 const filler=group(groups.appliances,'POT_FILLER',107.88-ox,1.22,-3.45-oz,Math.PI/2);
 rod(filler,'brass-pot-filler',[0,0,0],[.12,0,.12],.012,brass);rod(filler,'brass-pot-filler',[.12,0,.12],[0,0,.24],.012,brass);
 // Island fits between the actual perimeter runs; retain east open access.
 const cx=110.05,cz=-2.25,iw=.70,il=1.65;
 const B=new THREE.Box3(new THREE.Vector3(cx-ox-iw/2,0,cz-oz-il/2),new THREE.Vector3(cx-ox+iw/2,.91,cz-oz+il/2));
 const blocked=records.some(r=>r.layer?.level==='ground'&&r.mesh?.visible&&r.box&&!sourceSet.has(r)&&!r.mesh.userData?.clientKitchenDiningDividerRemoved&&!r.mesh.userData?.clientKitchenStairPartitionRemoved&&/walls|columns|doors|furniture|proxies/.test(r.category)&&B.intersectsBox(r.box)&&r.box.max.y>.10&&r.box.min.y<.86);
 const supported=[[-1,-1],[-1,1],[1,-1],[1,1],[0,0]].every(([a,b])=>{const f=floorSampler(cx-ox+a*iw/2,cz-oz+b*il/2,0);return Number.isFinite(f?.y)&&Math.abs(f.y)<.15;});
 if(!blocked&&supported){
 const island=group(groups.cabinetry,'ISLAND',cx-ox,0,cz-oz,Math.PI/2);
 box(island,'island-base',il-.05,.77,.56,sage,0,.49,-.04,true);box(island,'island-steel-plinth',il-.12,.10,.46,steel,0,.05,-.04);box(island,'island-stone-top',il,.045,iw,stone,0,.885,0,true);box(island,'island-waterfall',.04,.86,iw,stone,-il/2+.025,.43,0,true);
 for(let i=0;i<3;i++)door(island,(il-.09)/3,.62,(i-1)*.51,.45,.246,sage);
 collision(island);report.islands++;
 for(let i=0;i<3;i++){const stool=group(groups.cabinetry,'STOOL_'+i,cx+.61-ox,0,cz+(i-1)*.52-oz,Math.PI/2);const seat=mesh(stool,'cream-saddle-seat',new THREE.SphereGeometry(1,16,10),cream,0,.63,0);seat.scale.set(.22,.045,.18);
 for(const a of [-1,1])for(const b of [-1,1])rod(stool,'wooden-leg',[a*.18,.025,b*.14],[a*.12,.59,b*.10],.022,oak);
 rod(stool,'footrest',[-.16,.22,.12],[.16,.22,.12],.019,oak);collision(stool);report.stools++;}
 const chandelier=group(groups.lighting,'BRASS_CHANDELIER',cx-ox,2.35,cz-oz);
 rod(chandelier,'ceiling-stem',[0,0,0],[0,.75,0],.018,brass);
 for(let i=0;i<5;i++){const a=i*2*Math.PI/5,x=Math.cos(a)*.32,z=Math.sin(a)*.32;tube(chandelier,'curved-brass-arm',[[0,0,0],[x*.65,-.06,z*.65],[x,.08,z],[x,.19,z]],.012,brass);mesh(chandelier,'ivory-shade',new THREE.CylinderGeometry(.075,.115,.15,16,1,true),cream,x,.25,z);mesh(chandelier,'bulb',new THREE.SphereGeometry(.025,8,6),led,x,.21,z);}
 const lamp=new THREE.PointLight(0xffe6bf,0,3,2);lamp.position.y=.18;chandelier.add(lamp);lights.push(lamp);
 }else report.rejected.push('island: source obstruction or missing floor support');
 // Floor planks on the real kitchen slab, only inside the measured cabinet-room
 // rectangle; never cover dining or a doorway. Lightweight instanced batches.
 const colors=[0xb28b64,0xbd9972,0xa77d57,0xc39c76,0xb8906a];
 const plankGeo=new THREE.BoxGeometry(.94,.006,.18);const matrices=colors.map(()=>[]);
 for(let j=0;j<30;j++)for(let i=0;i<5;i++){const x=108.08+i*.94+(j%2)*.47,z=-5.11+j*.18;if(x-.47<107.85||x+.47>112.20||z+.09>.50)continue;const f=floorSampler(x-ox,z-oz,0);if(!Number.isFinite(f?.y)||Math.abs(f.y)>.15)continue;matrices[(i*7+j*3)%5].push(new THREE.Matrix4().makeTranslation(x-ox,f.y+.018,z-oz));report.floorPlanks++;}
 matrices.forEach((arr,i)=>{if(!arr.length)return;const m=mat(colors[i],.74);materials.push(m);const batch=new THREE.InstancedMesh(plankGeo,m,arr.length);batch.name='KITCHEN_CARAMEL_PLANKS';arr.forEach((a,k)=>batch.setMatrixAt(k,a));batch.instanceMatrix.needsUpdate=true;groups.floor.add(batch);});
 function sync(){root.visible=enabled;for(const r of sourceSet)r.mesh.visible=!enabled;for(const k of Object.keys(switches))groups[k].visible=switches[k];}
 function status(){return {stage:3,roomId:'G-KITCHEN',enabled,visible:root.visible,sourceWorktopVerified:true,sourceWorktopGuid:id(top[0]),baseCabinetPanels:report.baseCabinets,appliancePieces:report.replacedAppliances+4,storageFixtures:moving.length,ledStrips:report.ledStrips,sourceFloorProbesPassed:report.floorPlanks,sourceGeometryUnmodified:true,sourceCollidersUnmodified:true,openConceptConnectionsUnchanged:true,pantryShelvesCreated:0,separatePantryFootprintCertified:false,clearanceMeasuredAndApproved:false,workTriangleMeasuredAndApproved:false,finalApplianceCoordinatesApproved:false,clientApproved:false,options:{...switches},storageOpen:opening,requirements,phase14d:report};}
 return {root,groups,sourceSet,colliders,status,enable(v=true){enabled=!!v;sync();return status();},setOptions(p={}){for(const [k,v] of Object.entries(p)){if(!(k in switches)||typeof v!=='boolean')throw Error('Invalid Stage 3 kitchen option: '+k);switches[k]=v;}sync();return status();},openStorage(v=true){opening=!!v;return status();},update(dt){progress=THREE.MathUtils.damp(progress,opening?1:0,10,Math.min(.1,Math.max(0,dt)));for(const d of moving){d.userData.closedZ??=d.position.z;d.position.z=d.userData.closedZ+progress*.20;}},updateVisibility(floor='all',walking=false,showFurniture=true,taskOn=true,lightsOn=true){root.visible=enabled&&showFurniture&&(floor==='all'||floor==='ground'||walking);if(enabled)for(const r of sourceSet)r.mesh.visible=false;for(const l of lights)l.intensity=root.visible&&taskOn&&lightsOn&&switches.lighting?2:0;led.emissiveIntensity=taskOn&&lightsOn?.8:0;return status();},blocks(x,z,foot,radius){return root.visible&&colliders.some(({group,box:b})=>group.visible&&foot+.25<b.max.y&&foot+1.45>b.min.y&&x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius);},dispose(){for(const r of sourceSet)r.mesh.visible=true;root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());scene.remove(root);}};
}
