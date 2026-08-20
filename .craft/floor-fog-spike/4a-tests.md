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

## Tests

Scaffolding (mirrors the ts-assembler Loop 4a pattern): interface-only stubs created for T1-T3
(`src/spike-floor/{floor-tiles-proto,bg-regen-proto,measure}.ts`) and the facade `index.ts` —
every function is a signature-correct `throw new Error("not implemented")` body (unused stub
params prefixed `_` to satisfy the repo's `no-unused-vars` ESLint rule), types are real. One-line
architecture-required wire added to `src/core/module.ts` (`spike: spikeApi` on `registerIsorollGlobal()`,
commented THROWAWAY/revert-at-Loop-6) so the e2e can reach the facade via `globalThis.isoroll.spike`.

Oracle values for T1 (floor-tile box list) were hand-computed by walking `test/unit/assets/l-room.txt`
against the merged-run algorithm in `src/assemble/massing.ts` (floor runs: v=1,2,3 → u=1..6, l=6;
v=4,5,6 → u=1,2, l=2) — cross-checked, not guessed — before writing the test, per the "no eyeballs"
discipline C3 demands of the whole spike.

| test file | covers | asserts |
|-----------|--------|---------|
| `test/unit/spike-floor-tiles.test.ts` | C1 (seam: `floor-tiles-proto.ts`) | l-room SW → exactly 6 merged-run tiles (not 24 per-cell); exact hand-computed box list (x/y as v14 tile CENTER: e.g. `{x:400,y:150,width:600,height:100}` for the top floor run); merge-sanity assert (per-cell equivalent 24 vs merged 6); width%gs==0, height==gs, sort==0 for every box. |
| `test/unit/spike-bg-regen.test.ts` | C2 (seam: `bg-regen-proto.ts`) | each of SW/SE/NE/NW → `modules/isoroll/test/e2e/assets/assembled/l-room_<view>.png` (assumption, noted below); `transformBackground:true`; `backgroundYScale` defaults to 1 and passes a custom value through unchanged. |
| `test/unit/spike-measure.test.ts` | C3 (seam: `measure.ts`) | `classifyFog` truth table incl. the EXPLORED_TINT boundary (`visible:false`→unseen regardless of tint; `visible:true,tint:0x808080`→explored; `visible:true,tint:0xffffff`→visible); `fogCoverage` aggregates a 4-row mixed sample to `{unseen:1,explored:2,visible:1,total:4,darkenedFraction:0.75}` + empty-input all-zero case; `countFloorTiles`/`countSlices` count array lengths. |
| `test/e2e/spike-floor.spec.mjs` (THROWAWAY, self-contained, NOT in run.mjs) | C1, C2, C3 end-to-end | Builds floor tiles via `isoroll.spike.floorSpecsFor`, creates them, controls a viewer token in the long leg, `syncFog()`, asserts mixed visible/unseen via `fogCoverage(dumpFogSlices())`; moves the token to the short leg, `syncFog()` again, asserts the long leg is now `explored` (tint darkened, not just alpha); swaps the background via `backgroundSpecFor`, times the swap, diffs fog-row count before/after to prove `fogParticipation` (expected 0 — the gap, measured not eyeballed); writes `test/e2e/output/spike-floor.json` via `buildComparisonTable`. |
red-run: 17 failed as expected (3 unit files) + 1 e2e run failed as expected | wrong-failures: none

Verified (all four, this session):
- `rtk proxy npm run lint` → 0 errors (46 pre-existing warnings, unchanged from Loop 2's ground check).
- `rtk proxy npx vitest run` → 11 pre-existing files still green (59 tests, unchanged); 3 new files
  red, 17/17 new tests fail with `Error: not implemented` thrown from the stub production function
  at the exact assertion call site — none are TS/module-resolution/test-syntax errors.
- `rtk proxy npm run build` → vite build succeeds (module.js bundles cleanly with the new spike-floor
  tree and the module.ts wire).
- `node test/e2e/spike-floor.spec.mjs` run LIVE against Foundry at localhost:30000 (symlinked module,
  not restarted, per Carry): connects, logs in GM, creates+activates the `fx-spike-floor` scene,
  flips `tokenVision`/`fog.exploration` on, then fails at the very first spike call —
  `Error: not implemented at floorSpecsFor (dist/module.js:5209) at spike-floor.spec.mjs:24` —
  i.e. the real in-browser seam is reachable and red for the same reason as the unit tests, not a
  Foundry-API/typo error. No tiles/tokens were created before the throw (the call is first in the
  script), so Loop 4b's implementation is the only thing standing between this and a full run.

Assumption flagged for Loop 4b: `buildBackgroundSpec`'s file convention
(`modules/isoroll/test/e2e/assets/assembled/l-room_<view>.png`) mirrors the existing `kit/` texture
convention (Foundry only serves paths under the module's own root) — Loop 4b must copy the 4 PNGs
from `isoroll-content/output/assembled/` into `test/e2e/assets/assembled/` for the e2e background
swap to load a real image; this is new file territory, not on the plan `files` column, but additive
(no revert risk) — noted, not treated as a return-worthy gap.

executor: loop-medium model=sonnet tier=medium
