# Loop 1 — Plan — painter-mvp-1

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

## Plan
branch: loop/painter-mvp-1  base: loop/dsl-v2-ts-twin tip aad8dac
Normative refs cited per-row (separate repo, NOT in Carry context): spec `code/isoroll-content/design/PAINTER-UX.md`; reference impl `code/isoroll-content/design/feel-rig/rig.frag`.
Order: T1,T2 → T3,T4,T5 → T6. T3/T4/T5 depend on T1 (model) + T2 (gestures).

| id | task | files | done-when | tier | effort |
|----|------|-------|-----------|------|--------|
| T1 | Painter edit model + per-stroke undo. REUSE the DSL v2 Layout twin (`src/assemble/layout-dsl-v2*`, `layout-groups`, `layout-serialize`) as the store; CORE kinds only — `#` walls (brush height → voxel column), floor (fh 0–2ft), `D`/`W` openings (per-tool height); voxel semantics per PAINTER-UX rounds 16-17 (one element/voxel; opening = D/W voxels substituted into wall column). NO stair/roof/sloped-group/opacity-window (MVP-2). | `src/painter/model.ts`, `src/painter/types.ts` | pure module (no Foundry/PIXI import) mutates a multi-level Layout via wall/floor/opening/erase ops + slice/level state; per-stroke snapshot undo; serializes to a Layout that `massing`/`planScene` accept unchanged | medium | medium |
| T2 | Cell hit-test + gesture geometry, ported from `rig.frag`. screen→cell via inverse dimetric projection (reuse `util.screenPointToCanvas` + `transform/` params); wall line-drag → dominant-axis cell run; floor/erase rect-drag → cell rectangle; opening click → nearest wall-face side (horizontal wins ties). | `src/painter/gestures.ts` | pure, unit-testable; no camera/pan calls; matches rig.frag drag/side semantics | medium | medium |
| T3 | Painter PIXI overlay layer: register a PAINTER layer key in LayerManager z-order; draw full-board faint diamond grid at the current slice (editable extent, C1); render drag ghost preview, clear on commit. | `src/painter/layer.ts`, `src/render/layer-manager.ts` | paint-mode overlay draws extent grid + ghost; reuses IsoSpriteLayer/transform projection patterns; ZERO calls to pan/animatePan/camera — Foundry canvas nav untouched (C4) | high | medium |
| T4 | Tool rail HUD (DOM) + input redundancy: rail buttons (wall/floor/door/window/erase), per-tool brush-height stepper, slice HUD stepper; keys 1-4/X, PgUp/PgDn slice, Shift+wheel slice, Ctrl+Z undo; RMB erase. Tool state drives model (T1) + gestures (T2). | `src/painter/rail.ts`, `styles/isoroll.scss` | every C2/C5 action reachable via rail click AND keyboard AND (erase) RMB; rail styled, non-overlapping with play HUD | medium | medium |
| T5 | Live re-assembly on stroke commit: run `massing`/`planScene` on the model → create/update/delete floor iso-tiles (MERGED massing strips, not per-cell) + wall WallDefs in the live scene with NO reload (C3/C6); painted walls block movement+vision (fog correct per stack); per-re-assembly slice counter warns above a single documented threshold constant; l-room ≈ 6 floor tiles / 24 slices. WallDefs via `walls/wall-crud.generateBaseWallDefs`+`createWallsFromDefs` (or `import/import-walls.manifestWallsToDefs`); floor tiles via `import/import-tiles.manifestTileToData`. FENCE: `src/spike-floor` (floor-fog-spike dirt) is REFERENCE ONLY — never import or commit it; the committed floor-tile builder is a new painter/assemble seam (Loop 3 designs). No camera moves. | `src/painter/reassemble.ts` | commit updates tiles+walls live, no page reload; token vision blocked by painted walls; slice count logged, warns > threshold; l-room counts hit baseline | high | high |
| T6 | Painter mode toggle + wiring: togglable paint mode on an isoroll-enabled scene (enter → extent+rail shown; leave → normal play restored, C1); register painter in `core/module.ts` init like other subsystems; add the assemble facade painter seam (dsl-v2-ts-twin T8 leftover re-exports) WITHOUT touching spike-floor dirt (add a new painter-facing seam if it would conflict — BRANCH NOTE). | `src/painter/index.ts`, `src/core/module.ts`, `src/assemble/index.ts` | paint mode toggles on/off cleanly; module builds; `verify:fast` green | medium | medium |

## Plan Review (adversarial, assume small executors)
- R1 model drift: a medium executor could invent a fresh voxel store instead of the DSL v2 Layout twin, breaking the massing/planScene contract → FIX: T1 pins the store to `assemble/layout-dsl-v2*` and requires serialize-to-Layout that the assembler accepts unchanged.
- R2 floor-tile builder only exists in throwaway `src/spike-floor` (fenced) → executor could import the fence or re-derive ad hoc → FIX: T5 fence note + committed builder is a new seam Loop 3 designs; spike is reference-only.
- R3 perf-gate threshold undefined → guess-prone magic literal → FIX: T5 done-when pins baseline (l-room ≈6 tiles/24 slices) and mandates ONE documented threshold constant; Loop 3 fixes the exact value.
- R4 camera is a NO-tolerance criterion spread over T3+T5 → stray `animatePan` risk → FIX: both rows carry the explicit ZERO-camera clause; Loop 5 e2e asserts camera position stable across edits.
- R5 normative spec (PAINTER-UX.md + rig.frag) sits in a SEPARATE repo, absent from Carry `context:` (frozen from Loop 2) → a one-file loop executor can't reach it → FIX: every semantics-bearing row cites the two absolute ref paths inline so the row is self-contained.
- R6 undo must revert BOTH model and live Foundry docs → FIX: T1 owns the model snapshot; T5 re-assembly is a pure function of model state, so undo = pop snapshot then re-assemble (T5 depends on T1's snapshot API — recorded in Order).
- R7 scope creep: the 19-round grammar includes groups/roofs/opacity → executor could build MVP-2 → FIX: intent + T1/T5 rows state CORE-only; MVP-2 explicitly out of scope.
- Sizing note: T5 is the heaviest (high/high). If Loop 3 finds the reassembly+floor-seam needs decomposition beyond one row, it should `RETURN loop=1 reason=split-needed` rather than cram. 6 rows total, under the ~10 cap.
verdict: PASS

executor: loop-high model=opus tier=high
