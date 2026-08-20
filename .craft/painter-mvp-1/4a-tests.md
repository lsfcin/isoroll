# Loop 4a — Tests First — painter-mvp-1

## Carry
slug: painter-mvp-1 | branch: loop/painter-mvp-1 (base = loop/dsl-v2-ts-twin tip aad8dac) | root: code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (live Foundry at localhost:30000 — Loop 5 MAY start the server per SETUP.md if down; world isoroll-test)
criticality: normal | verdict: standard
criteria:
  C1 painter mode — togglable canvas layer on an isoroll-enabled scene; entering paint mode shows the editable extent (full-board faint diamond grid) and a tool rail; leaving restores normal play
  C2 core tools at the editing slice — wall (line drag, brush height writes column of voxels), floor (rect drag, fh 0–2ft), door/window (click wall voxel, nearest-side pick, per-tool height), erase (rect, slice-scoped), undo per stroke, slice control (PgUp/Dn + Shift+wheel + HUD stepper); ghost preview on drag, commit on release
  C3 live re-assembly — stroke commit reruns the TS massing/assembler and updates placed tiles + WallDefs in the live scene WITHOUT reload; walls block movement/vision (fog correct per isoroll stack)
  C4 camera rules — painter reuses Foundry pan/zoom untouched; ZERO camera moves on any edit operation
  C5 input redundancy — every action reachable by (a) tool-rail click, (b) keyboard (1-4, X, PgUp/Dn, Ctrl+Z), (c) mouse gesture where natural (RMB erase)
  C6 floor = iso-tiles with PERF GATE — floors emitted as merged massing strips, not per-cell; l-room baseline 6 tiles/24 slices; gate counts slices per re-assembly and logs a warning above threshold
  C7 verify:fast green; e2e scenario: scripted paint of the l-room in live Foundry → wall count matches layout, vision blocked, dumpZOrderJSON stable, no page reload
tasks:
  T1 — painter edit model + per-stroke undo — src/painter/model.ts,types.ts — medium
  T2 — cell hit-test + gesture geometry — src/painter/gestures.ts — medium
  T3 — painter PIXI layer: extent grid + slice plane + ghost — src/painter/layer.ts,render/layer-manager.ts — high
  T4 — tool rail HUD + input redundancy — src/painter/rail.ts,styles/isoroll.scss — medium
  T5 — live re-assembly on commit + floor iso-tiles + WallDefs + perf gate — src/painter/reassemble.ts — high
  T6 — painter mode toggle + module wiring + facade seam — src/painter/index.ts,core/module.ts,assemble/index.ts — medium
context: code/CONTEXT.md, code/isoroll-module/CONTEXT.md, code/isoroll-module/SPECS.md, code/isoroll-module/src/CONTEXT.md, core/skills/foundry.md

## Tests

