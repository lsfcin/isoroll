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
