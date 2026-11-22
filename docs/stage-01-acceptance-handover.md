# Stage 1 — Acceptance and handover checklist

This is the remaining evidence required for **full Stage 1 completion**, separate from passing the software build.

The live read-only room crosswalk and all automated geometry regression checks can pass while an architectural approval remains pending. **Do not mark a room as surveyed or signed off merely because its draft polygon visually matches the source drawing.**

## Source and client acceptance workflow

1. **Architect or authorized plan reviewer:** inspect the original S1/S2 PDF and native Archicad IFC, then approve each of the ten room outlines in source world coordinates. Reconcile the maid's 11 m² printed label with the current 8.26 m² preliminary sketch; confirm the ground-bedroom wet-room partition. Supply revised polygons and reviewer evidence for each.
2. **Architect or IFC specialist:** provide a room-by-room IFC GUID crosswalk for walls, floor slabs, doors, windows, balcony doors, guards, stairs and any structural columns. Include real source GUIDs and any disputed proxy objects. A source GUID overlapping a sketch is **only a candidate** until verified.
3. **IFC export specialist:** investigate the three missing ground proxy batches `ground-proxies-r076`, `ground-proxies-r290`, `ground-proxies-r294` from the original Archicad IFC. Recover verified missing geometry if necessary, without inventing it or modifying the original.
4. **Client:** confirm that the issued plan with four main bedrooms and one separate maid room supersedes the older request for thirteen self-contained rooms, or supply a newer signed architectural revision.
5. **Client / designer:** select Modern or Classic/Traditional, choose the primary palette and approve the floor, ceiling, wall and lighting scheme for each actual room. The existing preview switches are proposals, **not** approvals.
6. **Authorized reviewer:** inspect first-person movement, balcony/door/landing access, guards and clearances against the approved geometry. Sign and date the Stage 1 register with a traceable approval reference.

## Machine-readable acceptance ledger

File: `architecture/stage1-acceptance.json`

Every one of the ten rooms requires four independent fields:
- `polygonVerified`: room footprint and level reviewed against the issued plan.
- `guidCrosswalkVerified`: walls, openings and relevant source GUIDs confirmed.
- `openingScheduleVerified`: room door/window/balcony access matched to S1/S2.
- `finishApproved`: room-specific Studio Anne selection explicitly approved.

The twelve evidence gates also require actual source evidence and reviewer identification. The approval section cannot be marked `approved` until every gate and every room field is verified. Do **not** put personal signatures, private addresses, raw floor plan PDFs or the 500 MB IFC into this public repository. Store private sign-off records securely and reference only non-sensitive approval identifiers here.

The command `npm run test:stage1-acceptance` validates the ledger and prints its actual completion state. It deliberately passes for a correctly represented **pending** project, because blocking all site deployments until the client signs off would prevent safe work on non-architectural code. The output is the source of truth: `complete:false` means Stage 1 is still open.

**No fabricated completion:** The current implementation is a fully functional *technical review foundation*, but formal architectural and design acceptance is external to the codebase and remains pending.
