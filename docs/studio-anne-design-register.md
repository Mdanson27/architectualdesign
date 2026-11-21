# Studio Anne — Emmanuel's Design Brief implementation register

**Source:** *Emmanuel's Design Brief*, Studio Anne, 46 pages.  
**Project:** AutoMinds Spaces / actual-house.html  
**Status:** Development reference — not client sign-off.

## Non-negotiable implementation rules

1. The existing verified Home architectural plans and IFC geometry remain authoritative for dimensions, openings, stairs, exterior boundaries, and room positions. This is a finishes/inspiration brief, **not** a replacement architectural plan.
2. Pages 2–5 present alternatives: Modern vs Classic/Traditional and **Mint, Taupe, Powder Blue** (each 60% dominant, 30% ivory, 10% accent). **None is confirmed final.** A reversible whole-home finish comparison exists; approved per-room assignments are pending.
3. All new decorative geometry must be removable and must not block entrances, open-plan connections, circulation, balcony exits, stair railings, or windows.
4. No inferred plumbing, electrical, mechanical or underground services should be described as installed or source-authentic. In-browser lights illustrate visual effect only.
5. Keep real IFC materials and geometry accessible by restoring the original preview.

## Design requirements by brief page

| Brief pages | Subject | Source direction | Implementation status / next action |
|---|---|---|---|
| 2 | Design direction | Modern **or** Classic/Traditional | **Decision needed.** Do not automatically remodel architecture from inspirational photographs |
| 3–5 | Colour concepts | Mint/ivory/warm gold; Taupe/ivory/dark brown; Powder blue/ivory/charcoal-light gold | **Implemented:** reversible material preview selector. **Pending:** exact per-room colour application and client sign-off |
| 6 | Ceiling options | Suspended/dropped; beamed; flat | **Pending:** map to verified rooms and choose ceiling types; preserve approved storey heights |
| 7 | Floors | Ceramic/porcelain or ash/caramel wood-texture tiles | **Implemented as optional preview:** porcelain/ceramic, ash wood-look and caramel wood-look textures, with original floor restoration. **Pending:** room-specific finish selection and grout scale |
| 8 | Wall surfaces | Paint, texture, stone cladding and flush skirting (>=6 mm allowance referenced) | **Partially implemented:** recolourable finishes; **pending:** approved specific accent walls, cladding and detailed skirting |
| 9 | Light fixture types | Chandelier, pendant, recessed, floor/table lamps, wall sconce | **Partially implemented:** existing recessed lights + provisional dining pendant; other fixture placements not confirmed |
| 10–12 | Lighting design | Warm entrance 2700–3000K, dining ~2700K, kitchen 3000–4000K, bedroom ~2700K, bathroom 3000–4000K, office 3500–4000K, staircase step lights, independent ambient/task/accent zones | **Implemented as visual preview:** temperature-coded existing room emitters and separate kitchen/stair/dining layers. **Pending:** electrical plan, final control groups, measured fixture coordinates and specialist verification |
| 13 | Entry/powder room | Storage ottoman, decorative entry and powder-room ambience | **Pending:** check entry floor clearances before adding furniture |
| 14–19 | Living room | Balanced comfortable sofa and accent chairs, TV unit, proportionate coffee table, full-height curtains, rug, concealed storage, lighting, acoustic softness and clear circulation | **Partially existing:** furniture and circulation corrections. **Pending:** approved realistic upholstery, rug and curtain positioning; preserve fully open ground floor |
| 20–21 | Dining | Table, upholstered chairs, pendants and feature wall | **Partially existing:** six-seat group, table (2.17 x 1.10m) and pendant aligned over existing table; **pending:** approval of furniture models, seat fabrics and table-centred pendant height |
| 22–25 | Bedrooms | Headboard mood/bedside lights, bedding/rugs, seating, full-height closets, walk-in parallel wardrobes, closed storage and shelves | **Partially existing:** source-anchored 3D bed previews. **Pending:** room-mapped cabinetry/bedside light placement; check bedroom door and balcony clearance |
| 25 | Home office | Desk and shelving references | **Pending:** confirm that a designated office exists in the floor plan before introducing the fixtures |
| 26–32 | Kitchen | L-shaped cabinetry/integrated appliances, wall-mounted tap, undermount double sink, waterproof under-sink work, spice racks, pull-out bins, lazy Susan, recessed stainless-steel skirting, 42–48-inch clearance, ventilation/hood and under-cabinet LEDs | **Partially existing:** source kitchen counters + enhanced task lights. **Pending:** detailed appliances and cabinets; measure real counter clearance; keep Kitchen–Dining–Sitting OPEN |
| 33–35 | Staircase | Art/textured finishes, glass/metal balustrade references, step lights and possible beneath-stair storage | **Partially existing:** source-based two flights, landing, guards and provisional step lights. **Pending:** finish approval; never remove necessary edge protection |
| 36 | Sitting/reading area | Chairs, table, rug and green plant for balance | **Pending:** confirm floor-plan room assignment and adequate circulation |
| 37–40 | Bathrooms | Glass shower separator except concrete maid's-room separator, full-height porcelain tiling, wall taps, bidet/drain, enclosed storage, ventilation, waterproofing; no black faucet finishes; prefer brushed brass/chrome/brushed nickel | **Pending:** apply per-bathroom after verifying source locations and fixtures. Do not claim physical wet-area details validated by 3D render |
| 41 | Pantry | Floor-to-ceiling adjustable shelves, pull-out baskets, bulk storage, ventilation, easy clean surfaces and clear walking access | **Pending:** source-confirm pantry footprint |
| 42–43 | Landscape references | Pavers/stone, planting, gutters and drainage, warm landscape lights, shade structure as possible concept | **Partially existing:** curated pavers, grass, palms, gate and parking; **pending:** drainage and lighting as plan-backed improvements. Parking shade is a **reference option**, not an approved addition |
| 44–45 | Exterior design | Weather-resistant Uganda-suitable plants, non-invasive roots, slip-resistant paving, drainage away from structures, min 2.5m x 5.0m vehicle slots subject to constraints, privacy/lighting and maintenance | **Pending:** real field verification; preserve the approved new right-fence gate, straight drive, and majority green compound |
| 46 | Decision principle | Design choices are directional and can be refined | **Ongoing:** keep all proposed treatments clearly marked as previews |

