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
| [`fog-helpers.ts`](fog-helpers.ts) | — | `docAlpha`, `applyDocState`, `clearSeenTiles`, `saveSessionToStorage`, `tryRestoreFromStorage` | Fog-of-war visibility helpers for IsoSpriteLayer. |
| [`iso-sprite-layer.ts`](iso-sprite-layer.ts) | [`iso-sprite-layer.d.ts`](iso-sprite-layer.d.ts) | `cloneSprite`, `syncSprite`, `IsoTokenRenderer`, `IsoTileRenderer`, `IsoSpriteLayer` | Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope. |
| [`layer-manager.ts`](layer-manager.ts) | [`layer-manager.d.ts`](layer-manager.d.ts) | `destroyMapped`, `LayerManager`, `LAYER_KEYS`, `stage` | Central PIXI layer registry: creation, z-order policy, and teardown for all overlay layers. |
| [`render-gate.ts`](render-gate.ts) | [`render-gate.d.ts`](render-gate.d.ts) | `classifyToken`, `classifyTile` | Central hook dispatcher. Classifies each Foundry hook event into a PlaceableState, |
| [`tile-renderer.ts`](tile-renderer.ts) | [`tile-renderer.d.ts`](tile-renderer.d.ts) | — | ← add first-line comment |
| [`token-renderer.ts`](token-renderer.ts) | [`token-renderer.d.ts`](token-renderer.d.ts) | — | ← add first-line comment |
<!-- routing:end -->
