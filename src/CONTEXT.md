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
<!-- routing:end -->
