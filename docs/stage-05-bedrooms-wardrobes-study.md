# AutoMinds Spaces — Stage 5: Bedrooms, Wardrobes and Study

**Development basis:** existing production deployment following Stage 4 (main \`dcb0963\`). Source plans \`Home(4).pdf\` S1/S2 and Studio Anne \`Detailed - Emmanuel’s design brief (2).pdf\` pp. 12, 22–25.

## Production-first installation

The entire installed Stage 5 is created inside the original Three.js walkthrough during scene setup. It renders automatically alongside Stages 2–4; no customer activates bedroom previews, compare buttons or demonstration models. The source bedroom beds, wall geometry, doors, guards, balconies and collision corrections are retained.

## Brief requirements

- Page 22: comfortable upholstered bed, rug large enough to visually anchor the bed, wall art, optional sitting detail where physically appropriate, and small ottoman only where real floor/door clearances allow.
- Page 23: concealed mood light behind headboard and underneath bedside cabinet/drawer; parallel full-height wardrobe visual treatment for a master walk-in **only after the closet footprint is confirmed**.
- Page 24: ceiling-height cabinetry, concealed upper/bulk storage, integrated drawers, pull-outs and shoe storage concept. Architectural closet enclosure, door swing, storage hardware and electrical points require verification before a full-height cabinet system can be certified.
- Page 25: floating-look study table with wall-side shelving and task lighting. Source-floor support and door/bed obstruction guards are mandatory.
- Page 12: neutral task lighting (3500–4000K) for study, minimal screen glare, layered ambient lighting.

## Integrated implementation

### Four architect-plan bedrooms (plus maid room withheld from speculative joinery)

The original source-derived \`FU - 010\` styled beds are already corrected to preserve narrow entrance and balcony doors. Stage 5 attaches upholstered headboard details, warm LED strips, low-profile wall art and floating bedside trays *to those beds*. It **does not clone, enlarge, move or replace the earlier corridor-tested furniture**. The connected light system follows the viewer's night/day, house-light and ambient/task/accent switches.

A proposed thin full-height wardrobe façade is placed only where an original visible source wall of the same floor has sufficient uninterrupted width/height, a floor sample confirms the supporting bedroom, and the location remains away from registered doors, existing beds and windows. This is a **visual cabinetry concept**, not a new partition or a certified physical closet depth, wardrobe fastening or concealed utility service. No new walk-in room is manufactured to satisfy the design brief.

Bedroom rugs remain low-profile and only appear within the provisional room polygon, grounded to a real source floor. The Maid's Room is deliberately left unchanged because the Stage 1 11m² polygon discrepancy is unresolved.

### Reading/Study Area

The S1 first-floor reading room receives a simple walnut floating-look desk, concealed slim drawer and open shelving only if both corners and central floor pass the source-floor classification and the location clears beds, doors, existing furniture and glazing. The study LED is integrated with the house task lights. If geometry cannot prove a safe location, the desk is withheld and reported in QA rather than forced into the house.

## Source protection

- Bedroom geometry, original bed colliders, roof/slabs/walls/rails, functional door logic and window meshes remain unchanged.
- Existing kitchen–dining–sitting open connections and family balcony access remain intact.
- Only an accepted study table participates in furniture collision; bed accessories attach within existing fitted-bed bounds; wardrobes use thin wall face overlays and do not fabricate a closet enclosure.
- All stage components start visible by default, but floor navigation and furniture visibility switches still work. Day/night, lights off/on and first-person walking are wired to Stage 5.

## Approval and acceptance

\`npm run test:stage5\` validates source preservation, attached bed details, wardrobe wall safety, reading desk fallback, lighting state, automatic production integration and safe absence when IFC evidence is missing.

\`npm run test:browser\` verifies the real browser scene, and \`QA_ALL_DOORS=1 npm run test:browser\` checks all interactive doors and five principal circulation routes.

Outstanding design gates: true architect-approved master closet polygon, exact wardrobe depth and storage hardware, bedside outlets, final bed/rug/desk fabrics and proportions, remaining maid's room geometry and visual client acceptance. **Engineering completion does not mean the 46-page brief is fully architect-approved.**
