# src/render/
> Central PIXI layer registry for all isoroll overlay layers.

## Files

| File | Responsibility |
|------|---------------|
| `layer-manager.ts` | `LayerManager` — `ensureLayer(key)`, `bringToTop(key)`, `clearLayer(key)`, `declareOrder()`. All PIXI overlay containers (gizmos, overlays, walls) are registered here to control z-order. |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the render module — central PIXI layer registry |
| [`fog-helpers.ts`](fog-helpers.ts) | [`fog-helpers.d.ts`](fog-helpers.d.ts) | `docAlpha`, `applyDocState`, `clearSeenTiles`, `saveSessionToStorage`, `tryRestoreFromStorage` | Fog-of-war visibility helpers for IsoSpriteLayer. |
| [`iso-geometry.ts`](iso-geometry.ts) | [`iso-geometry.d.ts`](iso-geometry.d.ts) | `IsoGeometry`, `pt`, `buildVerts` | Footprint math for tiles and tokens. |
| [`iso-renderer.ts`](iso-renderer.ts) | [`iso-renderer.d.ts`](iso-renderer.d.ts) | `isoRendererSightRefresh`, `IsoRenderer`, `_defLayer`, `_paint`, `_drop` | Rendering façade — single entry point for all isoroll visuals. |
| [`iso-sprite-layer.ts`](iso-sprite-layer.ts) | [`iso-sprite-layer.d.ts`](iso-sprite-layer.d.ts) | `cloneSprite`, `syncSprite`, `IsoTokenRenderer`, `IsoSpriteLayer`, `getMesh` | Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope. |
| [`iso-tile-debug.ts`](iso-tile-debug.ts) | [`iso-tile-debug.d.ts`](iso-tile-debug.d.ts) | `drawSliceDebug`, `clearSliceDebug`, `clearAllSliceDebug`, `drawGridDebug`, `clearGridDebug` | iso-tile-debug.ts — visual debug overlay for iso tile slices |
| [`iso-tile-renderer.ts`](iso-tile-renderer.ts) | [`iso-tile-renderer.d.ts`](iso-tile-renderer.d.ts) | `debugSlices`, `debugGrid`, `tileSlices`, `DEPTH_SCALE`, `IsoTileRenderer` | IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer. |
| [`layer-manager.ts`](layer-manager.ts) | [`layer-manager.d.ts`](layer-manager.d.ts) | `destroyMapped`, `LayerManager`, `LAYER_KEYS`, `stage` | Central PIXI layer registry: creation, z-order policy, and teardown for all overlay layers. |
| [`mesh-accessor.ts`](mesh-accessor.ts) | [`mesh-accessor.d.ts`](mesh-accessor.d.ts) | `MeshAccessor` | Typed, null-safe reader of tile/token mesh geometry. |
| [`render-gate.ts`](render-gate.ts) | [`render-gate.d.ts`](render-gate.d.ts) | — | Dual role: (1) renderer registry — module.ts calls registerToken/Tile to enroll renderers; |
| [`render-lifecycle.ts`](render-lifecycle.ts) | [`render-lifecycle.d.ts`](render-lifecycle.d.ts) | `registerTokenRenderer`, `registerTileRenderer`, `onCanvasReady`, `onCanvasTeardown`, `onSceneChange` | Named lifecycle entry points for all rendering decisions. |
| [`tile-renderer.ts`](tile-renderer.ts) | [`tile-renderer.d.ts`](tile-renderer.d.ts) | — | ← add first-line comment |
| [`token-renderer.ts`](token-renderer.ts) | [`token-renderer.d.ts`](token-renderer.d.ts) | — | ← add first-line comment |
<!-- routing:end -->
