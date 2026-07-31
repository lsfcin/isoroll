# core
> ← add description

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the core module — module ID, volume flags, and shared utilities |
| [`canvas-env.ts`](canvas-env.ts) | [`canvas-env.d.ts`](canvas-env.d.ts) | `CanvasEnv` | Single typed accessor for canvas/game globals. |
| [`flags.ts`](flags.ts) | [`flags.d.ts`](flags.d.ts) | `getElevation`, `isTransformedToken`, `isTransformedTile`, `MODULE_ID` | ← add first-line comment |
| [`history.ts`](history.ts) | [`history.d.ts`](history.d.ts) | `IsoHistory` | Canonical pre-drag history push. Unifies the 4 inconsistent canvas.X.history.push sites. |
| [`hook-registry-placeables.ts`](hook-registry-placeables.ts) | [`hook-registry-placeables.d.ts`](hook-registry-placeables.d.ts) | `registerTileAndTokenHooks` | Tile/token placeable hooks — split from hook-registry.ts (200-line gate). Same rules: |
| [`hook-registry.ts`](hook-registry.ts) | [`hook-registry.d.ts`](hook-registry.d.ts) | `registerAllHooks`, `registerCanvasAndSceneHooks` | Central hook registry — all Hooks.on/once calls in one place (placeable hooks split |
| [`module.ts`](module.ts) | [`module.d.ts`](module.d.ts) | `registerIsorollGlobal` | ← add first-line comment |
| [`settings.ts`](settings.ts) | [`settings.d.ts`](settings.d.ts) | `registerVolumeSettings` | ← add first-line comment |
| [`util.ts`](util.ts) | [`util.d.ts`](util.d.ts) | `suppressTooltip`, `scheduleWrap`, `canvasZoom`, `gridDistance`, `elevToCanvas` | ← add first-line comment |
<!-- routing:end -->
