# src/transform/
> Coordinate math, stage/object counter-transforms, HUD patches — no UI, no PIXI drawing.

## Files

| File | Responsibility |
|------|---------------|
| `coord-types.ts` | Core types: `P2`, `P3`, `AffineMatrix`, `TileMeshCoord` |
| `coord-map.ts` | Public facade: `transformCoord(p, fromSys, toSys, ctx)` dispatcher + re-exports. Hub routes all conversions through WORLD. `CoordSystem`, `TransformContext` types. |
| `coord-sys-viewport.ts` | VIEWPORT ↔ WORLD via affine matrix inverse/forward |
| `coord-sys-screen.ts` | SCREEN ↔ WORLD: browser px → viewport (subtract rect) → world |
| `coord-sys-grid.ts` | GRID ↔ WORLD: multiply/divide by `gridSize` |
| `coord-sys-image.ts` | IMAGE ↔ WORLD: normalised [0,1]² via PIXI mesh transform (rotation, scale, anchor, texture) |
| `coord-sys-iso3d.ts` | ISO3D ↔ WORLD: 3D isometric space with elevation via `heightDir` |
| `coord-debug.ts` | Dev-only: `drawCoordDebug()` — renders roundtrip markers for all coord-system pairs |
| `constants.ts` | `PROJECTION_TYPES` (8 presets), `IsoProjection` interface, `getProjection(scene)`, `currentProjection()`. `heightDir = {x:1, y:-1}` for all built-in presets. |
| `stage-transform.ts` | `CanvasTransform` — stage rotation+skew, `effectiveProjection()`, `previewOverride`, hooks: canvasReady/updateScene |
| `bg-transform.ts` | Background sprite counter-transform: `getBgYScale()`, `setBgYScaleOverride()`, `applyBgTransform()` |
| `object-transform.ts` | Hook registrations: `refreshToken` → `onRefreshToken`, `refreshTile` → `onRefreshTile`, `updateTile` → `onUpdateTileFlags`, `preUpdateScene` / `updateScene` for grid rescale |
| `tile-transform.ts` | Tile counter-transform: `onRefreshTile()`, `onUpdateTileFlags()` (forces refresh when isoroll flags change via setFlag), `onPreUpdateScene()`, `onUpdateSceneGridRescale()`, `applyTileCounter()` |
| `token-transform.ts` | Token counter-transform: `onRefreshToken()`, `tokenBase` WeakMap for base-position caching |
| `ruler-patch.ts` | Prototype patches: `_getWaypointLabelContext` (Ruler + TokenRuler), `_updatePosition` (TileHUD + TokenHUD) for iso-correct CSS positioning |

## Coordinate Systems

| System | Unit | Notes |
|--------|------|-------|
| `WORLD` | canvas px | Hub. `tile.document.x/y` = CENTER; `token.document.x/y` = TOP-LEFT |
| `VIEWPORT` | canvas element px | Affine matrix inverse of stage worldTransform |
| `SCREEN` | browser px | VIEWPORT + `getBoundingClientRect()` offset |
| `IMAGE` | [0,1]² | Per-mesh texture UV. `(0,0)` = top-left, `(1,1)` = bottom-right |
| `GRID` | grid units | `world = grid × gridSize` |
| `ISO3D` | mixed | `x/y` = WORLD footprint at elev=0, `z` = elevation in gridDistance units |

All conversions: `fromSys → WORLD → toSys` via `transformCoord()`.
Curried API: `toWorld(params)(point)` / `fromWorld(params)(point)` in each `coord-sys-*.ts`.

## Variable Naming

| Name | Meaning |
|------|---------|
| `gridSize` | `canvas.grid.size` — canvas px per grid unit |
| `gridDist` | `canvas.grid.distance` — world distance per grid unit |
| `elevPx` | elevation in canvas px: `elevToCanvas(elev, gridSize, gridDist)` |
| `heightDir` | `proj.heightDir` — `{x:1, y:-1}` for all built-in presets |
| `baseCenterWorld` | tile CENTER + elevation offset: `doc.x + heightDir * elevPx` |
| `anchorUV` | IMAGE-space UV that maps to `baseCenterWorld` (anchor pivot) |
| `imgOffPx` | `imageOffset * gridSize` — WORLD-space displacement from `baseCenterWorld` to mesh.x/y |

## Key Gotchas

