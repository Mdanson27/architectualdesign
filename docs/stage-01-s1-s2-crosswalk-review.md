# Stage 1 — Original Home S1/S2 Drawing Reinspection and IFC Candidate Crosswalk

**Reviewed original:** `Home(4).pdf`, two architectural sheets, visually inspected at high resolution on 22 November 2026. **Not added to public GitHub** (contains client architectural drawings, location graphics and other project details).

**Current conclusion:** The room labels, plan grid, external elevations and building levels can now be checked against the original document. We also established **preliminary, inspectable world-space room contours**, but final architect-certified room polygon assignments and finish approvals are still absent. Do not label this as a completed construction survey.

## Sheet S1 — direct observations from the architectural drawing

- House ground-floor plan: **02-Ground Floor Plan, 1:100**.
- First floor: **03-First Floor Plan, 1:100**.
- Roof: **04-Roof Plan, 1:100**.
- Site: **01-Site Plan, 1:200**.
- Main horizontal architectural grid dimension: approximately **16,400 mm**; perpendicular grid dimension approximately **15,840 mm**. These are building grid dimensions, not every room's clear interior wall size.
- Ground rooms visibly labelled: 35 m² Sitting Room, 25 m² Kitchen, 19 m² Dining, 20 m² Bedroom, 11 m² Maid. Additional WC/shower areas, storage and stairs are drawn.
- First-floor rooms visibly labelled: 35 m² Master Bedroom, 17 m² and 13 m² Bedrooms, 19 m² Family Room, 8 m² Reading Room. Walk-in closets, bathroom/toilet areas, stairs, balconies and circulation are drawn.
- The original site plan depicts a three-bay parking court of nominal **2,500 mm** bay widths and **5,050 mm** bay depth, a former sliding gate and substantial landscaped lawns. This is NOT authorization to revert the later client-approved gate and driveway changes.
- The 13-suite claim is not supported by the supplied S1 bedroom labels. Until a later signed drawing is provided, the four main bedrooms and separate maid bedroom are the architectural baseline.

## Sheet S2 — direct observations

- Front and rear elevations plus both side elevations depict open protected first-floor balconies and the residence façade openings.
- Cross-section depicts the stair flights and main storey heights: ground **0.00m**, first **+3.30m**, roof datum **+6.60m**.
- Gate and boundary details are the *original* architectural proposal, which has been superseded in placement by the owner's later compound revision. Fence safety/functional intent remains a reference, but original gate position is not authoritative.
- S2 notes indicate final levels, foundation conditions and execution measurements must be checked on site. The WebGL reconstruction does not constitute a building-services or structural certification.

## Proposed room location sketches: inspection aids, NOT geometry truth

These are simplified outlines manually traced from the architectural drawing and preliminarily registered to the main IFC residence cluster at roughly X=106.13..122.63 and Z=-14.57..1.4. The purpose is to navigate the room and retrieve candidate source elements for architect inspection. They deliberately do not alter IFC geometries, claim measured wall-to-wall clearances or assign IFC GUID ownership automatically.

| Room ID | S1 area label | Draft sketched envelope area | Delta | Confidence |
|---|---:|---:|---:|---|
| G-SITTING | 35m² | 34.67m² | -0.9% | Moderate |
| G-DINING | 19m² | 18.99m² | -0.1% | Moderate |
| G-KITCHEN | 25m² | 26.31m² | +5.2% | Moderate (irregular L sketch) |
| G-BEDROOM | 20m² | 20.15m² | +0.7% | Moderate |
| G-MAID | 11m² | 8.26m² | **-24.9%** | **Low — needs professional boundary check** |
| F-MASTER | 35m² | 34.96m² | -0.1% | Moderate |
| F-BEDROOM-2 | 17m² | 17.27m² | +1.6% | Moderate |
| F-BEDROOM-3 | 13m² | 13.35m² | +2.7% | Moderate |
| F-FAMILY | 19m² | 18.80m² | -1.0% | Higher source-furnishing corroboration |
| F-READING | 8m² | 8.13m² | +1.7% | Moderate |

**Caution:** Close area agreement does **not** establish a correct wall outline. Large room outlines may match printed areas by chance; real door positions and wall thicknesses must be checked individually. The maid room sketch is specifically flagged rather than stretched to produce a misleading matching number.

### Evidence workflow

1. Open actual-house.html and **Stage 1 · Architecture Audit**.
2. Choose **INSPECT DRAFT LOCATION** for a room. The amber line shows the preliminary polygon. It is not added to collision geometry, does not alter source GLBs and disappears on closing the audit panel.
3. Review adjacent real IFC walls, windows, floor surfaces, doors and furnishing meshes. The room panel reports **candidate IFC GUID overlaps** as supporting evidence only.
4. Confirm or correct each contour against the issuing architect's exact plan geometry, including WCs, kitchen storage, maid-room balcony access, stair void and first-floor balcony thresholds.
5. Once the actual boundary is individually verified, assign its exact GUIDs and floor/door relationships with signed source evidence. Only then may a room be tagged `verified`.

## Explicit client revision precedence

The S1 original site layout is **not** the latest client requirement. Later approved revisions replace that former gate/drive arrangement with: **palm-tree-side fence gate near the nearer corner, straight driveway to the large parking area, parking no more than the agreed share of the compound, and majority green lawn**. Preserve this updated geometry and do not automatically recreate the older S1 gate or tree placement.

## IFC conversion exceptions

The source index has 2,575 elements; the converted GLB manifest carries 2,572 processed objects in 76 layers. Three failed ground proxy batches remain: `ground-proxies-r076`, `ground-proxies-r290`, `ground-proxies-r294`.

Adjacent recovered batch bounds show:

- `r076`: neighbour `r075` is close to the main building boundary (world X ~121..123, Z ~-9..-7), while neighbour `r077` is within the main building. **Potentially architectural**; do not dismiss it.
- `r290` and `r294`: neighbour batches `r285`, `r291`, `r293`, `r295` lie in a spatially separate X ~66..78 / Z ~5..18 source cluster. **Probably not part of the residence**, but their true source identities are not verified.

The original Archicad IFC must be inspected or re-exported to definitively identify these exclusions. Source adjacency is not proof of object location. Their geometry is not fabricated in the live model.

## Definition of completed Stage 1

**Engineering deliverables available now:** real PDF S1/S2 reinspection, ten-label plan register, preliminary source-aligned contours, candidate IFC GUID detection, visual room locator in the live viewer, new source/plan tests and continued door/circulation QA.

**Only remaining acceptance blockers:** room boundary and door/window/balcony GUID verification with the original architect (including the maid discrepancy), exclusion identity/recovery assessment with source IFC, and client selection of Modern/Classic style and room finishes. Until those are resolved, **Stage 1 remains open for final architectural and design sign-off**, even if all tests and deployment pass. This safeguards Stage 2 against furnishing incorrect spaces.
