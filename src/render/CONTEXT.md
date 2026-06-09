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
