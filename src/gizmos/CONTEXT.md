# src/gizmos/
> Handle factories, mesh corner helpers, and image drag math — shared by tiles and tokens.

## Files

| File | Responsibility |
|------|---------------|
| `handle-draw.ts` | Low-level PIXI handle drawing: `makeHandle()`, `makeCircleHandle()`, `makeSquareCounterHandle()`, `makeMoveHandle()`, `makeSwapHandle()`, `makeFaceHandle()` |
| `handle-factories.ts` | `makeHandleForType(type, heightDirX, heightDirY)` — dispatches to correct factory per `HandleType`. `createRotateBlocker()` — invisible circle over Foundry's native rotate handle. |
| `mesh-corners.ts` | World-space corner/center helpers: `imageBottomLeft()`, `imageTopRight()`, `imageBottomCenter()`, `imageTopCenter()`. Snap helpers: `snapQuarterPx()`, `snapQuarterUnits()`. `clientToGlobal()` — browser→PIXI global coords. |
| `img-drag.ts` | Image drag math: `projectImgOffset(dx, dy, wt, startX, startY)`, `projectImgScale()`, `projectImgYScale()`. Returns WORLD-space canvas-px displacements. |

## Naming Convention

`handlePositions()` and `makeHandleForType()` take `heightDirX: number, heightDirY: number` as scalar params (math functions). Call sites use `heightDir.x` / `heightDir.y` from `proj.heightDir`.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the gizmos module — handle factories, image drag math, mesh corner helpers |
| [`handle-draw.ts`](handle-draw.ts) | [`handle-draw.d.ts`](handle-draw.d.ts) | `HANDLE_SIZE`, `HALF` | Size constants for gizmo handles — used by bg-gizmos, tile-gizmos, token-gizmos. |
| [`handle-factories.ts`](handle-factories.ts) | [`handle-factories.d.ts`](handle-factories.d.ts) | `createRotateBlocker` | Handle utilities — rotate-blocker factory only. |
| [`img-drag.ts`](img-drag.ts) | [`img-drag.d.ts`](img-drag.d.ts) | `projectImgOffset`, `projectImgYScale`, `projectImgScale`, `IMG_YSCALE_SNAP_PX` | Shared pure-math helpers for image-manipulation drag (offset, scale, Y-scale). |
| [`mesh-corners.ts`](mesh-corners.ts) | [`mesh-corners.d.ts`](mesh-corners.d.ts) | `imageBottomLeft`, `imageTopRight`, `imageBottomCenter`, `imageTopCenter`, `snapQuarterPx` | Mesh corner, snap, and client-to-canvas coordinate helpers for gizmo placement. |
<!-- routing:end -->
