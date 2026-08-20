# Loop 3 — Architecture — painter-mvp-1

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

## Architecture

New module `src/painter/` (facade barrel `index.ts`). Sole coupling to `assemble` is `massing(layout)` + `parseText`/`rotateCw`/`View`/`Layout`/`Box` (all already exported). Reuses `walls` (`createWallsFromDefs`, `deleteLinkedWalls`, `WallDef`), `render` (`IsoRenderer`, `LayerManager`, `IsoGeometry`, `dumpZOrderJSON`), `core` (`CanvasEnv`, `screenPointToCanvas`, `startPointerDrag`, `IsoHistory`), `import` translation (`toV14WallConfig` sense/move mapping — re-export it from `walls` OR copy the 3-line map into reassemble-apply; PIN D5).

- `types.ts` (T1) — pure. `PaintTool = "wall"|"floor"|"door"|"window"|"erase"`; `Cell={u,v}`; `Stroke={tool,cells:Cell[],slice,h,fh}`; `PaintModel` shape = editable **v2 `Layout`** (`levels: Record<number,Level>`, one Level per slice) + `undoStack: Snapshot[]`. No logic.
- `model.ts` (T1) — `class PainterModel`: `applyStroke(s:Stroke):void` (mutates the current-slice `Level.g` grid + `Level.fh`/`type` attr maps: wall→`#`/`h`, floor→`.`/`fh`, door→`D`, window→`W`, erase→` `), `undo():void` (pops per-stroke `Snapshot`), `snapshot()/restore()` (deep-copy of edited `Level`s — the undo unit), `slice/setSlice(n)`, `toLayout():Layout` (returns the v2 Layout unchanged for `massing()`). Per-stroke undo = one snapshot pushed **before** each `applyStroke`. **PIN D1:** the model's internal attr encoding is NOT frozen here — its only contract is that `toLayout()` round-trips through `massing()` to the l-room baseline (6 floor tiles / 24 slices, wall boxes present); the T5 plan-unit test (below) is the pin, not this prose.
- `gestures.ts` (T2) — pure. `cellAt(sx,sy,wt:PIXI.Matrix,gs):Cell` (uses `screenPointToCanvas` then floor-divides by gs), `lineCells(a:Cell,b:Cell):Cell[]` (Bresenham, wall drag), `rectCells(a:Cell,b:Cell):Cell[]` (floor/erase drag), `nearestWallSide(cell:Cell,worldPt):"u0"|"u1"|"v0"|"v1"` (door/window side pick). No PIXI, no Foundry — fully unit-testable.
- `layer.ts` (T3) — `PainterLayer`: `showExtent(cols,rows)` (faint diamond grid over full board via `IsoRenderer.render` shape `lines`, `space:"GRID"`, layer `PAINTER`), `showGhost(cells,tool)` (drag preview), `clearGhost()`, `hide()`. Draws only; commits nothing. Pointer wiring via `startPointerDrag`. **PIN D2:** never calls `canvas.animatePan`/`pan`/`recenter` (C4).
- `render/layer-manager.ts` (T3) — add `PAINTER: "painter"` to `LAYER_KEYS`. (Slotted into `declareOrder` by T6.)
- `rail.ts` (T4) — `PaintRail`: DOM tool rail (buttons 1-4=tools, X=erase) + slice HUD stepper; installs `keydown` listener (`1-4`,`X`,`PgUp/Dn`,`Ctrl+Z`; ignore when `isInputTarget`, reuse `walls/wall-keys` guard) + `Shift+wheel`=slice + RMB=erase. Single source of truth = `PainterMode` (index.ts); every input path calls the same `PainterMode` methods (C5). Styles appended to `styles/isoroll.scss`.
- `reassemble.ts` (T5 orchestrator/facade) — `async reassembleScene(model:PainterModel,view:View):Promise<{tiles:number;walls:number;slices:number}>`: `plan = buildReassemblePlan(model,view)` → `checkSliceBudget(plan.slices)` → `await applyReassemble(plan)`. Commit entry point (called on stroke release).
- `reassemble-plan.ts` (T5) — **pure**. `buildReassemblePlan(model,view):ReassemblePlan`: `layout=model.toLayout()`; `boxes=massing(layout)`; `floorTileData = mergeFloorStrips(boxes.filter(kind==="floor"),gs)` (**own** merged-strip builder — C6; modeled on the algorithm in `spike-floor/floor-tiles-proto`, but **must not import spike-floor**, PIN D3, spike is deleted at Loop 6); `wallDefs = wallBoxesToDefs(boxes.filter(kind==="wall"))`; `slices` from box strip count. Fully unit-testable — this is the C6 seam.
- `reassemble-apply.ts` (T5) — **async integration**. `applyReassemble(plan)`: (1) delete all painter-owned docs — query `sc.tiles`/linked walls where `flags.isoroll.painterOwned===true`, `deleteEmbeddedDocuments("Tile",…)` + `deleteLinkedWalls` (**PIN D4:** full delete+recreate every commit — idempotent, mirrors `importSceneManifest`; slice-scoping is a MODEL concern, re-assembly always rebuilds the whole scene from the full model); (2) create floor tiles via `sc.createEmbeddedDocuments("Tile", floorTileData with flags.isoroll.painterOwned=true)`; (3) `frameTile = created[0]`; `createWallsFromDefs(frameTile, wallDefs.map(d=>({…d,config:toV14WallConfig(d.config)})))` (C3 walls block movement/vision — reuses the v14 sense/move mapping). No pan (C4).
- `reassemble-perf.ts` (T5) — **pure**. `SLICE_WARN_THRESHOLD = 96` (4× l-room baseline of 24; tunable const). `checkSliceBudget(n):{ok:boolean}` — `console.warn("isoroll | painter re-assembly slices "+n+" over budget "+SLICE_WARN_THRESHOLD)` when `n>threshold`. Unit-testable (baseline 24→ok, 200→warn).
- `index.ts` (T6 facade) — `PainterMode` singleton: `enter()` (show extent+rail, install listeners), `exit()` (hide+restore normal play, remove listeners), `select(tool)`, `setSlice(n)`, `commit()` (drag-release → `reassembleScene`). Re-exports public types. `activate()` registers the toggle.
- `core/module.ts` + `core/hook-registry.ts` (T6) — import `PainterMode`; call `PainterMode.activate()` in `init`; add `LAYER_KEYS.PAINTER` to the `declareOrder` array (above `WALL_OVERLAY`); expose `painter:PainterMode` on `globalThis.isoroll` (e2e driver — mirrors `spike`). **PIN D6:** toggle UI = `getSceneControlButtons` hook adding a Tiles-layer control `isoroll-paint` → `PainterMode.enter/exit` (net-new; keyboard toggle is the redundancy). Registered in `hook-registry.ts`. `assemble/index.ts` needs NO change (`massing` already exported) — drop it from T6's touch list if unused.

