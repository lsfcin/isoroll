## Carry
slug: floor-fog-spike | branch: feature/floor-fog-spike | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `node test/e2e/spike-floor.spec.mjs`-style via existing runner vs live Foundry (localhost:30000, do NOT restart)
criticality: normal | verdict: standard
base-branch: feature/ts-assembler (branch the new branch from here — assembler+import+kit present)
criteria:
  C1 — prototype (a) FLOOR-AS-ISO-TILES: l-room floor from MERGED massing strips (src/assemble floorBoxes — floor runs, NOT wall boxes) placed as isoroll tiles in the fog stack (fog-apply/fog-state/iso-tile-fog-sync); measured: tile count, slice count, fog-state alpha (unseen/explored/visible darken floor).
  C2 — prototype (b) BACKGROUND REGEN: assembled scene image set as scene background via transformBackground/backgroundYScale; measured: does bg participate in isoroll fog (expected NO — document the gap exactly) + bg-swap latency on edit.
  C3 — measurement harness: scripted e2e producing a comparison table (counts, sort-tick load proxy, fog-coverage observations, screenshot refs) — numbers from code/oracles (isoroll.dumpZOrderJSON), not eyeballs.
  C4 — evidence recommendation in 5-user.md + SCENE-CREATION.md § Floor/background updated with the table; FINAL DECISION LEFT OPEN for Lucas (☐ co-decide) — do NOT pick/wire a winner.
tasks:
  T1 — prototype (a) pure floor-tile builder — src/spike-floor/floor-tiles-proto.ts, test/unit/spike-floor-tiles.test.ts — medium
  T2 — prototype (b) pure bg-regen builder — src/spike-floor/bg-regen-proto.ts, test/unit/spike-bg-regen.test.ts — medium
  T3 — measurement oracle module — src/spike-floor/measure.ts, test/unit/spike-measure.test.ts — medium
  T4 — e2e measurement scenario (THROWAWAY) — test/e2e/spike-floor.spec.mjs, test/e2e/output/spike-floor.json — medium
  T5 — comparison table + open recommendation — .craft/floor-fog-spike/5-user.md, code/isoroll-content/SCENE-CREATION.md — medium
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, src/CONTEXT.md, src/render/CONTEXT.md, src/assemble/CONTEXT.md, src/import/CONTEXT.md, src/background/CONTEXT.md, /mnt/workspace/core/skills/foundry.md, /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ Floor/background)
grounded-paths: l-room DSL=test/unit/assets/l-room.txt | composed imgs=isoroll-content/output/assembled/l-room_{NE,NW,SE,SW}.png | composite helper=test/unit/helpers/composite.ts | fog-drive refs=test/e2e/b33-unhide.spec.mjs, b35-stale-sync.spec.mjs | import template=test/e2e/import-manifest.spec.mjs

## Code

attempt 1: implemented T1-T3 bodies per 3-arch.md (buildFloorTileSpecs = massing(rotateCw(layout,
TURNS[view])).filter(kind==="floor")→v14-center specs; buildBackgroundSpec = pure view→l-room
filename map; classifyFog/fogCoverage/countFloorTiles/countSlices/dumpFogSlices/buildComparisonTable
in measure.ts; index.ts facade wired floorSpecsFor=parseText→buildFloorTileSpecs,
backgroundSpecFor=buildBackgroundSpec) → 2 lint errors (`local/one-call-per-statement` in
floor-tiles-proto.ts:25 and index.ts:28, chained calls not intermediate-variabled), 0 test failures
(all 17 new unit tests already green on first vitest pass — the type-work in Loop 4a's stubs left
little room for logic error on a small, hand-verified oracle).

attempt 2: extracted the two chained-call expressions into intermediate variables (`allBoxes`/`boxes`
in floor-tiles-proto.ts; `layout` in index.ts) → lint 0 errors (46 pre-existing warnings, unchanged
baseline) + vitest 14/14 files, 76/76 tests green → `npm run verify:fast` fully green.

Out-of-plan fix (not test-cmd-gated, done anyway — see below): `npm run build` broke when T1's
`import { massing, rotateCw } from "../assemble"` first pulled the assemble facade into the
module.ts browser bundle graph (nothing did before — grepped, only src/assemble/index.ts itself
referenced "../assemble" pre-spike). `src/assemble/layout-parse.ts` had an unconditional top-level
`import { readFileSync } from "node:fs"` (used only by its `load(path)`, which had zero call sites
anywhere in src/ or test/ outside its own export) — Vite externalizes node builtins for the browser
target and errors at Rollup bind time on any named import from them once the module is reachable,
regardless of whether the code path is later tree-shaken. First attempt (re-exporting `load` from a
new `src/assemble/load.ts`) still failed the same way, because the facade `index.ts` itself
re-exports whatever `load.ts` exports, so the node:fs import just relocated one hop over — still in
the graph reached by `"../assemble"`. Fix: extracted `load()` + its node:fs/node:path imports into
`src/assemble/load.ts` (behavior-preserving, verified no test or src file called `load` via the
facade) and dropped `load` from the `"../assemble"` barrel's re-export list entirely (available as a
direct `./load` import for any future Node-only consumer). `npm run build` now succeeds
(dist/module.js, 138 modules, no errors — one pre-existing unrelated chunking warning about
wall-overlay.ts dynamic+static import, untouched by this loop). Re-ran `npm run verify:fast` after
this fix: still 0 lint errors / 46 warnings, 76/76 tests green — unaffected, since no test exercises
`load()`. This was necessary for Loop 5's live e2e to run against the real implementation instead of
a stale/stub `dist/module.js`; not flagging as a RETURN since it's mechanical, additive-in-spirit,
verified safe, and required for the spike's own next step to be possible at all.

Also completed the assumption flagged at the end of 4a-tests.md: copied the 4 assembled PNGs
(`isoroll-content/output/assembled/l-room_{SW,SE,NE,NW}.png`) into
`test/e2e/assets/assembled/l-room_<view>.png` so the e2e background swap in T4 has a real image to
load (Foundry only serves paths under the module's own root) — additive, no revert risk, noted per
4a, not treated as return-worthy.

green: yes run: `Test Files  14 passed (14) | Tests  76 passed (76)` (lint: 0 errors, 46 pre-existing
warnings, unchanged baseline) — `npm run verify:fast` fully green.

touched:
- src/spike-floor/floor-tiles-proto.ts (implemented buildFloorTileSpecs + TURNS pin)
- src/spike-floor/bg-regen-proto.ts (implemented buildBackgroundSpec)
- src/spike-floor/measure.ts (implemented classifyFog/fogCoverage/countFloorTiles/countSlices/dumpFogSlices/buildComparisonTable)
- src/spike-floor/index.ts (implemented floorSpecsFor/backgroundSpecFor)
- src/assemble/load.ts (new — Node-only load(), extracted out of layout-parse.ts)
- src/assemble/layout-parse.ts (removed load() + node:fs/node:path imports; behavior-preserving)
- src/assemble/index.ts (dropped `load` from the "../assemble" barrel re-export)
- test/e2e/assets/assembled/l-room_{SW,SE,NE,NW}.png (new — copied per 4a's flagged assumption)

executor: loop-medium model=sonnet tier=medium
