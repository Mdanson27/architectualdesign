# AutoMinds Spaces — Production-first integrated development policy

**Effective:** 23 November 2026
**Code entrypoint:** `src/phase2/production-design.js`
**Site:** `actual-house.html`
**Source geometry:** original `public/ifc/house/*.glb`, never edited by a cosmetic stage

## Product requirement

We are developing **one finished interactive house**, not a gallery of independent stage demos. Every completed component is incorporated into the default public 3D experience when the viewer loads. No visitor should have to click an “Apply”, “Preview”, “Enable Stage”, “Compare” or “Restore” control merely to see work that has already been implemented. The user can still independently navigate, walk, open actual doors, change floor and daylight mode, or deliberately hide furniture and site detail.

The previous Stage 1, Stage 2 and Stage 3 comparison tools are engineering instruments, not required production user journeys. Keep them for **local QA only** and protect their reversibility for debugging.

## Implemented default presentation

1. Scene loads its existing 76 available converted IFC layers and completed open-plan, door, stair, window, balcony, source furniture and compound systems.
2. The 9 source-supported room finishes from the Studio Anne coordinated schedule **auto-apply** during scene setup. The tenth, Maid's Room, remains on original IFC finishes because its Stage 1 boundary is unresolved.
3. The source-counter-backed kitchen cabinetry, sink, cooktop, hood, under-cabinet light and pull-out drawers **auto-apply** to the existing Ground Kitchen. No separate “preview kitchen” step is needed.
4. The exterior gate, lawn, parking, pavers and garden context are **visible by default**, alongside the building.
5. After loading the home, the visitor sees the **actual current designed house** in orbit view, without a separate entry/preview overlay. Buttons for first-person house and exterior walking remain because they change navigation mode, not design visibility.
6. The public development studios and phase restoration/audit controls are removed from visible public navigation. They remain in the DOM and accessible in local browser QA with `?preview&qa`.
7. Light switches, floor selection, walk mode and source geometry clipping continue to work. Full roof visible in global mode; ceilings can be hidden for section mode.

## Non-negotiable architectural preservation

- Kitchen–Dining–Sitting and Stair–Sitting–Kitchen ground-floor open concept **always retained**, no false interior walls or doors restored.
- Approved maid's-room inner solid wall, exterior balcony entry, first-floor balcony guard and terrace connections preserved.
- Real IFC floors, slabs, walls, columns, upper storeys, roof, doors, windows, parking, drive and exterior remain unchanged by the interior materials system.
- The preview engine remains reversible *internally* for regression tests; this does not mean a customer must activate it.
- No unverified pantry, 13-room layouts, extra wet rooms or false services fabricated.
- Kitchen work triangle, shop-drawing measurements and cabinet fixing, plumbing/ducting/electrical schedules still need architect/site approval.

## Acceptance tests / QA

- `npm run test:production` checks the production policy, initial-scene integration, first-render and external visibility defaults, source safety and development control separation.
- `npm run test:stage2-whole` and `npm run test:stage3` continue to test engine-level reversibility.
- `npm run test:browser` must observe production Stage 2 and Stage 3 **already active before any user action**, then test the development restore/reapply workflow without interfering with live user defaults.
- `QA_ALL_DOORS=1 npm run test:browser` retains all existing source door, opening and five-plan-route checks.
- GitHub Actions must pass before `main` GitHub Pages deploys.

## Rule for future Stage 4–9 development

**Integrate first, verify second, deploy third.** Implement new architecture-supported furniture and visuals directly in the built-in scene setup and append each completed system to the production activation contract. Changes must load automatically on a normal website refresh and survive switching modes/floors. Standalone preview toggles may exist only in local QA or separate explicit comparison screens that are *not required to experience* the finished project.

**Engineering ≠ sign-off.** An interactive production house may contain proposed room finishes and unresolved site details; keep those limitations in internal design registers. Do not misrepresent conceptual visuals as certified architectural construction details or signed-off material choices.