Scope per task framing: unit seams only (model.ts, gestures.ts, reassemble-plan.ts, reassemble-perf.ts —
the four modules 3-arch.md's own seams table lists under "pure/unit (verify:fast)"). layer.ts, rail.ts,
reassemble-apply.ts, index.ts and the reassemble.ts orchestrator are integration-only by 3-arch.md's own
admission (PIXI/Foundry/DOM, or an async wrapper around an integration call) — left for Loop 5's e2e scenario.

To make the red run fail on missing behavior rather than "Cannot find module", this loop also created the
`src/painter/` module skeleton the tests import against: `types.ts` (real — pure type decls, no logic, so
"stub vs real" doesn't apply), and `model.ts` / `gestures.ts` / `reassemble-perf.ts` / `reassemble-plan.ts`
as signature-only stubs whose bodies `throw new Error("... not implemented (Loop 4b)")`. `SLICE_WARN_THRESHOLD`
(96) is a pinned constant, not logic, so it's implemented for real. Loop 4b fills in the throws; the four
test files below are the frozen contract it codes against — nothing else in this file's `src/painter/*.ts`
changes.

Three design decisions were needed where 3-arch.md's prose was terser than a real signature requires (noted
so Loop 4b doesn't re-litigate them): (1) `PainterModel` constructor takes the wrapped `Layout` directly —
`new PainterModel(layout)` — since `toLayout()`'s only contract (PIN D1) is returning what it was given/mutated
into; (2) `nearestWallSide(cell, worldPt, gs)` takes an explicit `gs` (3-arch.md's prose omitted it, but a pure
function can't otherwise know cell pixel size); (3) `buildReassemblePlan(model, view)` keeps 3-arch.md's exact
2-arg signature — grid size comes from `CanvasEnv.gridSize()` internally, which resolves to the `canvas.grid.size`
stub (100) already wired in `test/unit/setup.ts`, which is what makes this module "fully unit-testable" as
3-arch.md claims despite the CanvasEnv dependency.

One deliberate non-pin: `wallBoxesToDefs`'s `ax/ay/bx/by` anchor values are NOT asserted to specific numbers.
3-arch.md's own reassemble-apply.ts prose feeds `wallDefs` straight into `createWallsFromDefs(frameTile, …)`,
and `frameTile` is the *first created floor tile* — a fact that only exists once Foundry has actually created
documents. `buildReassemblePlan` cannot resolve that anchor purely, so pinning exact ax/ay here would freeze
an implementation detail that legitimately belongs to the e2e-only reassemble-apply.ts seam (3-arch.md agrees:
"e2e-only-verifiable by nature"). Only WallDef *shape* and *count* (one WallDef per massing() wall Box — no
merge algorithm is described anywhere for walls, unlike the explicit floor-merge) are pinned.

| test file | covers | asserts |
|-----------|--------|---------|
| test/unit/painter-model.test.ts | T1 model.ts — construction/toLayout identity, slice pointer, applyStroke grid-char per tool (wall→#, floor→., door→D, window→W, erase→' '), lazy Level creation, per-stroke undo, undo-on-empty no-op | 11 tests. Deliberately does NOT assert on Level.side/type/wmat/fh attr maps (PIN D1: encoding not frozen); only the `g` grid char (explicitly given in 3-arch.md prose) and the toLayout() round-trip are pinned here — the deeper massing()-level pin lives in painter-reassemble-plan.test.ts |
| test/unit/painter-gestures.test.ts | T2 gestures.ts — cellAt (screenPointToCanvas + floor/gs, incl. translation + boundary), lineCells (Bresenham: horizontal/vertical/diagonal/single-cell, ordered a→b), rectCells (inclusive rect, drag-direction independent, compared as sorted sets), nearestWallSide (4 edges of a cell's canvas bbox) | 14 tests, pure — no PIXI/Foundry/DOM globals touched |
| test/unit/painter-reassemble-perf.test.ts | T5 reassemble-perf.ts — SLICE_WARN_THRESHOLD pinned to 96, checkSliceBudget: l-room baseline 24→ok/no warn, boundary 96→ok/no warn, 97→not ok + console.warn containing "97"/"96", 200→not ok + warn containing "200" | 5 tests |
| test/unit/painter-reassemble-plan.test.ts | T5 reassemble-plan.ts — THE C6/PIN-D1 pin: l-room v2 fixture (test/unit/assets/dsl-v2/dsl_v2_lroom.txt) → buildReassemblePlan(model,"SW") gives floorTileData.length===6, plan.slices===24 (cross-checked two ways: literal 24 + sum of merged-tile-widths/gs), every floor tile height===gs(100) and width%gs===0, wallDefs.length equals an independently-recomputed massing() wall-box count for the same fixture (self-consistent pin, not a hardcoded magic number), and every WallDef has the ax/ay/bx/by/topOffset/bottomOffset/config shape createWallsFromDefs expects | 5 tests. Floor-tile count (6) and slice count (24) hand-verified by running massing()+parseTextV2 on the fixture directly during this loop (levels stack → floor boxes [6,6,6,2,2,2] runs, sum=24) — matches the known per-cell-equivalent already pinned for the same room shape in test/unit/spike-floor-tiles.test.ts, computed independently (not imported, PIN D3) |

red-run: 34 failed as expected (all via thrown `Error: painter/*: not implemented (Loop 4b)`, or `toThrow`
assertions catching that same thrown error — no "Cannot find module" / syntax errors anywhere) | wrong-failures: none

Full-suite check (`npm run verify:fast`): 21 test files run (17 pre-existing + 4 new), 127 tests total,
93 passed (all pre-existing, untouched) + 34 failed (all new, all expected-red as above). `eslint src --ext .ts`
passes with 0 errors (46 pre-existing warnings elsewhere, none in the new `src/painter/**` files).

verdict: PASS

executor: loop-medium model=sonnet tier=medium
