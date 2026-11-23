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
