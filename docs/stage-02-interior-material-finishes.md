# AutoMinds Spaces — Stage 2 Interior Finishes: first implementation

**Status:** Stage 2 development has begun. This is a non-destructive room-level flooring pilot, not the completed Stage 2 finish installation.

## Source and authority

- Source: Studio Anne, *Emmanuel's Design Brief*, page 6 (flat, beamed and suspended/dropped ceilings), page 7 (porcelain/ceramic and ash/caramel wood-look tiles), page 8 (paint, textured/stone walls and flush/recessed skirting).
- Architecture: Home(4).pdf S1/S2, current source-derived IFC model and the existing approved client corrections.
- Stage 1's candidate footprints are **provisional design aids**. These are not construction-surveyed room outlines, source IFC space objects, or independently approved client finishes.

## First deliverable: actual room-local floor surface tiles

A new room-only choice appears in the Studio Anne panel. The visitor can preview three flooring choices in the **ground-floor Dining Room**, **ground-floor Sitting Room**, or **first-floor Family Room**. They are no longer limited to the older whole-home shared-material preview.

Each tile is a real, individual Three.js instance snapped to an existing walkable source floor using the viewer's verified floor-raycast logic:

1. Use the specific room's preliminary S1-to-IFC outline as a **spatial reference**, with a conservative boundary inset; do not infer a certified room.
2. Sample the actual source IFC walkable floor under the tile and reject positions without a source floor or with incompatible elevation.
3. Render modestly sized 0.58 m tiles with visible joint spacing; sample textures represent porcelain/ceramic, ash wood-look or caramel wood-look flooring.
4. Keep the original IFC mesh, material, world transform, collision system, floor raycast and all movement/door tests unmodified.
5. Revert instantly to the original IFC floor with the "No room overlay" choice. The preview is **off by default**.
6. Hide room samples on other floors when section-level inspection is active, but allow room samples during first-person walking.
7. Display the number and estimated sample surface area only, **not** a promise of final installed quantity or a certified room measurement.

This pilot is intentionally limited to three visually inspectable main rooms. The master bedroom, maid room and wet/utility rooms require architectural boundary review before we show fitted surface pieces in them.

## Stage 2 remaining work

- Room-specific floor material schedule and precise tile bounds from signed-off polygons for all rooms.
- Reliable grout, tile direction, transitions and physical thresholds across the full house.
- Approved wall paint, textured treatment and any stone feature/cladding locations (page 8).
- Correctly placed flush skirting with allowance and verification at doors and corners (page 8).
- Ceiling choice and any architectural ceiling/cove details per room (page 6); avoid unsupported false ceilings and altered structural heights.
- Day/night appearance and photorealistic material response, tested at eye level in Chrome and on supported mobile devices.
- Reconcile conflict between 13-suite request and the four-bedroom-plus-maid source drawing before any new partition or room is built.
- Obtain client/designer approval of colours, style, floor, ceiling and wall choices; never call unselected previews final.

## Stage 1 technical handover status

Stage 1 repository-side engineering audit and 10-room preliminary crosswalk are complete, source counts/levels and S1 labels were reviewed, and all major approved navigation and envelope constraints are regression-protected.

The **formal Stage 1 architectural sign-off ledger remains open**, because source IFC contains no `IfcSpace` room assignments; the maid sketch differs materially from its S1 area label, three original proxy conversions are missing, room GUID crosswalks require architect/IFC review, and client selections are not recorded. The original Archicad IFC is not contained in the public repository; remote file access was offline during this pass.

This permits safe, reversible Stage 2 engineering work without misrepresenting architectural sign-off.

## QA

- `npm run test:stage2`: tile mesh creation in all pilot rooms and styles, polygon containment, first/ground floor datums, source-object references and reversal.
- `npm run test:browser`: source inventory and viewer panel, select/reset Stage 2 samples, existing architectural and navigation checks.
- `QA_ALL_DOORS=1 npm run test:browser`: 26 active door crossings and 5 continuous route checks.
