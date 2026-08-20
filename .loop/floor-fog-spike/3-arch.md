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
  T5 — comparison table + open recommendation — .loop/floor-fog-spike/5-user.md, code/isoroll-content/SCENE-CREATION.md — medium
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, src/CONTEXT.md, src/render/CONTEXT.md, src/assemble/CONTEXT.md, src/import/CONTEXT.md, src/background/CONTEXT.md, /mnt/workspace/core/skills/foundry.md, /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ Floor/background)
grounded-paths: l-room DSL=test/unit/assets/l-room.txt | composed imgs=isoroll-content/output/assembled/l-room_{NE,NW,SE,SW}.png | composite helper=test/unit/helpers/composite.ts | fog-drive refs=test/e2e/b33-unhide.spec.mjs, b35-stale-sync.spec.mjs | import template=test/e2e/import-manifest.spec.mjs

## Architecture

**Critical seam (the intolerable-failure guard).** Fog has 3 states that differ ONLY by `tint`:
unseen=`visible:false`; explored=`visible:true, tint:EXPLORED_TINT(0x808080)`; visible=`visible:true, tint:0xffffff`
(source: `src/render/fog-apply.applyTileFog` + `fog-state.applyNonVisibleFog`). `isoroll.dumpZOrderJSON()`
carries `visible`+`alpha` but **NOT `tint`** — so it CANNOT distinguish explored from visible. Measuring fog off
that dump = silent wrong measurement. Therefore the spike ships its OWN tint-carrying oracle `dumpFogSlices()`
in measure.ts, and ONE classifier `classifyFog` is the single source used by BOTH vitest and the e2e (via the
`isoroll.spike` global) — no duplicated classify logic anywhere.

- `src/spike-floor/floor-tiles-proto.ts` (T1) — PURE. `buildFloorTileSpecs(layout: Layout, view: View, gs: number): FloorTileSpec[]`.
  Body: `massing(rotateCw(layout, TURNS[view]))` (import both from `../assemble`), keep `b.kind==="floor"` (merged runs, NOT walls),
  map each box→Foundry Tile create-data. **v14 doc x/y = tile CENTER** (per helpers.createTiles): `x=b.u0*gs + b.l*gs/2`,
  `y=b.v0*gs + b.d*gs/2`, `width=b.l*gs`, `height=b.d*gs`, `sort:0`, `"texture.src":"modules/isoroll/test/e2e/assets/kit/floor.png"`.
  `TURNS={SW:0,SE:1,NE:2,NW:3}` re-defined locally — SEMANTIC PIN: must equal assemble.ts `VIEW_TURNS` (private const there).
- `src/spike-floor/bg-regen-proto.ts` (T2) — PURE. `buildBackgroundSpec(view: View, opts?:{yScale?:number}): BgSpec`.
  Returns scene-update payload `{"background.src":"modules/isoroll/.../assembled/l-room_<view>.png", "flags.isoroll.transformBackground":true, "flags.isoroll.backgroundYScale": opts?.yScale ?? 1}`. Pure view→file map, no I/O.
- `src/spike-floor/measure.ts` (T3) — oracle. Imports `EXPLORED_TINT` from `../render/fog-state`, `tileSlices` from `../render/iso-tile-state`.
  Pure: `classifyFog(r:{visible,tint}): "unseen"|"explored"|"visible"`; `fogCoverage(rows): {unseen,explored,visible,total,darkenedFraction}`;
  `countFloorTiles(specs):number`; `countSlices(dump):number`. In-page reader: `dumpFogSlices(): {tileId,slice,visible,alpha,tint}[]`
  walks `tileSlices` (slices[0] carries fog state; syncAllTileFog broadcasts to peers). `buildComparisonTable(...)` assembles C3 rows.
- `src/spike-floor/index.ts` — facade: `floorSpecsFor(gridText,view,gs)` (= `parseText`→`buildFloorTileSpecs`, so e2e never constructs Layout in-page),
  `backgroundSpecFor(view,opts)`, `dumpFogSlices`, `fogCoverage`, `classifyFog`, `syncFog` (re-export `syncAllTileFog` from `../render/iso-tile-fog-sync`).