- **`setFlag` does NOT trigger `refreshTile`**: `Tile._onUpdate` only sets render flags for `x/y/width/height/rotation/alpha/elevation`. Flag-only changes set nothing → `applyRenderFlags` returns immediately → hook never fires. Fix: `onUpdateTileFlags` detects `flags.isoroll.*` in `changes` and calls `tile.renderFlags.set({ refreshMesh: true })` manually.
- **`mesh.scale.set()` safe every refresh** — absolute, not cumulative. No meshReset guard needed. Only guard `*=` patterns.
- **Animation frames fire `refreshMesh`, not `refreshPosition`**: token hide/show alpha lerp fires `refreshMesh` every frame. Do NOT capture `tokenBase` on refreshMesh — offset accumulates and image drifts.
- **`imageOffset` coordinate space**: stored as `canvas_px / gridSize` (WORLD displacement normalized). In `onRefreshTile`: `mesh.x = baseCenterWorld.x + imgOff.x * gridSize`. To convert imgOff to IMAGE space: two `transformCoord` calls → subtract (displacement, not absolute point).
- **Anchor computation order**: `applyTileCounter` (sets scale/rotation) → temp `mesh.anchor=(0.5,0.5)` + `mesh.x/y = boxTopCenter` → `anchorUV = WORLD→IMAGE(baseCenterWorld)` → `mesh.anchor = anchorUV` → `mesh.x/y = baseCenterWorld + imgOffPx`.
- **`coord-sys-image.ts` uses `Math.abs(scale.x)`** — ignores flip sign. Roundtrip is self-consistent but UV is mirrored for flipped tiles.
- **`worldTransform` cache on `canvasReady`**: stale (identity) until next PIXI frame. `syncHudAfterStageApply()` in `stage-transform.ts` flushes and syncs `#hud` CSS immediately. Do NOT call `stage.updateTransform()` — crashes when `stage.parent` is null.
- **HUD patches**: `ruler-patch.ts` patches prototypes, never use `renderTileHUD`/`renderTokenHUD` hooks — miss document-update re-renders and RAF timing stomps `transform: scale(uiScale)`.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the transform module — stage, object, and coordinate transforms |
| [`bg-transform.ts`](bg-transform.ts) | [`bg-transform.d.ts`](bg-transform.d.ts) | `getBgYScale`, `setBgYScaleOverride`, `applyGridConfigPatch`, `findPreviewContainer` | Background sprite counter-transform: undistorted background while stage is isometric. |
| [`constants.ts`](constants.ts) | [`constants.d.ts`](constants.d.ts) | `getProjection`, `currentProjection`, `PROJECTION_TYPES`, `DIMETRIC_2_1` | ← add first-line comment |
| [`coord-debug-dom.ts`](coord-debug-dom.ts) | [`coord-debug-dom.d.ts`](coord-debug-dom.d.ts) | `clearDOM`, `drawDOMText`, `getOrCreateDebugDOMLayer`, `drawDOM`, `renderScreen` | DOM helpers and primitive render functions for coordinate debug visualization. |
| [`coord-debug.ts`](coord-debug.ts) | [`coord-debug.d.ts`](coord-debug.d.ts) | `drawCoordDebug`, `DEBUG_COORD`, `nativeRender`, `buildTransformContext`, `renderPair` | Coordinate system debug overlay: renders colored markers for each CoordSystem at sample points. |
| [`coord-map.ts`](coord-map.ts) | [`coord-map.d.ts`](coord-map.d.ts) | `transformCoord`, `toWorldScreen`, `toWorldViewport`, `toWorldImage`, `toWorldGrid` | ← add first-line comment |
| [`coord-sys-grid.ts`](coord-sys-grid.ts) | [`coord-sys-grid.d.ts`](coord-sys-grid.d.ts) | `toWorld`, `fromWorld` | GRID ↔ WORLD: scale by gridSize (canvas pixels per grid unit). |
| [`coord-sys-image.ts`](coord-sys-image.ts) | [`coord-sys-image.d.ts`](coord-sys-image.d.ts) | `toWorld`, `fromWorld` | IMAGE ↔ WORLD: normalised [0,1]² texture space via PIXI mesh transform. |
| [`coord-sys-iso3d.ts`](coord-sys-iso3d.ts) | [`coord-sys-iso3d.d.ts`](coord-sys-iso3d.d.ts) | `toWorld`, `fromWorld` | ISO3D ↔ WORLD: 3D isometric space with elevation via heightDir. |
| [`coord-sys-screen.ts`](coord-sys-screen.ts) | [`coord-sys-screen.d.ts`](coord-sys-screen.d.ts) | `toWorld`, `fromWorld` | SCREEN ↔ WORLD: browser window pixels via viewport affine inverse. |
| [`coord-sys-viewport.ts`](coord-sys-viewport.ts) | [`coord-sys-viewport.d.ts`](coord-sys-viewport.d.ts) | `toWorld`, `fromWorld` | VIEWPORT ↔ WORLD: affine matrix inverse/forward. |
| [`coord-types.ts`](coord-types.ts) | [`coord-types.d.ts`](coord-types.d.ts) | — | ← add first-line comment |
| [`object-transform.ts`](object-transform.ts) | [`object-transform.d.ts`](object-transform.d.ts) | — | ← add first-line comment |
| [`ruler-patch.ts`](ruler-patch.ts) | [`ruler-patch.d.ts`](ruler-patch.d.ts) | `registerRulerPatch`, `patchRulerProto`, `applyTileHudPosition`, `patchTileHUDProto`, `applyTokenHudPosition` | ← add first-line comment |
| [`stage-transform.ts`](stage-transform.ts) | [`stage-transform.d.ts`](stage-transform.d.ts) | — | Stage isometric transform coordinator: rotation/skew, preview override, object refresh. |
| [`tile-transform-rescale.ts`](tile-transform-rescale.ts) | [`tile-transform-rescale.d.ts`](tile-transform-rescale.d.ts) | `onPreUpdateScene`, `onUpdateSceneGridRescale`, `syncWallsAfterRescale`, `buildRescaleUpdates`, `doRescale` | Grid-rescale scene update handlers: pre-update capture, rescale apply, wall sync. |
| [`tile-transform.ts`](tile-transform.ts) | [`tile-transform.d.ts`](tile-transform.d.ts) | `onUpdateTileFlags`, `onPreUpdateTileFlip`, `onRefreshTile`, `EPS`, `applyTileCounter` | Tile counter-transform: refreshTile hook, flag-change trigger, grid-rescale scene update handlers. |
| [`token-transform.ts`](token-transform.ts) | [`token-transform.d.ts`](token-transform.d.ts) | `onRefreshToken` | Token counter-transform: refreshToken hook handler. |
<!-- routing:end -->
