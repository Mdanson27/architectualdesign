# AutoMinds Spaces — Stage 7 Production: Staircases, Balconies & Advanced Lighting

**Sources:** Home(4).pdf S1 plan and S2 elevations; Studio Anne 46-page brief, pages 11–12 and 34–36.

## Architectural continuity

The original house already had **two IFC-derived stair flights with intermediate landing**, source-linked interior handrails and an upper void guard. There were **three verified, glazed, first-floor balconies**: west bedroom, wraparound family balcony and east projecting side balcony. Stage 7 extends their finishes and lighting: **it never creates replacement stairs, false landings, structural balustrades or doors**.

Only verified source furniture, balcony slabs, guards, doors and actual IFC tread GUIDs can drive refinements. Incomplete or missing source evidence skips enhancements instead of inventing geometry.

## Automatically installed production updates

1. **Stair treads.** Source-guid-linked narrow timber-look tread nosings and 2900K step LED strips follow each original riser and landing. Geometry is thinner than a visual overlay and produces no new walk collider. The existing tread, real landing, walls, handrails, glass and void guards stay unchanged.
2. **Wraparound balconies.** Low-profile weather-treated deck tile surfaces overlay only existing first-floor balcony slabs. The family balcony's east return receives narrow-format detailing, while its **interior family-room slab stays untiled**.
3. **Balcony styling.** Small weather-appropriate chair, table and planted décor arrangements are sited away from approved balcony doors. Their furniture bounding boxes participate in actual first-person walking collisions, not new architectural partitions. Balcony glazed railings are still the original S1/S2 restoration.
4. **Advanced lighting.** Slender LED accents follow verified original balcony handrail segments. Source step nosing LEDs combine with the **existing** recessed stair lights and exterior soffit spots, rather than duplicating those physical fixtures. The same day/night, house lights and accent-layer switches operate the new visual illumination.
5. **Production-first.** Every successfully source-backed Stage 7 part becomes part of the loaded house with Stages 1–6. The public visitor never enables a preview or comparison mode to see the work.

## Safety and source requirements

- Preserve existing open Kitchen–Dining–Sitting–Stair access, two stair flights, usable intermediate landing, first-floor Family Room and balcony-door access.
- Balcony glass original guards remain; LED trim is cosmetic, not a load-bearing railing.
- No new floor slabs, stairs, unsupported doorways, walls, false structural guards, outlet chases or utility routing.
- Existing roof section, floor isolation, night mode, furniture visibility and exterior walking still function.
- Balcony chair/table/planter colliders count as first-person furniture objects and must not block exits.
- Three missing IFC proxy batches and unapproved bathroom outlines remain separate source issues.

## Verification and approvals

\`npm run test:stage7-production\` checks the original 18 treads, 3 verified balcony slabs, wraparound finishes, source geometry and fixture controls, and safe missing-source fallback. The real browser must verify zero-click integration plus complete 26-door / five circulation-route checks. GitHub Pages deploys only when all gates pass.

**Pending:** Architecture must certify balustrade loads/heights and all balcony guard extents; an electrician must approve power, IP-rated strips and transformer wiring; a waterproofing/drainage specialist must approve surface detail, discharge and slope. Furniture positions and material palette remain proposed until client sign-off. Rendering a realistic finished house does not imply certification of construction.
