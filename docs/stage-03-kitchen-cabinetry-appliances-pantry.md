# AutoMinds Spaces — Stage 3: Kitchen, Cabinetry, Appliances & Pantry

**Engineering scope:** Non-destructive kitchen preview on the existing Stage 2 GitHub viewer. All fixture positions are **draft concepts**, not a certified cabinet shop drawing or client-approved site layout.

## Sources checked

- Original `Home(4).pdf` Sheet S1: ground-floor Kitchen 25 m² and nearby Store (store boundary unresolved). S1/S2 remain authoritative.
- Studio Anne 46-page interior brief: pp. **26–32** (concealed L-shaped appliances, double undermount sink and tap, spice storage, lazy Susan, pull-out bins, hob/hood, recessed stainless plinth, 42–48 in opposing-clearance goal, 4–9 ft work-triangle goals, moisture protection and independent task LEDs); p. **41** (full-height pantry shelving, baskets and clear circulation).
- Existing IFC/GLB code and tests: source ground-floor `SLA - 002` kitchen worktop and three removed obsolete countertop divider strips are distinct source geometries. The kitchen, dining and sitting room remain one approved open-plan circulation zone.

## Implemented (reversible visual concepts)

1. **Source-grounded mounting.** Find an existing visible `SLA - 002` ground-floor worktop with low elevation, plausible thin counter slab dimensions and centre within the provisional Kitchen sketch. If absent, add **nothing**. The source worktop is untouched.
2. **Cabinet fronts.** Install only slim, non-colliding fronts underneath supported source counters, requiring live floor evidence for each. No cabinets cross the removed Kitchen–Dining dividing line or enter the dining/stair routes. Recessed stainless plinth and trim represent the Studio Anne specification.
3. **Appliance sample.** Optional indicative double-basin sink, faucet, cooktop rings and a slim range-hood visual on the same source slab. There is no physical sink cutout, confirmed services, hole in roof/wall, certified hood height or fictitious fridge bay.
4. **Storage demonstration.** Sample non-colliding drawers move with a reversible preview toggle. Soft close, spice racks, cabinet edge sealing, moisture detailing, bin sizing and corner hardware still need vendor/client selection; do not describe this digital approximation as hardware installation.
5. **Task lighting.** Optional under-hood LED and neutral-white task emission controlled by the existing independent task-light and house-light switches. Visual only, not an electrical layout.
6. **User controls.** Preview, inspect Kitchen, open/close sample drawers, toggle cabinet/appliance/storage/LED layers and restore source kitchen. All controls work on mobile via the existing Studio Anne panel.
7. **Automated verification.** Unit tests for source-only anchoring, zero invented pantry/walls, immutable source geometry, visibility, options, restoration, clearance flags and existing historical open-plan tests.

## Not yet architect/client-certified

- Exact counter dimensions, sink orientation, all cabinet heights, ventilation duct route, electrical outlet/water points, appliance brands/volumes, work triangle, 42–48 inch opposing clearance and final matching with kitchen window.
- The design brief requests an **L-shaped kitchen**, but this preview cannot manufacture the second leg unless supported by suitable source counter geometry. Actual joinery shop drawings must be verified before finalising an L or changing the 3D fixture layout.
- **A separate pantry enclosure is not built.** S1 identifies a Store but no certified store polygon/IFC GUID set. Until that is approved, the p.41 shelving schedule remains proposed, not arbitrarily placed.
- All provisional Home S1 plan sketches remain uncertified. This stage does not claim kitchen, pantry or builder sign-off.

## Regression requirement

Never reintroduce `SW - 019` Kitchen–Dining, `SW - 023` Sitting–Dining, `SW - 017` Stair–Sitting, `SW - 014` Stair–Kitchen, the obsolete low `SLA - 002` dividers, maid's inside door, false stair glazing or blocked balcony connections. No new scene furniture is added to `state.solids`, `state.floors`, source records, or door collision registers.

**Next design gate:** source-verified counter and pantry outlines from architect, equipment/utility schedule and realistic browser-eye-height cabinet photographs. Engineering QA cannot stand in for human visual acceptance.
