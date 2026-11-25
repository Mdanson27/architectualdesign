import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {
 createStage2SurfaceSystem,STAGE2_FINISH_ROOMS,STAGE2_ROOM_PROPOSALS,
 STAGE2_FLOOR_CHOICES,STAGE2_CEILING_CHOICES,STAGE2_WALL_CHOICES
} from '../src/phase2/stage2-surface-system.js';
import {STAGE1_ROOMS} from '../src/phase2/stage1-room-audit.js';
const scene=new THREE.Scene();
const mesh=new THREE.Mesh(new THREE.BoxGeometry(.13,3.15,2.0),
 new THREE.MeshStandardMaterial({color:0xebdfd1,roughness:.92}));
mesh.visible=true;
mesh.userData.ifc={guid:'test-source-guid',name:'SW - SOURCE WALL'};
const sourceMaterial=mesh.material,sourceGeo=mesh.geometry;
const originalColor=sourceMaterial.color.clone();
const wall={
 category:'walls',layer:{level:'ground'},
 box:new THREE.Box3(new THREE.Vector3(112.40,0,-3.25),
  new THREE.Vector3(112.53,3.25,-1.25)),
 mesh
};
const textures={marble:new THREE.Texture(),ash:new THREE.Texture(),
 caramel:new THREE.Texture(),stone:new THREE.Texture(),plaster:new THREE.Texture()};
const floorCalls=[],ceilingCalls=[];
const system=createStage2SurfaceSystem({
 scene,origin:{x:0,z:0},records:[wall],textureMaps:textures,
 doors:[{level:'ground',position:{x:112.46,z:-2.25},width:.9,removedFromPlan:false}],
 floorSampler:(x,z,datum)=>{floorCalls.push([x,z,datum]);return {y:datum};},
 ceilingSampler:(x,z,datum)=>{ceilingCalls.push([x,z,datum]);return {y:datum+3.3};}
});
const schedule=JSON.parse(fs.readFileSync('architecture/stage2-finishes-schedule.json','utf8'));
assert.equal(schedule.schema,'autominds.stage2-finishes-schedule.v1');
assert.equal(schedule.rooms.length,10);
assert.equal(schedule.status,'draft-not-approved');
for(const room of schedule.rooms){
 assert.deepEqual(room.proposed,STAGE2_ROOM_PROPOSALS[room.id],
  'Stage 2 client-facing materials schedule must agree with implemented proposal');
 assert.equal(room.clientApproved,false);
 assert.equal(room.architecturalOutlineCertified,false);
}
assert.equal(STAGE2_FINISH_ROOMS.length,10);
assert.deepEqual(STAGE2_FINISH_ROOMS.map(x=>x.id),STAGE1_ROOMS.map(x=>x.id));
assert.deepEqual(STAGE2_FLOOR_CHOICES,['source','porcelain','ash','caramel']);
assert.deepEqual(STAGE2_WALL_CHOICES,['source','painted','textured','stone-accent']);
assert.deepEqual(STAGE2_CEILING_CHOICES,['source','flat','beamed','suspended']);
assert.equal(system.root.visible,true);
assert.strictEqual(scene.children.includes(system.root),true);
assert.equal(system.summary().enhancedRooms,0,'Stage 2 must be off by default');
assert.equal(system.summary().finalPaletteApproved,false);
const choices={
 palette:'taupe',floor:'porcelain',wall:'textured',ceiling:'suspended',skirting:true
};
let result=system.setRoom('G-DINING',choices);
assert.equal(result.enhancedRooms,1);
assert(result.tiles>30,'real floor tiles needed');
assert(result.finishedSourceWallParts>=1,'painted source wall mesh should be a real material clone');
assert.equal(system.roomStatus('G-DINING').counts.skirtingAllowanceM,.006);
assert(result.skirtingPieces>0,'source-wall-aligned flush baseboards needed');
assert(result.ceilingPanels>0,'source-backed ceiling panels needed');
assert(result.ceilingDetails>0,'source-backed ceiling decorative accents needed');
assert(result.sampledFloorAreaM2>0);
assert(result.sourceGeometryUnmodified);
assert(result.sourceColliderCountUnchanged);
assert(!result.finalPaletteApproved);
assert(!result.roomPolygonsCertified);
assert.notStrictEqual(mesh.material,sourceMaterial,'room wall material must be cloned');
assert.strictEqual(mesh.geometry,sourceGeo,'source IFC wall geometry is immutable');
assert(sourceMaterial.color.equals(originalColor),'shared source material must not be recoloured');
assert.equal(mesh.material.userData?.clientApproved,undefined);
const wallsGroup=system.root.children.find(x=>x.name.includes('G-DINING'));
assert(wallsGroup);
let tiles=0,skirt=0,ceiling=0;
wallsGroup.traverse(o=>{
 if(o.isMesh&&o.userData.part==='floor'){assert(o.userData.collidable===false);tiles+=o.userData.coveredCells;}
 if(o.isInstancedMesh){
  assert(o.userData.stage2&&o.userData.collidable===false);
  assert(o.userData.planPolygonCertified===false);
  if(o.userData.part==='skirting')skirt+=o.count;
  if(o.userData.part==='ceiling')ceiling+=o.count;
 }
});
assert.equal(tiles,system.roomStatus('G-DINING').counts.tiles);
assert.equal(skirt,system.roomStatus('G-DINING').counts.skirtingPieces);
assert.equal(ceiling,system.roomStatus('G-DINING').counts.ceilingPanels);
system.updateVisibility('first',false,false);
assert.equal(wallsGroup.visible,false,'wrong floor samples must be hidden');
system.updateVisibility('ground',false,false);
assert.equal(wallsGroup.visible,true,'room samples must reappear on correct level');
system.updateVisibility('ground',false,true);
assert.equal(wallsGroup.children.filter(x=>x.userData?.part==='ceiling').every(x=>!x.visible),true,
 'source ceilings must not conceal sectional room inspection');
