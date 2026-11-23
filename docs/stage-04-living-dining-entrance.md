# AutoMinds Spaces — Stage 4 Production Installation

**Architectural sources:** \`Home(4).pdf\` S1/S2, IFC reconstructed source model and provisional Stage 1 room traces. **Studio Anne:** \`Detailed - Emmanuel’s design brief (2).pdf\` pp. 10, 13–21.

**Status:** Stage 4 designed elements are directly incorporated into the existing live scene, with technical QA and design approvals separate. All materials, placements, dimensions and final furniture selections remain subject to architect/client acceptance. No additional open-plan partitions or doors are created.

## Studio Anne requirements translated into the 3D residence

### Ground Sitting Room — page 14–19
The existing IFC ground-floor sofa remains the circulation-safe corrected sofa from prior stages. Stage 4 adds a realistically proportioned low rounded stone coffee table, two rounded upholstered accent chairs arranged for conversation, a rug spanning the main seating zone, three soft cushions and a small side table. Warm lighting is linked to the same global house on/off, day/night and accent controls as the rest of the real house. The sitting-room-to-stair and sitting-room-to-dining passages retain their previously approved open nature. Existing structural columns and source sofas are not deleted or modified.

**Pending:** Architect must verify final clearances, bespoke joinery and entertainment location; no media cabinet is invented over an unverified source window/door.

### Dining Room — page 20–21
Uses the **existing real six-seat dining furniture**, not an overlapping new table. A rounded timber top, six complementary chair cushions, six refined place settings, and an anchored textile area rug present a warm sculptural dining concept. The dining pendant remains correctly centered on the existing table (not the geometric centre of the room), with its original Studio Anne 2700K arrangement. Stage 4 extends the room's warm accent light without creating another permanent pendant or unsupported ceiling hardware.

### Main Entrance — page 13
Anchored to previously corrected **Main Door 27** and source-confirmed **SW-022** enclosing cheek. Where sufficient original cheek geometry exists, bronze trim frames a compact mirror and slim floating drop-zone shelf. No entry partition or fake foyer is drawn. The requested shoe-storage seating ottoman is recorded as an open design requirement until the actual door swing and clear entry circulation are architect-certified.

### First-Floor Family Room — pages 14–19
Existing corrected Family Room sofa and coffee table remain in their source-verified room. Stage 4 provides a fitted rug and a slender decorative floor lamp when the existing source-floor and source-furniture clearance checks permit. Balcony and stair-to-family routes remain intact.

## Engineering safeguards

- **Automatically visible on first load.** Created during \`setupEnhancements()\` after core source furniture and Kitchen, before \`activateIntegratedHouseDesign()\`. A visitor never clicks an opt-in preview.
- Visual choices use the original metres and preliminary room polygons only. New ground objects are placed only where \`sampleGround\` confirms the source floor and where the proposed footprint is inside the room.
- New free-standing furniture participates in first-person collision through \`state.solids\`. Flat rugs, tableware and wall-mounted detail do not generate structural obstructions.
- Original IFC meshes, materials, transforms and source colliders remain untouched; any existing source sofa replacement retains its prior tested collision box.
- All future site/architecture changes must keep the ground stair–sitting, sitting–dining, dining–kitchen open connections and first-floor Family Room balcony access.

## Acceptance tests

\`npm run test:stage4\`: verifies six upholstered original chairs, room accents, source-floor anchors, no new partitions, entrance anchor evidence, visibility across levels and source integrity.

\`npm run test:browser\`: requires Stage 4 to already be active before a click and checks all internal room/door/floor navigation and light state.

\`QA_ALL_DOORS=1 npm run test:browser\`: source-openings and 26 active door tests plus the five connected open-plan/first-floor routes.

**Further design work:** custom media feature and concealed wiring, window/curtain review, exact final sofa selection, measured entry ottoman location, dining fixtures from chosen vendors and final visual client sign-off. Do not mark these as approved merely because the digital production prototype has a working render.
