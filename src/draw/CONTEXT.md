# src/draw/
> PIXI drawing utilities: constants, dashed shapes, mesh contour, 3D box geometry.

## Files

| File | Responsibility |
|------|---------------|
| `constants.ts` | Visual constants: `ORANGE`, `BLACK`, `DASH_LEN`, `GAP_LEN`, alpha values for front/back faces |
| `shapes.ts` | `drawDash()`, `drawDashedContour()` |
| `contour.ts` | `drawMeshContour()`, `MeshLike` interface — dashed image outline shared by tiles and tokens |
| `volume-box.ts` | 3D box geometry: `BoxVerts`, `P`, `computeVerts()` (tile), `computeTokenVerts()` (token), `buildBoxVerts()`, `drawBox()`, `drawAnchorLine()`. Uses `heightDir` from projection. |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the draw module — PIXI drawing utilities and geometry |
| [`constants.ts`](constants.ts) | [`constants.d.ts`](constants.d.ts) | `ORANGE`, `BLACK`, `DASH_LEN`, `GAP_LEN`, `ANCHOR_DASH` | Visual constants shared across all overlay and gizmo drawing code. |
| [`contour.ts`](contour.ts) | [`contour.d.ts`](contour.d.ts) | `drawMeshContour` | Unified dashed image-contour drawing shared by tile and token overlays. |
| [`shadow.ts`](shadow.ts) | [`shadow.d.ts`](shadow.d.ts) | `drawGroundShadow`, `circleTexture`, `rectTexture` | Ground shadow — cached radial gradient textures, elevation-scaled opacity. |
| [`shapes.ts`](shapes.ts) | [`shapes.d.ts`](shapes.d.ts) | `makeCounterWrapper`, `suppressMipmap`, `drawDash`, `drawDashedContour` | Pure PIXI drawing primitives — no domain knowledge, no constants imported. |
| [`volume-box.ts`](volume-box.ts) | [`volume-box.d.ts`](volume-box.d.ts) | `drawAnchorLine`, `drawBox` | PIXI drawing utilities for the 3D volume box. Purely functional — no canvas reads. |
<!-- routing:end -->
