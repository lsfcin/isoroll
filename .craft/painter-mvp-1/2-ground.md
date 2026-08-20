# Loop 2 — Ground — painter-mvp-1

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

## Ground
branch-created: loop/painter-mvp-1 base: aad8dac
paths: 4/11 ok | missing: src/painter/ (new dir; parent src/ exists; 7 new files staged for T1–T5)
test-cmd-runs: yes (92 tests passed, 0 errors)

executor: loop-low model=haiku tier=low
