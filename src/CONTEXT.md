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
