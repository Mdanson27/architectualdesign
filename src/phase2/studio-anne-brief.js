/**
 * Studio Anne — Emmanuel's Design Brief, pp. 2–5.
 * These are three ALTERNATIVES, not signed-off finish selections.
 * Recolor existing materials only: never replace IFC geometry, collision,
 * architectural openings, structural walls or original material references.
 */
export const STUDIO_ANNE_SCHEMES=Object.freeze({
 mint:Object.freeze({
  label:'Mint · calm',pages:[3],ratios:[60,30,10],
  description:'Mint / ivory / warm gold, preview only',
  colors:Object.freeze({wall:'#f2f1e9',feature:'#b7ddca',floor:'#f4ede3',
   cream:'#faf3e9',taupe:'#c5d7ca',sage:'#a5cdb7',oak:'#cab397',
   walnut:'#89684f',accent:'#b89b63'})
 }),
 taupe:Object.freeze({
  label:'Taupe · warm',pages:[4],ratios:[60,30,10],
  description:'Taupe / ivory / dark brown, preview only',
  colors:Object.freeze({wall:'#eee5dc',feature:'#bca99a',floor:'#eee6de',
   cream:'#f9f1e7',taupe:'#958072',sage:'#ad9f90',oak:'#b89a7e',
   walnut:'#50382d',accent:'#a98267'})
 }),
 powder:Object.freeze({
  label:'Powder blue · tranquil',pages:[5],ratios:[60,30,10],
  description:'Powder blue / ivory / charcoal and light gold, preview only',
  colors:Object.freeze({wall:'#f0f3f7',feature:'#b5cee0',floor:'#f1f1f0',
   cream:'#f8f4ed',taupe:'#b3c5d5',sage:'#aec4d4',oak:'#c2b5a7',
   walnut:'#60545b',accent:'#c6ab77'})
 })
});
export const DESIGN_BRIEF_SOURCE='Studio Anne / Emmanuel\'s Design Brief (46 pages)';
export const DESIGN_BRIEF_LIGHTING=Object.freeze({
 entrance:Object.freeze({kelvin:[2700,3000],page:10}),
 dining:Object.freeze({kelvin:[2700,2700],page:10,
  note:'Centre pendant above actual table, 0.75–0.90 m over tabletop'}),
 kitchen:Object.freeze({kelvin:[3000,4000],page:11,
  note:'Task lights over counters; switch separately'}),
 bedroom:Object.freeze({kelvin:[2700,2700],page:11}),
 bathroom:Object.freeze({kelvin:[3000,4000],page:11,
  note:'Mirror illumination, moist-area rated fixtures'}),
 office:Object.freeze({kelvin:[3500,4000],page:12}),
 stairs:Object.freeze({kelvin:[2700,3000],page:12,note:'LED step lighting'})
});
const originals=new WeakMap();
function recolor(material,hex){
 if(!material?.color?.set || !material.isMeshStandardMaterial)return;
 if(!originals.has(material))originals.set(material,material.color.clone());
 if(hex===null)material.color.copy(originals.get(material));
 else material.color.set(hex);
 material.needsUpdate=true;
}
/**
 * Applies the selected whole-home colour mood only to known material roles.
 * Source IFC positions and architectural materials remain in memory.
 * Per-room assignments must wait for owner approval; presets are previews.
 */
export function applyStudioAnneScheme(materials,records=[],scheme='source'){
 if(scheme!=='source'&&!STUDIO_ANNE_SCHEMES[scheme])
  throw Error('Unrecognised Studio Anne colour scheme: '+scheme);
 const colors=scheme==='source'?null:STUDIO_ANNE_SCHEMES[scheme].colors;
 const roles=['wall','feature','floor','cream','taupe','sage','oak','walnut','accent'];
 for(const role of roles)recolor(materials?.[role],colors?.[role]??null);
 // Some verified IFC wall openings use cloned wall materials for their
 // reversible clipping shaders. Tint those clones without replacing them.
 let sourceWallClones=0;
 for(const record of records){
  if(record.category!=='walls'||record.mesh?.material===materials.wall)continue;
  const item=record.mesh?.material;
  if(!item?.isMeshStandardMaterial)continue;
  recolor(item,colors?.wall??null);
  sourceWallClones++;
 }
 return {scheme,label:STUDIO_ANNE_SCHEMES[scheme]?.label??'Original source preview',
  previewOnly:true,alternativesNotApproved:true,
  paletteRatios:STUDIO_ANNE_SCHEMES[scheme]?.ratios??null,
  sourceWallClones,sourceIFCUnmodified:true,geometryRebuilt:false};
}

/** Studio Anne page 7: flooring samples are alternatives, not an approved
 * room-by-room specification. Preview the colour/texture on the existing
 * source slabs only; no geometry, floor height or collision alterations.
 */
export const STUDIO_ANNE_FLOORS=Object.freeze({
 porcelain:Object.freeze({label:'Porcelain / ceramic',page:7,
  previewColor:'#f0ece6',roughness:.4,map:'marble'}),
 ash:Object.freeze({label:'Ash wood-look tiles',page:7,
  previewColor:'#efe7db',roughness:.66,map:'ash'}),
 caramel:Object.freeze({label:'Caramel wood-look tiles',page:7,
  previewColor:'#d2b292',roughness:.62,map:'caramel'})
});
const floorOriginals=new WeakMap();
export function applyStudioAnneFloorPreview(material,maps,style='source'){
 if(style!=='source'&&!STUDIO_ANNE_FLOORS[style])
  throw Error('Unrecognised Studio Anne flooring style: '+style);
 if(!material?.isMeshStandardMaterial)throw Error('Expected an IFC floor preview material');
 if(!floorOriginals.has(material))
  floorOriginals.set(material,{map:material.map,roughness:material.roughness});
 const original=floorOriginals.get(material);
 if(style==='source'){
  material.map=original.map;material.roughness=original.roughness;
 }else{
  const config=STUDIO_ANNE_FLOORS[style];
  if(!maps?.[config.map])throw Error('Missing flooring sample texture: '+config.map);
  material.map=maps[config.map];
  material.color.set(config.previewColor);
  material.roughness=config.roughness;
 }
 material.needsUpdate=true;
 return {style,label:STUDIO_ANNE_FLOORS[style]?.label??'Original floor',
  previewOnly:true,sourceIFCUnmodified:true,
  dimensionsUnchanged:true,page:7};
}
