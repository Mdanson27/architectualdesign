# AutoMinds Spaces — Stage 02: Architectural Materials & Interior Finish System

**Technical status:** Room-by-room material engine implemented for all ten named plan spaces. Source-aligned rendered surfaces are available as reversible design proposals. **Client and architect approval remains pending**; this is not an as-built finish schedule.

## Source references checked

**Studio Anne / Emmanuel's Design Brief, 46 pages:**
- Page 2 — Modern versus Classic/Traditional design directions (alternatives)
- Pages 3–5 — Mint / Taupe / Powder Blue 60/30/10 palette alternatives
- Page 6 — Suspended/dropped, beamed and flat ceiling choices
- Page 7 — Porcelain/ceramic and ash/caramel wood-look **tiles**
- Page 8 — Painted, textured and stone-clad walls; flush skirting requiring an allowance of at least 6 mm

The brief explicitly presents choices, not a signed-off room-by-room schedule. The project remains anchored in the source Home S1/S2 plans and IFC mesh geometry, with all later user-approved open-concept, maid-room, stair, balcony, window and exterior corrections retained.

## Implemented engineering deliverables

### 1. Ten-room scheduling and reversible full-house concept

The Studio Anne panel now offers all ten named rooms, each with a separate palette, flooring, wall finish, ceiling treatment and optional skirting. Users can apply one room, preview a coordinated nine-room concept, restore just the selected room, or restore every room and the earlier whole-home presets. The tenth room (maid's room) remains untouched by the **automatic** concept because its preliminary plan polygon disagrees with its source area label. It remains manually selectable for comparative rendering without implying approval.

The complete proposed room-by-room options are in `architecture/stage2-finishes-schedule.json`. These suggestions are **unapproved**, and the finish engine marks them as such.

### 2. Room-local floor finish mesh generation

Porcelain/ceramic, ash and caramel wood-look samples create actual, non-colliding 3D tile instance meshes. Every tile position is checked against the room's **provisional** S1 polygon and raycasted against the existing IFC walkable floor. Rooms with no matching floor surfaces receive no fabricated floor. Colour, tile spacing, grout and roughness are proposed for visualization, not construction quantity estimation. The old three-room floor sampler remains as a hidden QA hook to avoid breaking the prior regression suite.

### 3. Source-wall paint, texture and stone accent

Wall treatments use **existing IFC wall meshes** only. A segment must have one unambiguous candidate room and must not be an approved removed partition or duplicate facade infill. A cloned render material is substituted temporarily; the mesh geometry and original material reference are saved and restored when clearing the preview.

The three treatments are painted plaster, textured plaster and a restrained stone-accent feature wall with the remaining eligible room surfaces painted. No new wall is created. For rooms without supported source wall segments, the treatment is skipped and the QA report counts zero source walls.

### 4. Flush-skirt preview and circulation protection

Skirting uses approximately **6 mm visual depth**, following Studio Anne page 8's allowance suggestion. Piece placement requires a nearby real source wall and a source floor measurement. Door approaches are excluded based on the viewer's actual door assembly positions. Skirting remains non-colliding and is automatically discarded when the preview is cleared. It does not alter real wall thickness or building tolerances.

### 5. Actual source-supported ceiling previews

The three ceiling alternatives are **flat**, **subtle beamed**, and **suspended/accent**. Rendered samples require actual IFC overhead slab raycast hits at a plausible storey height. Unsupported roof openings and the stair void are left untouched. Ceiling treatments are hidden in section/cutaway mode, visible in first-person mode, and are explicitly decorative render previews rather than structurally specified beams or dropped-ceiling installations.

### 6. Door transition finishing

Thin decorative thresholds are sampled against real floor support and only proposed near the room's polygon edge where an existing interactive door is present. Open-concept locations without actual doors do not receive fabricated doorway thresholds. Transition pieces have no collision participation.

### 7. Interaction and restoration

- Studio Anne `Finishes & Lighting` panel includes the ten-room finishes studio with all palettes/material types and independent room controls.
- Mobile viewers get a direct **Finishes** action in the header that expands the sidebar into a scrollable full-height inspector.
- `window.__AutoMindsQA.stage2SurfaceStatus()` reports actual rendered tile, wall, ceiling, skirting and threshold counts during local `?qa` browser runs.
- `stage2ApplyWholeHouse()`, `stage2ApplyOneRoom(...)` and `stage2RestoreWholeHouse()` can be tested in headless Chrome.
- The original source IFC mesh geometry, door/collider registry, roof, window openings, circulation and compound model remain intact.

## QA criteria

- [x] All ten S1 named room IDs have independently selectable and inspectable floor/wall/ceiling specifications
- [x] Three Studio Anne palette alternatives and three tile styles supported
- [x] Real floor tile geometry placed only on source walkable floor samples
- [x] Wall materials use restored source mesh material references, not invented walls
- [x] Skirting visual pieces need nearby source wall, source floor and door exclusion
- [x] Ceilings require an actual overhead IFC slab at a plausible level
- [x] Original finishes restored with no source geometry/collider mutation
- [x] QA tests for unit surface creation, live Chrome interactions and all existing door/route regressions included in CI
- [ ] Actual client material and design direction selection (pages 2–8)
- [ ] Certified S1 room polygons and complete IFC GUID ownership (Stage 1 approval gate)
- [ ] Final wall/ceiling/skirting installation detailing, construction measurements and sign-off

### Latest real-browser verification

The 2026-11-23 development-branch Chrome QA observed **423 real tile pieces, 31 source-wall material segments, 134 source-backed ceiling panels, 89 flush skirting pieces and 11 threshold strips** when the coordinated nine-room proposal was activated. It verified that the proposal could be changed room-by-room and removed again, returning all material overrides to their original IFC references. Both normal and 26-door/5-route exhaustive browser tests passed with zero JavaScript exceptions.

**Visual limitation:** Headless Chrome's software-rendered WebGL screenshot capture timed out (`Page.captureScreenshot`). The tests prove instance counts, source sampling, materials restoration and route function; they do **not** prove photorealistic visual approval. A human should inspect the live preview in real hardware, especially where provisional room edges, skirting, ceilings and source-wall assignments meet. No screenshot evidence is claimed where none was produced.

## Important limitations and review requirements

The IFC export has no `IfcSpace` room boundaries. Stage 1's ten polygons are hand-traced inspection references, not construction-certified geometry. The maid's-room sketch is approximately 8.26 m² versus the 11 m² printed plan label; it is explicitly excluded from the automatic concept. Three unconverted IFC proxy batches remain unidentified. If a source wall, slab or floor cannot be verified, the corresponding finish is **not fabricated**.

Also, the render's ceiling and skirting geometry represent visual options only; the brief does not provide dimensioned construction drawings for those treatments, and we must not claim architect approval from working switches in a web preview. The final material samples, grout specifications, ceiling plans, stone accent locations, electrical integration, level tolerances and client selection still require normal design review.

**Verdict:** Stage 2 whole-house **engineering implementation** is complete as a non-destructive, inspectable materials and finish-options system. Final design approval and definitive surface installation remain outside the scope of code-only completion.


## Superseding viewer behavior — integrated production (23 November 2026)

The original opt-in visual-comparison development workflow above remains available as a local QA tool. **The deployed visitor viewer now automatically applies the whole-house Stage 2 material schedule on initial load** through `src/phase2/production-design.js`. The nine source-supported rooms are shown with their current coordinated treatment; the unresolved maid outline retains source presentation. No public preview button is required. This does not constitute architect/client material sign-off.