**T5 split judgment (pre-flagged):** NOT split. T5's three parts decompose into 4 single-responsibility files, each <200 LOC: two pure + unit-tested (`reassemble-plan`, `reassemble-perf`), one thin orchestrator, one integration-only (`reassemble-apply`). Every wrong-guess risk is pinned (D3=own strip builder not spike; D4=full rebuild; frame-tile=created[0]; ownership flag; D2/C4=no pan; D5=v14 config reuse). The reconciliation is e2e-only-verifiable by nature, but the *algorithm* is unambiguous, and the observable contract is pinned by the `reassemble-plan` l-room unit test. Splitting would only fragment the assembler-reuse + perf-gate story with no cleaner feature seam. Decomposition-into-4-files is IN scope for T5 (arch refinement of one plan row), not a re-plan.

## Evaluation
criteria-coverage:
  C1 → index.ts `PainterMode.enter/exit` + layer.ts extent grid + rail.ts; toggle via `getSceneControlButtons` (hook-registry) + keyboard
  C2 → model.ts (per-tool applyStroke + per-stroke undo) + gestures.ts (line/rect/nearest-side) + rail.ts (slice control) + layer.ts (ghost)
  C3 → reassemble.ts/-plan/-apply; walls via createWallsFromDefs + toV14WallConfig
  C4 → reassemble-apply + layer.ts never call pan/recenter (PIN D2)
  C5 → rail.ts single-source-of-truth: click + keys(1-4,X,PgUp/Dn,Ctrl+Z) + Shift+wheel + RMB all call PainterMode
  C6 → reassemble-plan.ts `mergeFloorStrips` (merged massing strips) + reassemble-perf.ts slice gate
  C7 → pure unit tests (below) + Loop 5 live-Foundry e2e
seams:
  pure/unit (verify:fast): model.ts applyStroke+undo; gestures.ts cellAt/lineCells/rectCells/nearestWallSide; reassemble-plan.ts l-room→{6 floor tiles, wall boxes, 24 slices} (fixture test/unit/assets/l-room.txt / dsl_v2_lroom.txt); reassemble-perf.ts threshold(24→ok,200→warn)
  integration/e2e (verify:full, C7): layer.ts, rail.ts, reassemble-apply.ts, index.ts toggle — scripted paint of l-room via globalThis.isoroll.painter → assert wall count vs layout, vision blocked, `dumpZOrderJSON` stable, no reload, no camera move. These have NO unit seam by nature (PIXI/Foundry/DOM) — C7 e2e is their sole home; acceptable and inherent.
verdict: PASS

executor: loop-high model=opus tier=high