system.updateVisibility('ground',true,true);
assert.equal(wallsGroup.children.filter(x=>x.userData?.part==='ceiling').every(x=>x.visible),true,
 'ceiling details remain visible in eye-level walkthrough');
assert.throws(()=>system.setRoom('UNKNOWN',{wall:'painted'}),/Unknown/);
assert.throws(()=>system.setRoom('G-DINING',{wall:'unapproved'}),/Unsupported/);
assert.throws(()=>system.setRoom('G-DINING',{skirting:'yes'}),/boolean/);
const sourceAfter=system.setRoom('G-DINING',{floor:'source',wall:'source',
 ceiling:'source',palette:'source',skirting:false});
assert.equal(sourceAfter.enhancedRooms,0);
assert.strictEqual(mesh.material,sourceMaterial);
assert.strictEqual(mesh.geometry,sourceGeo);
assert(sourceMaterial.color.equals(originalColor));
const proposal=system.applyProposal();
assert.equal(Object.keys(STAGE2_ROOM_PROPOSALS).length,10);
assert.equal(proposal.mappedRooms,10);
assert.equal(proposal.enhancedRooms,9,'maid room must remain untouched due unresolved boundary mismatch');
assert(proposal.tiles>100);
assert(proposal.ceilingPanels>100);
assert.equal(system.roomStatus('G-MAID').selection.floor,'source');
assert.equal(system.roomStatus('G-MAID').selection.ceiling,'source');
assert.equal(system.roomStatus('G-MAID').selection.skirting,false);
assert.equal(system.roomStatus('G-DINING').selection.wall,'painted');
assert(proposal.sourceWallMaterialsOverriddenReversibly>=1);
const after=system.restoreAll();
assert.equal(after.enhancedRooms,0);
assert.equal(after.tiles,0);
assert.equal(after.finishedSourceWallParts,0);
assert.equal(after.ceilingPanels,0);
assert.strictEqual(mesh.material,sourceMaterial);
assert.strictEqual(mesh.geometry,sourceGeo);
assert(sourceMaterial.color.equals(originalColor));
assert(scene.children.includes(system.root));
assert(floorCalls.length>100&&ceilingCalls.length>100);
const missingCeiling=createStage2SurfaceSystem({
 scene:new THREE.Scene(),records:[],textureMaps:textures,
 floorSampler:()=>null,ceilingSampler:()=>null
});
const noSource=missingCeiling.setRoom('G-DINING',{
 floor:'ash',ceiling:'flat',wall:'painted',skirting:true,palette:'mint'
});
assert.equal(noSource.tiles,0);
assert.equal(noSource.ceilingPanels,0);
assert.equal(noSource.skirtingPieces,0);
assert.equal(noSource.finishedSourceWallParts,0);
system.dispose();
assert(!scene.children.includes(system.root));
assert.strictEqual(mesh.material,sourceMaterial);
console.log('STAGE2_WHOLE_HOUSE_FINISHES_VERIFIED',JSON.stringify({
 rooms:STAGE2_FINISH_ROOMS.length,proposalRooms:proposal.enhancedRooms,
 floorTiles:proposal.tiles,sourceWallMaterials:proposal.finishedSourceWallParts,
 ceilingPanels:proposal.ceilingPanels,skirting:proposal.skirtingPieces,
 finishStyles:[...STAGE2_FLOOR_CHOICES,...STAGE2_WALL_CHOICES,...STAGE2_CEILING_CHOICES],
 originalIfcGeometryUnmodified:true,sourceMaterialRestored:true,
 approvedDesignSelections:false,provisionalMaidRoomProtected:true
}));
