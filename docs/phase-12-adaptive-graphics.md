# Phase 12 — Adaptive graphics and device intelligence

Phase 11 remains authoritative for source loading and GPU residency. Phase 12 changes drawing-buffer resolution only, not CSS viewport, camera navigation, model geometry, collision, doors, lighting, or prior design stages.

- Automatic lightweight (65%), balanced (85%), and high (100%) resolution profiles relative to Stage 9's existing device DPR caps; each has a pixel-area budget of 1.5, 2.5, and 4 million respectively. Very large displays are bounded separately. At a fixed baseline DPR and before pixel caps, 65% scale draws approximately 42.25% of baseline pixels, not 42.25% of GPU work.
- Devices reporting at most 4 GB start lightweight; other or unknown devices start balanced. Actual frame intervals determine subsequent adjustment, not hardware labels alone.
- Rolling bounded windows use 75th-percentile frame intervals; two slow windows (at least 38 ms) lower quality, four fast windows (at most 20 ms) raise it, with a 4-second cooldown. Hidden/loading periods are excluded, and no user interaction is needed.
- No artificial geometry disappearance, shadow changes or unsupported mesh LOD. Real asset-level LOD needs purpose-built models during Phases 13–14. Physical FPS/RAM and visual-quality measurements remain for Phase 20.
- Unit tests exercise transitions, hysteresis, caps and hidden-tab reset. Local-only browser QA feeds controlled frame intervals into the production controller and checks actual canvas reduction/recovery and identical geometry submissions; exact Stage 9 reference-resolution screenshot checks remain enabled. This is not a hardware performance benchmark.
