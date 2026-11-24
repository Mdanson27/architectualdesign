# Phase 11 — Bounded loading and spatial GPU residency

The 76 IFC source layers are required for collision, measurements, source audits and enhancement construction. They are grouped by IFC category/storey, not independently certified room assets. All source data remains resident; introduction remains gated on import completion. This is not full room streaming or proven total RAM reduction.

- Automatically load layers with ordered attachment and at most two outstanding loads (one when reported device memory is 4 GB or less). Reuse initial manifest and coalesce concurrent synchronization.
- Observe private merged Phase 10 geometry against the camera frustum and five-metre retention zone. Release only its GPU buffers after twenty seconds outside both zones, at most two per frame. CPU arrays remain available for automatic re-upload. Original, shared, transparent, interactive and collision assets are untouched. Disable eviction with shadow maps.
- No room visibility suppression, new user controls or architectural changes. Existing visibility and collision are authoritative.
- Unit and browser QA verify ordered loading, failure isolation, eviction/re-entry policy and architectural regressions.
- Full per-room high-detail network streaming requires independently addressable assets and reliable room mapping; carry this into Phases 13–14. Physical low-spec memory and frame-time benchmarking remains in Phase 20.

A local-only QA round trip accelerates the inactivity clock, moves a cloned camera outside the house, verifies real WebGL geometry disposal, then renders the original view again and checks geometry count, draw calls, triangles and source visibility parity. This is a controlled renderer test, not a measurement of physical device RAM or ordinary walking latency.
