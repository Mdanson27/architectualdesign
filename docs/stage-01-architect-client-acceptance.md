# Stage 01 — Architect & Client Acceptance Sheet

**AutoMinds Spaces · Emmanuel’s Design Brief / Home architectural S1/S2**

**Status:** Awaiting architect/client review. This sheet is a record of required decisions, **not evidence that approvals have already been granted**.

## Architect review: confirm actual room boundaries

The current viewer can focus on 10 source-plan-labelled spaces through its read-only amber `INSPECT DRAFT LOCATION` outlines. Each outline is a provisional registration of the original drawing to the IFC model. **There are zero architect-certified BIM room polygons and zero certified room-to-IFC GUID assignments.**

| Room ID | Original S1 label | Draft status | Architect confirmation |
|---|---|---|---|
| G-SITTING | Sitting Room · 35 m² | Traced, candidate IFC meshes available | Pending |
| G-DINING | Dining · 19 m² | Traced, dining anchor in provisional contour | Pending |
| G-KITCHEN | Kitchen · 25 m² | Irregular plan footprint; confirm all open wall transitions | Pending |
| G-BEDROOM | Bedroom · 20 m² | Traced, bath/wardrobe adjacency to confirm | Pending |
| G-MAID | Maid · 11 m² | **Low confidence**, draft area short by about 25%; exterior-facing entry preserved | **Priority** |
| F-MASTER | Master Bedroom · 35 m² | Traced, walk-in closets and bath transitions to confirm | Pending |
| F-BEDROOM-2 | Bedroom · 17 m² | Traced, real walls and balcony access to confirm | Pending |
| F-BEDROOM-3 | Bedroom · 13 m² | Traced, real walls and balconies to confirm | Pending |
| F-FAMILY | Family Room · 19 m² | Traced and corroborated by source sofa/door clearance | Pending |
| F-READING | Reading Room · 8 m² | Traced, upper stair access to confirm | Pending |

**Additional source areas that must be checked:** ground WC/shower and store, upstairs walk-in closets and bathrooms, the number of sanitary rooms, first-floor balcony access thresholds and edge protection, staircase two flights and landing, exterior entrance walls, windows/doors classified as IFC proxies, drainage/compound details.

Architect to verify all room polygons against Home(4).pdf S1 and S2 and identify exact source IFC GUIDs before Stage 2 furnishings are treated as dimensionally final.

## Client design direction — choose before locked Stage 2 finishes

The Studio Anne PDF presents **alternatives**, not signed-off room specifications. The current app previews them but does not claim they have been selected.

| Decision | Options in Studio Anne's brief | Selected | Approval |
|---|---|---|---|
| Overall design language | Modern / Classic or Traditional | Not selected | Pending |
| Living and main interior palette | Mint / Taupe / Powder Blue; 60/30/10 concept | Not selected | Pending |
| Room-specific colours | Bedroom, kitchen, dining, bathrooms and reading space schemes | Not selected | Pending |
| Ceilings per room | Suspended/dropped / beamed / flat | Not selected | Pending |
| Flooring per room | Porcelain/ceramic / ash wood-look / caramel wood-look tiles | Not selected | Pending |
| Walls / skirting | Paint / texture / stone accents / flush skirting | Not selected | Pending |
| Kitchen cabinetry finish | To be selected from confirmed kitchen reference, respecting open plan | Not selected | Pending |
| Bathroom fittings | Brushed brass / chrome / brushed nickel; **no black faucets** | Material not selected | Pending |
| Lighting fixture design | Warm ambient, task and accent variants within brief colour-temperature guidance | Not selected | Pending |
| Outdoor materials | Approved client gate/drive/lawn preserved; finish options for pavers and landscape | Not selected | Pending |

## Already binding client architecture adjustments

The earlier original S1 plot site shows an older sliding gate and three bays by the house. The later client-approved 3D compound revision takes precedence for **gate placement and pavement/grass zoning**, while structural house plans remain from S1/S2. Specifically:

- Gate on the palm-tree-side boundary near the nearer corner.
- Straight, connected driveway from that gate to parking.
- Practical paved parking near the house without exceeding the client's agreed maximum paved share; majority lawn remains.
- Open Kitchen–Dining–Sitting plan; no unwanted wall or floating divider.
- Open Stair–Sitting and Stair–Kitchen connections where approved.
- Maid's internal access sealed while balcony-facing entry stays functional.
- Protect stair and balcony guards, exterior wall integrity and first-floor circulation.

## Source conversion blockers

Three original IFC proxy batches were not converted (`r076`, `r290`, `r294`). The source IFC is not in the public GitHub repository, and the authorized DANSON desktop was offline during the continuation audit. Inspect these with the architect's source model to identify exact element GUIDs before certifying source completeness.

## Stage 1 decision gate

Stage 1 is fully accepted only when:

1. The issuing architect reviews the traced outlines and confirms room boundaries, openings and storey elevations.
2. Exact GUID ownership is assigned or documented for source walls, slabs, doors, windows, rails, stairs and furnishings.
3. All three missing source proxy IDs are located and assessed.
4. The maid room traced-footprint discrepancy is corrected from source geometry.
5. Each bathroom, pantry/storage area, closet, balcony and passage is individually counted.
6. The client approves or explicitly leaves provisional the major room-specific design directions.
7. The final QA package confirms no regressions in the 26 active doors, five walking routes, open-plan connections and approved compound.
8. A named source/decision approver records acceptance of the revised room register.

**Until these conditions are met, Stage 1's engineering audit may be deployed, but Stage 1 is NOT architecturally or contractually closed.**

**Review reference:** [S1/S2 audit report](stage-01-s1-s2-crosswalk-review.md).
