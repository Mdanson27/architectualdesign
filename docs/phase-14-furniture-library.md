# Phase 14 — reusable furniture model library

Initial authored library: 15 original procedural mesh designs, each in high and low detail, exported as separate content-addressed GLBs with metric dimensions, PBR materials, source brief page references, checksums and triangle counts. These are reference-inspired visualization concepts, not manufacturer models, surveyed dimensions or client-approved photoreal assets.

The design references are Studio Anne's Emmanuel's Design Brief: entry ottoman p.13; curved upholstery p.14; coffee table p.15; living details pp.18–19; dining p.20; pendant p.21; beds, wardrobes and study pp.22–25; kitchen cabinetry pp.26,30–32; balcony seating p.36; vanity pp.38–39.

The initial in-house pilot replaces the existing generated Stage 4 accent chair mesh parts at the same position, rotation and fitted envelope, without a duplicate chair or manual activation. Existing source IFC meshes and the original clearance gates remain untouched. Every other asset is staged in the library; room-specific placement and richer styling belong to Phases 15–19. The high and low GLBs are independently addressable for future room streaming. They do not yet automatically switch furniture LOD in the house; no GPU or RAM performance claim follows from the library alone.

Unit tests validate finite vertex buffers, dimensions and lower-detail triangle counts, PBR materials, GLB structure and content hashes; browser tests verify library publication. Actual visual review and client/architect approval remain required. Atlas packing is reserved for compatible authored non-repeating material charts, not arbitrary repeating floor/wall maps. No stock or licensed third-party model files have been downloaded.
