# src/
> All TypeScript source for isoroll-module. Entry point: module.ts.

## Top-level files

| File | Responsibility |
|------|---------------|
| `module.ts` | Wires all subsystems in `Hooks.once("init")` |
| `flags.ts` | `MODULE_ID = "isoroll"`, `VolumeFlags` flag accessors (boundHeight, imageOffset, imageScale, showImageManipulation, showVolumeManipulation, tileFlipped, …) |
| `settings.ts` | `registerVolumeSettings()` — DefaultTokenHeight + OcclusionOpacity module settings |
| `util.ts` | Shared math + drag: `canvasZoom`, `gridDistance`, `elevToCanvas(elev, gridSize, gridDist)`, `screenToCanvas`, `screenPointToCanvas`, `scheduleWrap`, `startPointerDrag<T>` |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`transform/`](transform/CONTEXT.md) | Coordinate math, stage/object counter-transforms, HUD patches |
| [`ui/`](ui/CONTEXT.md) | Config form tab injection (SceneConfig, TileConfig, TokenConfig) |
| [`assemble/`](assemble/CONTEXT.md) | Pure TS twin of the isoroll-content scene assembler (parse/massing/plan), no Foundry/PIXI surface |
| [`hud/`](hud/CONTEXT.md) | HUD DOM helpers and wall-button TileHUD |
| [`draw/`](draw/CONTEXT.md) | PIXI drawing utilities (constants, shapes, contour, 3D box geometry) |
| [`gizmos/`](gizmos/CONTEXT.md) | Handle factories, mesh corner helpers, image drag math |
| [`tiles/`](tiles/CONTEXT.md) | Tile volume overlay and interactive gizmos |
| [`tokens/`](tokens/CONTEXT.md) | Token volume overlay and interactive gizmos |
| [`background/`](background/CONTEXT.md) | Background image gizmos (GridConfig only) |
| [`walls/`](walls/CONTEXT.md) | Linked wall system |
| [`preset/`](preset/CONTEXT.md) | Image preset system |
| [`render/`](render/CONTEXT.md) | LayerManager — central PIXI layer registry |
| [`occluder/`](occluder/CONTEXT.md) | Tile alpha occlusion |
| [`sorter/`](sorter/CONTEXT.md) | Depth sort (dormant) |
| [`resolver/`](resolver/CONTEXT.md) | Asset stance fallback |

<!-- routing:start -->
## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`assemble/`](assemble/CONTEXT.md) | TS twin of the isoroll-content scene_assemble.py / layout_parse.py / layout_mass |
| [`background/`](background/CONTEXT.md) | Background image gizmos for GridConfig: HTML injection, PIXI handles, and drag m |
| [`core/`](core/CONTEXT.md) | — |
| [`draw/`](draw/CONTEXT.md) | PIXI drawing utilities: constants, dashed shapes, mesh contour, 3D box geometry. |
| [`gizmos/`](gizmos/CONTEXT.md) | Handle factories, mesh corner helpers, and image drag math — shared by tiles and |
| [`hud/`](hud/CONTEXT.md) | HUD patches and DOM helpers for TileHUD and TokenHUD iso-correct positioning. |
| [`import/`](import/CONTEXT.md) | Programmatic scene manifest import — validate, map, and create tiles/walls (modu |
| [`occluder/`](occluder/CONTEXT.md) | Tile alpha fade when a token moves behind it. |
| [`preset/`](preset/CONTEXT.md) | Image preset system: auto-save and auto-apply per-tile/token/background image se |
| [`render/`](render/CONTEXT.md) | Central PIXI layer registry for all isoroll overlay layers. |
| [`resolver/`](resolver/CONTEXT.md) | Asset stance fallback chain for token sprite resolution. |
| [`sorter/`](sorter/CONTEXT.md) | Depth sort for isometric z-ordering (dormant — not activated). |
| [`tiles/`](tiles/CONTEXT.md) | Tile volume overlay (3D box + contour) and interactive gizmos (resize, elevation |
| [`tokens/`](tokens/CONTEXT.md) | Token selection overlay (box, contour, handles, shadow) and always-visible indic |
| [`transform/`](transform/CONTEXT.md) | Coordinate math, stage/object counter-transforms, HUD patches — no UI, no PIXI d |
| [`ui/`](ui/CONTEXT.md) | Config form tab injection for SceneConfig, TileConfig, and TokenConfig (AppV2). |
| [`walls/`](walls/CONTEXT.md) | Linked wall system: generate, sync, door, undo, overlay, and lifecycle managemen |

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`spike-floor/index.ts`](spike-floor/index.ts) | [`spike-floor/index.d.ts`](spike-floor/index.d.ts) | `floorSpecsFor`, `backgroundSpecFor`, `syncFog` | **facade** — Spike facade — exposed on globalThis.isoroll.spike (src/core/module.ts) so the throwaway e2e |
| [`painter/gestures.ts`](painter/gestures.ts) | [`painter/gestures.d.ts`](painter/gestures.d.ts) | `cellAt`, `lineCells`, `rectCells`, `nearestWallSide` | T2 — cell hit-test + gesture geometry (3-arch.md painter-mvp-1). Pure: no PIXI, no Foundry. |
| [`painter/model.ts`](painter/model.ts) | [`painter/model.d.ts`](painter/model.d.ts) | `setChar`, `writeCell`, `cloneLevel`, `levelTemplateDims`, `blankLevel` | T1 — painter edit model (3-arch.md painter-mvp-1). Loop 4b: model.ts's only frozen contract is |
| [`painter/reassemble-perf.ts`](painter/reassemble-perf.ts) | [`painter/reassemble-perf.d.ts`](painter/reassemble-perf.d.ts) | `checkSliceBudget`, `SLICE_WARN_THRESHOLD` | T5 — slice-count perf gate (3-arch.md painter-mvp-1, C6). Pure. |
| [`painter/reassemble-plan.ts`](painter/reassemble-plan.ts) | [`painter/reassemble-plan.d.ts`](painter/reassemble-plan.d.ts) | `buildReassemblePlan`, `floorTileFromBox`, `mergeFloorStrips`, `wallEndpoint`, `wallDefFromBox` | T5 — pure re-assembly plan builder (3-arch.md painter-mvp-1, the C6 seam). Loop 4b: |
| [`painter/types.ts`](painter/types.ts) | [`painter/types.d.ts`](painter/types.d.ts) | — | T1 — pure types for the painter edit model (3-arch.md painter-mvp-1, Loop 4a seam). No logic. |
| [`spike-floor/bg-regen-proto.ts`](spike-floor/bg-regen-proto.ts) | [`spike-floor/bg-regen-proto.d.ts`](spike-floor/bg-regen-proto.d.ts) | `buildBackgroundSpec` | T2 — spike prototype (b): pure builder mapping a view to a scene-background update payload |
| [`spike-floor/floor-tiles-proto.ts`](spike-floor/floor-tiles-proto.ts) | [`spike-floor/floor-tiles-proto.d.ts`](spike-floor/floor-tiles-proto.d.ts) | `buildFloorTileSpecs`, `FLOOR_TEXTURE` | T1 — spike prototype (a): pure builder turning merged floor massing runs (NOT per-cell, NOT |
| [`spike-floor/measure.ts`](spike-floor/measure.ts) | [`spike-floor/measure.d.ts`](spike-floor/measure.d.ts) | `classifyFog`, `fogCoverage`, `countFloorTiles`, `countSlices`, `dumpFogSlices` | T3 — measurement oracle. ONE classifier (classifyFog) shared by vitest + e2e (via the |
<!-- routing:end -->
