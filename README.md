# AutoMinds Spaces — Interactive 3D House

A browser-based Three.js architectural walkthrough derived from optimized IFC geometry.

**Live preview:** https://mdanson27.github.io/architectualdesign/

## Local development

Requires Node.js 22 or newer.

    npm ci
    npm run dev

Open http://127.0.0.1:5173/actual-house.html?preview

## Deployment

GitHub Actions runs npm ci, then npm run build with GITHUB_PAGES=true and VITE_PUBLIC_PREVIEW=true, uploads dist/, and deploys GitHub Pages. Push updates to main or use workflow_dispatch.

## Privacy

This public repository intentionally excludes the original 500 MB IFC/Archicad models, architectural plans, interior reference renders, analysis files, private development logs and backups. Browser-optimized .glb layers and the derived element index are public and can be retrieved by site visitors.

This is a preview, not an architect-certified representation or a completed walkthrough. Real-world door passage and stairs require further acceptance testing.

## Integrated production presentation (from November 2026)

The shipped `actual-house.html` immediately loads the designed residence, landscaped compound, Studio Anne room finishes and source-backed kitchen cabinetry/appliances. Visitors do **not** have to enable Stage 2 or Stage 3 or enter a comparison studio to see completed work. The first render is the current project, not the bare IFC house. Future stages must integrate by default through `src/phase2/production-design.js`, retaining the automated architectural, door and circulation test suite. Local QA tools remain accessible only for development. Read `docs/integrated-production-design.md` for source-approval constraints.

### Stage 4 — Living, Dining, Entrance and Family Sitting (production integrated)

Stage 4 is automatically part of the house and does not require any stage activation. The approved open living/kitchen/dining geometry and all IFC source surfaces remain unchanged. Existing six-seat dining and IFC sitting sofas gain coordinated furniture, rugs, entrance details, décor and lighting, subject to source-floor and clearance checks. See `docs/stage-04-living-dining-entrance.md` and the new `npm run test:stage4` suite. This is a digitally functional interior proposal pending design sign-off.

### Stage 5 — Bedrooms, wardrobes and first-floor study (production integrated)

Directly integrated on scene load: enhanced existing IFC-derived bedroom beds with upholstery/headboard LEDs/bedside trays, floor-supported rugs, source-wall-mounted wardrobe façade concepts and conditional first-floor reading-room desk/shelving. No second beds or fabricated closet enclosures. All original corridor, door and balcony constraints remain protected. See `docs/stage-05-bedrooms-wardrobes-study.md` and `npm run test:stage5`.

### Stage 6 — Wet-area porcelain and bathroom-source fitting refinements

Studio Anne bathroom reference pages 37–40 are translated into automatically loaded source-grounded porcelain flooring, finishing on original walls, brushed-metal trim to real FU-011/FU-012 source service fittings and neutral-white task lighting. These changes do not require a preview button. No synthetic shower/toilet plumbing or new walls are created while IFC bathroom polygons and sanitary coordinates remain unapproved. See `docs/stage-06-bathrooms-wet-areas.md`, `architecture/stage6-wet-areas.json`, and `npm run test:stage6`.

### Stage 7 — Staircases, source balconies and advanced lighting (production integrated)

The existing two-flight source stairs, middle landing, verified three balcony slabs/doors and actual S2 glazing are preserved. Reversible Stage 7 design refinements now appear automatically on initial house load: timber-look tread nosings, visible 2900K step-light details, source-limited balcony weather-treated deck tiles including the family wraparound return, balcony seating/planting and discreet 2900K under-handrail LED accents. Balcony furniture joins walk collisions; no new structural flights, guards or walls are fabricated. See `docs/stage-07-stair-balcony-lighting.md` and `npm run test:stage7-production`.
