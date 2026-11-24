# Phase 10 — Rendering and collision optimization

The existing source model and all previously implemented design stages remain authoritative. This phase changes rendering submission and collision broad-phase behavior, not the layout, furniture design, or architecture.

## Implementation

- Static opaque compatible meshes are grouped by root, source level/category, material, vertex layout and 8 m spatial sector. Repeated identical primitive buffers are instanced; other compatible buffers are merged into bounded batches.
- Original meshes remain present for source audits, collision and measurements. Render proxies are visible only during synchronous rendering. A changed transform, material, geometry or visibility falls back to the original objects. Transparent materials and functional door assemblies are excluded.
- The added geometry/instance-buffer budget is 32 MiB. This is a cap on estimated batch buffer bytes, not total RAM/GPU memory; original meshes remain resident.
- No GPU drawing occurs beneath the initial loading overlay. Original GPU buffers need not be uploaded merely because the source model is loading.
- A 2 m spatial index narrows candidates for existing floor and obstacle searches after source setup. Exact bounding-box and visibility checks, original ordering, raycasts and collision rules remain unchanged. Oversized source boxes use an overflow list.

## Verification

`npm run test:phase10` checks batching, geometry retention, dynamic fallback, transparency, visibility restoration after errors and 501 spatial queries against the original full scan.

The browser QA compares draw calls and triangle counts at the same camera with and without batching. A minimum 20% draw-call reduction is required for release. The longer-term target is fewer than 800 draw calls in representative views, not a guaranteed Phase 10 outcome. Actual RAM, frame rates and visual fidelity must be measured on physical low-spec devices in later phases.

Existing Stage 1–9 checks, six visual captures and the 26-door/five-route suite remain mandatory. Room streaming, adaptive graphics, compression and professional furniture replacement are separate subsequent phases.
