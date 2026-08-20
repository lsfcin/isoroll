# Loop 4b — Code Until Green — painter-mvp-1

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

## Code

Scope for this attempt (per spawn prompt, narrower than the full T1/T2/T5 rows above): the 4 pure/unit
stubs 4a-tests.md scoped to verify:fast — `src/painter/model.ts`, `gestures.ts`, `reassemble-perf.ts`,
`reassemble-plan.ts`. `layer.ts`, `rail.ts`, `reassemble.ts`/`reassemble-apply.ts`, `index.ts` don't exist
yet (integration-only, left for a later loop's e2e work per 4a-tests.md's own scope note) — not touched.

Before writing code, read the reference (read-only, never imported) `src/spike-floor/floor-tiles-proto.ts`
+ its test, since PIN D3 explicitly models `mergeFloorStrips` after it: confirmed the v14-tile-CENTER
x/y formula (`x = u0*gs + l*gs/2`, `y = v0*gs + d*gs/2`) and the `rotateCw(layout, VIEW_TURNS[view])`
pre-massing convention, then wrote an independent implementation (not copy-pasted) in reassemble-plan.ts.

attempt 1: implemented all 4 stubs in one pass against the frozen `test/unit/painter-*.test.ts` contracts
(read `model.d.ts`/`gestures.d.ts`/`reassemble-perf.d.ts`/`reassemble-plan.d.ts` first per the repo's
interface-first read gate, then the `.ts` sources, then `../assemble/{types,massing,layout-parse}.ts`,
`../walls/wall-crud.ts` (WallDef shape reference), `../core/{canvas-env,util}.ts`, and the strict shared
ESLint ruleset `../eslint.shared.js` — R1-R6: single-return, one-call-per-statement, max-chain-depth 2,
max-lines-per-function 40 — before writing, to avoid a lint-driven second pass) → `npm run verify:fast`:
0 lint errors (46 pre-existing warnings, unchanged), 127/127 tests green on the first run. No red attempts.

green: yes run: `Test Files  21 passed (21) | Tests  127 passed (127)` (lint: `✖ 46 problems (0 errors, 46 warnings)`)
touched: src/painter/model.ts, src/painter/gestures.ts, src/painter/reassemble-perf.ts, src/painter/reassemble-plan.ts

## Deviations / Design Notes (unpinned territory per 3-arch.md — none contradict a frozen test)
- **model.ts**: Level `side`/`type`/`wmat`/`fh` attr maps intentionally NOT populated (PIN D1 says this
  encoding is unfrozen; massing() never reads them, only `Level.g` — confirmed by reading massing.ts).
  Added a defensive `this.layout.levels ??= {}`-equivalent guard in the constructor (not exercised by
  tests, which always pass a `levels`-bearing Layout, but matches `Layout.levels?`'s optionality).
- **reassemble-plan.ts `buildReassemblePlan`**: `view` param is used (VIEW_TURNS lookup mirroring
  `assemble.ts`'s private table) but `rotateCw` is only invoked when `turns !== 0`. Reason: `rotateCw`
  (`../assemble/layout-parse.ts`, out of this loop's scope) returns a Layout with only `grid` copied —
  it silently drops `levels`/`groups` even at 0 turns. Skipping the identity-rotation call keeps the
  tested SW path on the correct `massingLeveled` code path (multi-level-safe); non-SW views inherit
  the same pre-existing `rotateCw` limitation the rest of the codebase already has (not this loop's bug
  to fix — no test exercises a non-SW view; C7's only e2e scenario is l-room at SW).
- **`wallBoxesToDefs`**: ax/ay/bx/by computed as raw `cellIndex * gs` canvas coordinates (not iso-projected
  and not tile-relative-anchor-normalized) — 3-arch.md explicitly non-pins this ("belongs to
  reassemble-apply.ts's e2e territory"); tests only assert `typeof === "number"` + shape + count, both hold.
- **`mergeFloorStrips`**: floor `Box`es from `massing()` are already merged per contiguous row-run (see
  `floorBoxes()` in `../assemble/massing.ts`), so for the l-room these already equal the 6 pinned tiles —
  no additional cross-row merge was implemented (would UNDER-count vs the pinned 6 if added). Tile
  x/y use v14-tile-CENTER convention (`u0*gs + width/2`, `v0*gs + height/2`), matching the spike reference.
  `texture.src` is a placeholder path (`modules/isoroll/assets/kit/floor.webp`, not tested) — real kit
  wiring is reassemble-apply.ts's job (integration-only, not in this loop).

## Deviation from task's stated per-file split
None — all 4 named files (model.ts, gestures.ts, reassemble-perf.ts, reassemble-plan.ts) implemented;
no other src/painter/*.ts files exist yet to implement (layer/rail/reassemble/reassemble-apply/index are
future-loop scope per 4a-tests.md).

verdict: PASS

executor: loop-medium model=sonnet tier=medium
