# AutoMinds Spaces — Stage 8 Production Exterior, Landscaping, Driveway & Parking

**Source hierarchy**: Client-approved gate/drive/parking changes (21 November 2026) > original \`Home(4).pdf\` S1 site plan and S2 elevations > Studio Anne landscaping ideas (brief pp. 42–45). The site view is a **plan-aligned visualization, not a survey**.

## Non-negotiable approved site geometry

| Element | Preserved production state |
|---|---|
| Plot | 48.5 × 25 m, approximate house registration; chamfered far corner |
| Gate | Existing 4 m sliding gate on palm-tree-side long fence near foreground corner; **not moved** |
| Driveway | Existing 4.6 m straight paved approach from gate into parking court, continuous flush right-hand edge |
| Parking | Existing broad paved court with **three marked 2.5 m-width bays** |
| Grass | More than 50% of modeled outdoor area remains lawn; no large new paving covering the lawn |
| Palms | Original three planted palms on the green strip, no duplicated trees near gate or driveway |
| House | Real source IFC windows, walls, front apron, balcony openings and all functional paths unchanged |

## Studio Anne details installed automatically in the production site

1. **Lawn and planting**: subtle low-contrast mowing bands complement the existing grass texture; small, low tropical foliage and mulched garden clusters enhance the perimeter lawn. No plant beds are placed in driveway, parking, gateway or source house footprint.
2. **Parking finish**: three recessed-look bay-end inlays and modest decorative gravel transitions on lawn edges of the existing parking court. The original driveway, parking line positions and splash apron are *not reconstructed* or relocated.
3. **Warm evening lighting**: discreet 2900 K low exterior bollards set on *lawn-side margins*, with two fixtures mounted visually to the **existing gate pillars** and three small uplights for the **existing three palms**. There are no duplicate pillars, gates or trees.
4. **Walking collisions**: bollards and vegetation clusters are registered with the outdoor first-person walker before its obstacle index is created. Paths from the approved gate through the driveway and three-bay court remain continuous, while solid decorations cannot be walked through.
5. **Already live by default**: the Stage 8 module attaches to the original \`site.root\` when the house loads. Stage 1–7 structures remain part of the same production house. User light/day/night, site visibility and outdoor walk controls continue to work. No stage preview activation is needed.

## Explicitly NOT represented as built/engineered

A textured gravel edge is *not* a verified drain or soakaway. Ambient LED effects are *not* installed power circuits, IP ratings or field-certified illumination. Plants are conceptual species silhouettes, not nursery-verified non-invasive root systems. No new shade canopy, storm pipe, stormwater outfall, grading/earthwork or real underground irrigation has been invented.

Site boundaries, falls, runoff away from buildings, non-slip material specifications, accessible pedestrian widths, vehicular swept paths and final construction drawings all require on-site review by the responsible professionals and approval from the client.

## Verification before merge

\`npm run test:stage8\` validates unchanged original site geometry, three palms, same three bays, gate, driveway and majority lawn, source IFC integrity, periphery landscaping, lighting switches, source collision registration, safe vehicle-route walking and fallback access. 

The mandatory browser suite (\`npm run test:browser\`) must show Stage 8 integrated on first load; \`QA_ALL_DOORS=1 npm run test:browser\` must continue to pass **26 active doors plus five interior circulation routes**.

Engineering complete is **not** final architectural, civil, electrical, landscape or client signoff. See \`architecture/stage8-exterior-landscape.json\` for unresolved acceptance items.
