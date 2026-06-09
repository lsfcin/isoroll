# src/tiles/
> Tile volume overlay (3D box + contour) and interactive gizmos (resize, elevation, image handles).

## Files

| File | Responsibility |
|------|---------------|
| `tile-overlay.ts` | `VolumeOverlay` — 3D bounding box + image contour on selected tiles. Hook: `refreshTile`. Blink guard: skips redraw when `tile.hasPreview` (server update fires on original with old position while clone still alive). |
| `tile-gizmos.ts` | `VolumeGizmos` — all interactive handles: volume (width/height/boundH/elevation/scale/move) + image (imgOffset/imgScale/imgYScale/swapSide). Hook: `controlTile` + `refreshTile`. |
| `tile-drag.ts` | `DragState`, `HandleType`, `handlePositions()`, `projectDrag()`, `commitDrag()`. `commitDrag` calls `setFlag` for image handles (imgOffset/imgScale/imgYScale) and `document.update` for volume handles. `startPointerDrag` called with same `commitDrag` on both move and end — see B14 in KNOWN-BUGS.md. |

## Key Gotchas

- **`hasPreview` blink guard**: during drag-drop, Foundry fires `refreshTile` on the original tile (with old doc position) before destroying the preview clone. Guard `if (tile.hasPreview) return` in overlay/gizmo refresh to suppress this frame.
- **`imageOffset` stored as WORLD-px / gridSize**: `startImgOffX = imgOff.x * gridSize` in `beginDrag`; stored back as `imgOffX / gridSize`. The displacement is in WORLD space relative to `baseCenterWorld`.
- **`commitDrag` called on every `pointermove`**: undo stack accumulates one entry per drag frame (see B14). Fix would be: live PIXI preview on move, `commitDrag` on end only.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`tile-drag.ts`](tile-drag.ts) | — | `handlePositions`, `projectDrag`, `commitDrag`, `storeDragHistory`, `handleTypeMap` | Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions. |
| [`tile-gizmos.ts`](tile-gizmos.ts) | — | — | Interactive square handles for tile volume (width, height, boundHeight, elevation) + Flip button. |
| [`tile-overlay.ts`](tile-overlay.ts) | — | — | Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer. |
<!-- routing:end -->
