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
| [`fog-apply.ts`](fog-apply.ts) | — | `docAlpha`, `applyDocState`, `getViewers`, `applyTokenFogContainer`, `applyTokenFog` | Public fog-state application: docAlpha, getViewers, applyTokenFog*, applyTileFog. |
| [`fog-helpers.ts`](fog-helpers.ts) | — | `clearSeenTiles`, `saveSessionToStorage`, `tryRestoreFromStorage`, `maybeInvalidateRestoredTiles` | Fog-of-war session storage and tile visibility helpers. Re-exports public fog API. |
| [`fog-state.ts`](fog-state.ts) | — | `isRestoreChecked`, `setRestoreChecked`, `isGM`, `testPointVisible`, `buildPerimeterPoints` | Fog system shared state, private helpers, and per-frame computation. |
| [`iso-geometry.ts`](iso-geometry.ts) | — | `IsoGeometry`, `pt`, `buildVerts` | Footprint math for tiles and tokens. |
| [`iso-renderer-paint.ts`](iso-renderer-paint.ts) | — | `paintSpec`, `_paintLines`, `_paintSprite`, `_paintText`, `_paintShape` | iso-renderer-paint.ts — PIXI paint helpers for IsoRenderer. |
| [`iso-renderer-types.ts`](iso-renderer-types.ts) | — | — | iso-renderer-types.ts — shared type declarations for the IsoRenderer façade. |
| [`iso-renderer.ts`](iso-renderer.ts) | — | `isoRendererSightRefresh`, `IsoRenderer`, `_defLayer`, `_drop`, `_applyInteraction` | Rendering façade — single entry point for all isoroll visuals. |
| [`iso-sprite-layer.ts`](iso-sprite-layer.ts) | [`iso-sprite-layer.d.ts`](iso-sprite-layer.d.ts) | `IsoSpriteLayer` | Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope. |
| [`iso-tile-debug-cells.ts`](iso-tile-debug-cells.ts) | — | `drawCellMarkers`, `_drawDot`, `_drawTriangle` | iso-tile-debug-cells.ts — per-cell slice marker rendering for debugSlices mode. |
| [`iso-tile-debug-paint.ts`](iso-tile-debug-paint.ts) | — | `makeText`, `_isV8`, `drawCutLines`, `drawCutMarkers`, `drawFrontierDots` | iso-tile-debug-paint.ts — PIXI drawing helpers for the iso tile debug overlay. |
| [`iso-tile-debug.ts`](iso-tile-debug.ts) | [`iso-tile-debug.d.ts`](iso-tile-debug.d.ts) | `drawSliceDebug`, `clearSliceDebug`, `clearAllSliceDebug`, `drawGridDebug`, `clearGridDebug` | iso-tile-debug.ts — visual debug overlay for iso tile slices |
| [`iso-tile-geom.ts`](iso-tile-geom.ts) | — | `gridMetrics`, `tileSliceCount`, `frontierCorners`, `computeSliceCuts`, `sliceCellOverlaps` | iso-tile-geom.ts — grid metric, frontier-corner, and sprite helpers for iso tile slicing. |
| [`iso-tile-renderer.ts`](iso-tile-renderer.ts) | [`iso-tile-renderer.d.ts`](iso-tile-renderer.d.ts) | `debugSlices`, `debugGrid`, `tileSlices`, `IsoTileRenderer`, `getMesh` | IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer. |
| [`iso-token-renderer.ts`](iso-token-renderer.ts) | — | `getMesh`, `cloneSprite`, `syncSprite`, `tokenClones`, `IsoTokenRenderer` | iso-token-renderer.ts — IsoTokenRenderer: depth-sorted token clone sprites for the iso layer. |
| [`layer-manager.ts`](layer-manager.ts) | [`layer-manager.d.ts`](layer-manager.d.ts) | `destroyMapped`, `LayerManager`, `LAYER_KEYS`, `stage` | Central PIXI layer registry: creation, z-order policy, and teardown for all overlay layers. |
| [`mesh-accessor.ts`](mesh-accessor.ts) | — | `MeshAccessor` | Typed, null-safe reader of tile/token mesh geometry. |
| [`render-gate.ts`](render-gate.ts) | [`render-gate.d.ts`](render-gate.d.ts) | — | Dual role: (1) renderer registry — module.ts calls registerToken/Tile to enroll renderers; |
| [`render-lifecycle-state.ts`](render-lifecycle-state.ts) | — | `classifyToken`, `classifyTile` | Shared state type and classifier helpers for render-lifecycle handlers. |
| [`render-lifecycle-tile.ts`](render-lifecycle-tile.ts) | — | `drawTile`, `refreshTile`, `flagsChangeTile`, `selectTile`, `deselectTile` | Tile-specific lifecycle handlers: draw, refresh, flags, select/deselect, destroy. |
| [`render-lifecycle-token.ts`](render-lifecycle-token.ts) | — | `drawToken`, `refreshToken`, `flagsChangeToken`, `selectToken`, `deselectToken` | Token-specific lifecycle handlers: draw, refresh, flags, select/deselect, destroy. |
| [`render-lifecycle.ts`](render-lifecycle.ts) | — | `registerTokenRenderer`, `registerTileRenderer`, `onCanvasReady`, `onCanvasTeardown`, `onSceneChange` | Named lifecycle entry points for all rendering decisions. |
| [`tile-renderer.ts`](tile-renderer.ts) | [`tile-renderer.d.ts`](tile-renderer.d.ts) | — | ← add first-line comment |
| [`token-renderer.ts`](token-renderer.ts) | [`token-renderer.d.ts`](token-renderer.d.ts) | — | ← add first-line comment |
<!-- routing:end -->