## Accepted architecture to preserve

- House geometry and source walls/windows/roof remain IFC-derived.
- Three missing/false interior dividing boundaries previously corrected: Kitchen–Dining, Sitting–Dining and Stair–Sitting. Do not reintroduce removed walls.
- Maid's interior door is sealed, balcony-facing entrance preserved.
- Source-confirmed balcony access, railings, first-floor egress, bedroom walking and staircase safety must keep passing the project's existing tests.
- Compound: gate on palm-tree-side fence near foreground end; 4.6 m straight paved driveway with continuously aligned parking edge; approximately 37.3% paving and majority lawn (provisional model values, **not** a surveyed build).

## Next ordered development stages

1. **Finish sign-off:** Ask client to select Modern or Classic/Traditional and room-specific scheme/ceiling/floor, using currently implemented live previews.
2. **Kitchen detail pass:** fit appliances and cabinetry to measured existing coordinates; don't obstruct counter/work triangle or open connection.
3. **Living/dining refinement:** fit authentic sofa, accent chair, curtains, rugs, TV wall with doorway collision tests.
4. **Bedroom and bathroom schedules:** confirm actual floor plan room types, waterproof equipment, storage and finish palette before furnishing.
5. **Outdoor finish realism:** texture/scale paving; grass variation; landscape and drainage only where architectural guidance supports them.
6. **Quality gate:** test every visible addition in Chrome at room eye height and plan view; automated 26 doors and 5 room routes; verify browser rendering, site gate/drive and collision barriers before main deployment.

**Not implemented yet:** full kitchen appliance modelling, bathroom fixtures, all wardrobes, ceilings, complete furnished bedrooms, confirmed exterior drainage and final client-approved finishes. These require precise source mapping and/or owner choices. No changes to the original IFC or architectural floor plans are authorised by this register.