- `src/core/module.ts` (edit, architecture-required, ONE line) — add `spike: spikeApi` to `registerIsorollGlobal()`. Only prod-file touch
  outside spike-floor/. REVERTED at Loop 6 along with deleting src/spike-floor/ + the e2e (whole spike is throwaway; deliverable = the decision).
- `test/unit/spike-floor-tiles.test.ts` (T1) — l-room SW → 6 floor tiles (rows 1-3 run=6, rows 4-6 run=2); per-cell would be 24 (merge-sanity assert); widths==run*gs.
- `test/unit/spike-bg-regen.test.ts` (T2) — each view→correct filename; flags present; yScale passthrough.
- `test/unit/spike-measure.test.ts` (T3) — classifyFog TRUTH TABLE incl. the EXPLORED_TINT boundary (0x808080→explored, 0xffffff→visible, !visible→unseen); fogCoverage aggregates; counters.
- `test/e2e/spike-floor.spec.mjs` (T4, THROWAWAY, self-contained — imports `connect` from helpers, NOT added to run.mjs).
  Flow: read l-room.txt in Node→pass text to page; `loadFixture({tokenVision:true, fog:{exploration:true}})`;
  (a) `specs=isoroll.spike.floorSpecsFor(text,"SW",100)`→createTiles→waitSlices; create+`control()` a viewer token at region A→`isoroll.spike.syncFog()`→`fogCoverage(dumpFogSlices())` (expect some visible + some unseen); move token→syncFog→region A now explored (tint darkened);
  (b) `isoroll.spike.backgroundSpecFor("SW")`; `t0=performance.now()`; `scene.update(bgSpec)`+await redraw; latency=now-t0; then `dumpFogSlices()` contains ONLY tile slices → bg absent → fogParticipation=0 (the gap, proven, not eyeballed).
  Write `test/e2e/output/spike-floor.json`: proto(a){tileCount,sliceCount,fog:{unseen,explored,visible},darkenedFraction,shot} vs proto(b){bgSwapLatencyMs,fogParticipation:0,note}.
- T5 (Loop 5) — table lands in `.loop/.../5-user.md` + `SCENE-CREATION.md § Floor/background`; winner NOT wired (C4 open).

## Evaluation
criteria-coverage: C1→floor-tiles-proto (tile/slice counts) + measure.classifyFog/fogCoverage over dumpFogSlices (fog alpha states) + e2e (a); C2→bg-regen-proto + e2e (b) latency & fogParticipation=0; C3→measure.ts oracle + e2e spike-floor.json (numbers from dumpFogSlices, never eyeballs); C4→T5 table, decision left OPEN, no floor code shipped.
seams: C1 unit-asserts merged-run counts (6 not 24) + e2e asserts all 3 fog states observed with correct tint→state mapping; C2 e2e asserts bg has 0 rows in the tile-slice fog dump + records latency; C3 classifyFog is ONE unit-tested classifier (truth table pins the tint boundary) shared by vitest+e2e via isoroll.spike — divergence impossible; C4 SCENE-CREATION edit is additive prose.
adversarial pins (medium-executor traps closed): (1) using dumpZOrderJSON for fog → NO tint → explored≡visible → WRONG: mandated dumpFogSlices instead. (2) tile x/y as top-left not CENTER → misplaced slices: v14 CENTER pinned. (3) floor h=0 assumed unsliced: CONFIRMED IsoTileRenderer.create→syncAllTileFog slices+fogs all tiles regardless of h. (4) hardcoding EXPLORED_TINT: imported from fog-state. (5) e2e can't import .ts: spike facade on globalThis. (6) fog-drive timing nondeterminism: explicit isoroll.spike.syncFog() after each move, no hook-timing reliance. (7) bg latency env-sensitive: reported as a comparison PROXY, noted, not a pass/fail gate. (8) module.ts edit out of plan file-scope: called out as architecture-required 1-line, Loop 6 reverts.
verdict: PASS

executor: loop-high model=opus tier=high
