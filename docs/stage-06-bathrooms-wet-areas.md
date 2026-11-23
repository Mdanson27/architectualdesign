# AutoMinds Spaces — Stage 6 Bathrooms, Toilets & Wet Areas

## Source evidence (23 November 2026)

- Home(4).pdf S1 is authoritative for drawing intent. Enlarged ground/first plans show service/WC/shower pockets at the west side of the house, plus the first-floor bedroom WC. **The IFC has no IfcSpace or IfcSanitaryTerminal types**; sanitary room footprints and true fixture GUIDs are *not* certified.
- IFC proxy furnishing families \`FU - 011\` (narrow raised wall object) and \`FU - 012\` (lower wall-mounted object) have source meshes adjacent to provisional service pockets. They are **source-anchored fittings, not proven toilet, shower or basin IFC entities**. Several other \`FU\` proxies are located by stairs, walk-in closets and kitchen; they are excluded.
- Three converted source proxy batches failed conversion and remain an upstream model gap.

## Studio Anne requirements translated

Pages **37–40**: porcelain floors, large-format full-height wall tiles, concealed plumbing, arched/glass shower partitions in ordinary bathrooms, solid maid's-room shower separator where correctly located, brushed brass/chrome/nickel (NO black fixtures), wall-mounted faucets, under-mounted basins, integrated storage, bidet with direct floor drain, floor falls, mechanical/natural ventilation and full waterproofing. Page **11** requests moisture-rated 3000–4000K mirror light.

## Engineering implementation

The existing \`src/phase2/stage6-wet-areas.js\` is loaded automatically during scene construction before the production design contract. No preview button or activation is required.

1. Audits only \`FU - 011\` and \`FU - 012\` **IFC proxy** anchors whose dimensions, elevations, levels and locations match the S1 service zones.
2. Generates small-format-sampled, visually large-format neutral porcelain floors in supported wet-area regions **only where the actual IFC floor sampler confirms the correct datum**, near true source fittings and clear of registered doors.
3. Adds thin porcelain wall-finish segments **only on existing IFC walls** within a wet zone and away from functional door approaches. These are surface overlays, not new enclosing walls.
4. Accents the existing raised wall fixture with brushed-metal trims and a gentle 3500K light. Adds small neutral finished accessory ledges to the source lower wall-mounted fitting. It does **not** rename an unverified fixture as a sink, shower or toilet or put a second object on top of a source item.
5. Reuses the same house-light controls, day/night switch, task light layer, first-floor isolation and first-person walkthrough environment.
6. Existing IFC geometry, source collisions, windows, doors, staircase and kitchen/dining/sitting open concepts remain unchanged.

### Explicitly withheld pending physical dimensions / approvals

- Entire bathrooms cannot be marked architect-approved without survey/certified room polygons.
- No new shower glass partitions, solid maid partitions, toilets, bidets, water pump, floor drains, vents, floor slope or pipe route is invented in this stage. **They are documented construction requirements**, not digitally validated installations.
- The first-floor S1 labels 11 m² and 4 m² walk-in closets near the master suite; the legacy design reference mentions a master bathroom. This discrepancy needs a specific approved architectural clarification before adding a purported master-bath shower enclosure.
- The exact tile size, slope, joinery dimensions, privacy glass product, moisture-rating and electrical/water supply plans still require architect/client/vendor approval.

## Release checks

\`npm run test:stage6\` verifies 4 conservative source service zones, actual FU-011/FU-012 anchors, thin noncolliding wall/floor trims, 0 manufactured bathrooms, no original source mutations, visibility, safe missing-source fallback and Stage 2–6 production integration.

Browser QA must show the Stage 6 source-supported finishes on initial load and pass the independent 26-door / five-connected-route regression. Engineering readiness is distinct from final client acceptance.
