# AutoMinds Spaces — Stage 01 Architectural Source Audit

**Status: technical inventory implemented; Stage 1 is NOT yet architecturally signed off.**

**Evidence basis:** Original IFC index and conversion manifest in the repository; previously transcribed Home S1/S2 plan labels and areas; Studio Anne's 46-page Emmanuel Design Brief. The original full Home drawings remain outside the public GitHub repository. Home(4).pdf S1/S2 was visually inspected on 22 November 2026; the ten printed room labels are confirmed, while exact IFC room polygons and GUID assignments remain pending professional verification.

## 1. Source geometry inventory

| Verified file fact | Value |
|---|---:|
| Indexed IFC source elements | 2,575 |
| Converted GLB layers | 76 |
| Elements in converted batches | 2,572 |
| Excluded conversion batches | 3 |
| Source IfcSpace entities | 0 |
| Ground floor model datum | +0.00 m |
| First floor model datum | +3.30 m |
| Roof model datum | +6.60 m |

Source IFC classes: 718 building proxies, 697 columns, 509 walls, 404 slabs, 223 furnishings, 12 railings, 8 doors and 4 windows. Many geometrical doors and windows are exported as IFC proxies, so IFC classes should NOT be mistaken for the actual architectural door/window schedules.

The three excluded source batches are ground-proxies-r076, ground-proxies-r290 and ground-proxies-r294. The current 26 active interactive door assemblies are a viewer-derived set after approved modifications, NOT an architect-issued door schedule.

**Critical source limitation:** Without IfcSpace assignments, exact room boundaries and room-to-source-GUID relationships cannot be certified automatically. Furniture anchors can suggest candidates but never prove room ownership.

## 2. Ten named spaces from the earlier Home S1 transcription

The area values below were **checked directly against the original S1 plan labels**, but they are not mesh-derived, surveyed room polygons. See [the S1/S2 crosswalk review](stage-01-s1-s2-crosswalk-review.md) for draft footprints, source evidence and outstanding architectural checks.

| ID | Floor | Label | Reported area | Studio Anne pages | Source room polygon |
|---|---|---|---:|---|---|
| G-SITTING | Ground | Sitting Room | 35 m² | 14–19,33 | Not yet verified |
| G-DINING | Ground | Dining Room | 19 m² | 20–21 | Not yet verified |
| G-KITCHEN | Ground | Kitchen | 25 m² | 26–32 | Not yet verified |
| G-BEDROOM | Ground | Bedroom | 20 m² | 22–25 | Not yet verified |
| G-MAID | Ground | Maid's Room | 11 m² | 22–23,37–40 | Not yet verified |
| F-MASTER | First | Master Bedroom | 35 m² | 22–25 | Not yet verified |
| F-BEDROOM-2 | First | Bedroom | 17 m² | 22–25 | Not yet verified |
| F-BEDROOM-3 | First | Bedroom | 13 m² | 22–25 | Not yet verified |
| F-FAMILY | First | Family Room | 19 m² | 14–19,33 | Not yet verified |
| F-READING | First | Reading Room | 8 m² | 25,36 | Not yet verified |

Named-space area totals: ground 110 m², first 92 m². **These are NOT gross floor areas**; stairs, bathrooms, utility spaces, closets, balconies and circulation areas have not been counted.

The original S1 now confirms **four main bedrooms and a maid room**, while an older client instruction mentioned **13 self-contained rooms**. The 14 legacy R01–R14 reference labels in the viewer likewise do not prove there are 14 surveyed rooms. This discrepancy requires client/architect reconciliation; no additional bedrooms or partitions may be fabricated.

### Ancillary areas awaiting floor-plan matching

- Main entrance, foyer and ground stairs, intermediate landing.
- First-floor landing and walking passage to Family and Reading Rooms.
- Walk-in closets, dressing rooms and storage cabinetry.
- Every bathroom, toilet and powder room including the maid bathroom.
- Pantry, only if its room actually exists in the architectural floor plan; Studio Anne page 41 alone cannot create one.
- First-floor balconies, terraces, guard rails, access thresholds, windows and connected doors.

## 3. Preliminary evidence anchors, NOT room coordinates

- Dining table preview near X=115.05, Z=-1.52; source is a provisional furnishing implementation.
- Kitchen task-light vicinity near X=109.36, Z=-2.18; source is lighting preview, not counter geometry.
- Repositioned first-floor family sofa near X=114.72, Z=-3.19; source is existing furniture repair, not room centroid.

The Stage 1 audit may list nearby furniture IFC GUID *candidates* for these anchors. This is not a certified wall/room boundary or a permission to add objects there.

## 4. Studio Anne choices to resolve

| Pages | Design decision | Current status |
|---|---|---|
| 2 | Modern vs Classic/Traditional | Client selection pending |
| 3–5 | Mint / Taupe / Powder Blue (60/30/10) | Optional previews only |
| 6 | Flat / beamed / dropped ceilings | Room selection pending |
| 7 | Porcelain / ash / caramel wood-look tiles | Optional previews only |
| 8 | Wall paint, texture, stone finish, skirting | Room selection pending |
| 9–12 | Ambient, task and accent fixture placement | Visual previews, electrical drawings not verified |
| 37–40 | Bathroom layouts, glass vs maid concrete shower divider | Real bathrooms must be individually located |
| 42–45 | Pavers, majority lawn, planting, drainage and lighting | Existing approved geometry to be preserved |

## 5. Do not undo existing approved architecture

Preserve the fully open ground-floor Kitchen–Dining, Sitting–Dining and Stair–Sitting connections and open Stair–Kitchen area. Keep the maid's internal entry sealed while preserving the balcony-facing access, retain all essential stair and balcony guards, and protect the entrance enclosure and working Door 27. Maintain the palm-tree-side gate, continuous straight driveway, parking with a straight kerb and majority-green compound. Do not overwrite or discard original IFC meshes, IDs or source architectural files.

## 6. Stage 1 audit deliverables and sign-off gate

**Now implemented:** direct Home S1/S2 source drawing reinspection, ten-room plan register, preliminary source-aligned polygon previews, candidate IFC GUID detection, design-decision matrix with unresolved approvals, index/level/layer/count validation, excluded conversion list, inspectable non-colliding 3D room outlines, browser and source tests. Source IFC geometry remains untouched.

**Still outstanding for full architectural completion:**

1. Have the issuing architect confirm or correct the newly drafted S1/S2 room polygons, openings and measured levels.
2. Review source GUID candidates generated from their spatial overlap against architect-confirmed polygons; confirm actual room ownership rather than accepting proximity as proof.
3. Individually verify every bathroom, pantry, closet, balcony and service-space location.
4. Compare doors and windows with the source schedules, including IFC proxies and the three excluded batches.
5. Resolve the 13-suite versus four-bedroom-and-maid discrepancy.
6. Review all 10 named spaces at eye height, overhead and through the visitor walkthrough, with clearances and circulation recorded.
7. Obtain explicit final choices for each room's style, palette, ceilings, flooring, wall finishes and fixture positions; undecided alternatives must remain previews.
8. Record client/architect approval of the room-by-room register before beginning Stage 2 final finishes.

The live sidebar control **STAGE 1 · ARCHITECTURE AUDIT** exposes the ten named spaces and the missing-verification status. In local QA, the full audit is available through window.__AutoMindsQA.stage1RoomAudit().

**Stage completion verdict:** Implementation of the audit foundation is underway, but Stage 1 remains OPEN. A passing production build cannot substitute for missing source room outlines or client design approval.
