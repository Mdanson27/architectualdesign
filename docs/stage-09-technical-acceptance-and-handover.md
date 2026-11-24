# AutoMinds Spaces — Stage 9 Final Technical Acceptance and Client Handover

**Repository:** [Mdanson27/architectualdesign](https://github.com/Mdanson27/architectualdesign)  
**Live viewer:** https://mdanson27.github.io/architectualdesign/actual-house.html  
**Main architecture:** Home(4).pdf S1 plan, S2 elevations; original Archicad IFC converted to 76 GLB layers  
**Interior brief:** Studio Anne, *Detailed - Emmanuel’s design brief (2).pdf*  
**Status:** Technical QA may pass; **client acceptance, architectural certification, and physical construction sign-off are not yet granted**.

## Product acceptance targets

The visitor opens one continuous 3D house containing all supported developments from Stages 1–8 by default. The original kitchen/dining/sitting/stair connections remain open; the maid’s external-only entry stays intact; all 26 working doors, two-flight source stairs, three accessible upper balconies, client-corrected gate and straight vehicle court remain.

Stage 9 is **testing, optimization and evidence**, not a new architecture model or a ninth visitor activation button.

## Stage 9 delivery

- **CI source verification**: 76 converted GLB assets exist and are nonempty; 2,575 indexed source elements; 3 known missing IFC proxy-conversion batches are reported, never hidden. The originally modelled source assets are 45 MiB (approximately), within a 75 MiB guardrail.
- **Performance precautions**: upper bound of 1.3 device pixel ratio on wider screens, 1.0 on compact viewports; pause GPU rendering in hidden tabs; stop manifest polling on public immutable deployments. These are practical optimizations, not claims of guaranteed FPS on every device.
- **Technical regression**: run all existing source checks for Stages 1–8, test the source door/roof/window/balcony geometry and outdoor walking, and ensure no source structure is fabricated to fill missing survey data.
- **Browser visual evidence**: automate 6 named Chrome screenshots covering whole house day/night, ground/first floor, and compact/mobile presentation/navigation. Store both screenshots and machine-readable report with the GitHub Actions QA artifact. These images are **evidence for human visual review**, not automatically certified aesthetic approval.
- **Performance evidence**: collect browser runtime draw calls, triangles, geometry/texture counters, canvas pixel ratio and resource request counts. They depend on the test device and are not a physical hardware or field benchmark.
- **Release gate**: the source-test suite, visual screenshot capture and full set of 26 active doors and 5 circulation routes must succeed before the merged commit is published via GitHub Pages.

## Visual inspection sign-off

Open the screenshots in the workflow artifact **autominds-architectural-qa**. Inspect every scene against the architectural plans, elevations and Studio Anne design brief. Record each reviewer, date and any corrections in \`architecture/stage9-final-acceptance.json\`. Critical views: staircase glass ends at the first landing, open ground connections, complete family balcony wraparound, 6 dining chairs, kitchen source worktops, bedroom doors and furnishings, WC tile finishes, roof and night lighting. The three source plan-driven bathrooms/maid boundaries still require accurate as-built source dimensions.

## Outstanding approvals before claiming final perfection

| Acceptance category | Current disposition | Who must sign |
|---|---|---|
| Automated technical release QA | Required to merge; machine-generated evidence | AutoMinds engineering |
| Room polygon and IFC element crosswalk | Not certified, 10 principal room outlines | Architect |
| Three missing IFC proxy-batch conversions | Source gap unresolved | Architect / BIM engineer |
| Maid's room and master WIC/bath discrepancies | Plan conflicts unresolved | Architect + client |
| Furniture, materials and photorealistic visuals | Proposed; browser captures require review | Client + interior designer |
| Bathrooms, plumbing, drainage and ventilation | Visual concepts; no services certified | Architect + MEP |
| Stair/balcony safety, exterior civil works | Not signed off | Structural / civil / electrical specialists |
| Final written acceptance | **Pending; not inferred from a successful deployment** | Client |

**No signatures, review results or approvals have been invented.** When the client and architect approve, record reviewer identity, written approval date and references to actual correspondence. Do not set \`clientAcceptance.status\` to accepted without evidence.

## How to run

From the repository root:

\`\`\`bash
npm ci
npm run test:stage9
GITHUB_PAGES=true VITE_PUBLIC_PREVIEW=true npm run build
npm run test:browser
QA_ALL_DOORS=1 npm run test:browser
\`\`\`

The GitHub Pages workflow automatically executes the full set and publishes only a successful main-branch build. This is an **engineering handover**, not a construction permit or client-completed approval certificate.
