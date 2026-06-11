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
| [`index.ts`](index.ts) | — | — | **facade** — Public API for the render module — central PIXI layer registry |
| [`iso-sprite-layer.ts`](iso-sprite-layer.ts) | — | `cloneSprite`, `syncSprite`, `IsoSpriteLayer`, `docAlpha`, `applyDocState` | Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope. |
| [`layer-manager.ts`](layer-manager.ts) | [`layer-manager.d.ts`](layer-manager.d.ts) | `LayerManager`, `LAYER_KEYS`, `stage` | Central PIXI layer registry: creation, z-order policy, and teardown for all overlay layers. |
<!-- routing:end -->
