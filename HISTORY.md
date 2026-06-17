# History

Archive of completed work and resolved issues.

---

## Completed — 2026-06-16

### Phase 3 — Separate Rendering Layer Architecture *(from ROADMAP)*

- `IsoSpriteLayer` PIXI.Container added to `canvas.stage` directly (outside VisibilityFilter scope)
- `cloneSprite(mesh)` + `syncSprite(clone, mesh)` in `src/render/iso-sprite-layer.ts`
- Token lifecycle: `drawToken` → create clone + mesh alpha=0; `refreshToken` → syncSprite; `destroyToken` → restore
- Tile lifecycle: same pattern for drawTile/refreshTile/destroyTile
- `canvasReady` rebuilds all clones for already-placed transformed objects
- `IsoSpriteLayer.sort()` wired into `DepthSorter.sort()` (tile-band + token-insertion model)
- Clone has `eventMode = "passive"` — hit detection stays in canvas.primary (alpha=0 mesh)
- Incremental update pattern (Map<id,Sprite>, update in-place) — NOT the fork's full-rebuild approach

---

## Completed — 2026-06-17

### Phase 4 — Fog-of-War Visibility Management *(from ROADMAP)*

- Token clones: visible if in current vision, hidden otherwise; `document.hidden` respected
- Tile clones: three-state fog machine — visible (full tint), explored+fogged (0x808080 tint), never-seen (hidden)
- `flags.isoroll.hideOnFog` added to `VolumeFlags`; hideOnFog toggle in Iso tab
- Viewer resolution: controlled tokens → player-owned token fallback; GM bypass
- `sightRefresh` + `canvasReady` wiring in `RenderGate`; `IsoTokenRenderer` / `IsoTileRenderer` `onSightRefresh()`
- Fog reset detection via `fog.exploration === null` with `fog.fogExploration` guard
- F5 recovery via `FogManager.isPointExplored()` with perimeter sampling (`buildPerimeterPoints`)
- `localStorage` bridge (`isoroll-seen-{sceneId}`) saves `seenTileIds` on `beforeunload`; restored after F5 via `restoredTileIds` set — bypasses Foundry's 2-second fog save debounce
- `maybeInvalidateRestoredTiles()` detects in-session fog reset and clears both sets + localStorage
- `IsoSpriteLayer._onTick` (priority −25) suppresses `mesh.alpha = 0` every frame — defeats `Tile._refreshState()` reset at OBJECTS priority 23, runs last before GPU render

**Known remaining / deferred from Phase 4:**
- Token shadow still visible through fog (cosmetic; deferred)
- Very fast F5 (< ~2 sec after exploration) may miss fog save; localStorage covers most cases

---

## Completed — 2026-06-17

### IsoRenderer Refactor — Phase 4: render-lifecycle.ts goes live *(from REFACTOR.md)*

- All lifecycle function bodies implemented (replaced `throw new Error("not implemented")` stubs)
- `render-gate.ts` slimmed from 155 → ~50 lines; all dispatch/classification moved to lifecycle
- New hooks wired: `canvasTeardown`, `updateTile` → `onTileFlagsChange`, `renderGridConfig` → `onGridConfigOpen`
- New exports: `onTileDraw`, `onTileDestroy`, `onTokenDraw`, `onTokenDestroy`, `registerTokenRenderer`, `registerTileRenderer`
- Module-level renderer registry (`_tokenRenderers[]`, `_tileRenderers[]`) replaces RenderGate instance arrays
- `CanvasEnv` used for all canvas reads in lifecycle — no raw `canvas.*`

### IsoRenderer Refactor — Phase 5: IsoRenderer core + VolumeOverlay tile box *(from REFACTOR.md)*

- `IsoRenderer` fully implemented: `render/clear/clearOwner/clearLayer/clearAll`, key→Container registry,
  owner index, sight-tracked set, z-order via LayerManager, `RenderHandle` (show/hide/update/remove)
- `DrawAPI` interface methods changed to `void` returns — `PIXI.Graphics` satisfies structurally
- `drawBox`, `drawAnchorLine` (`volume-box.ts`), `drawMeshContour` (`contour.ts`), `drawDash` (`shapes.ts`)
  now accept `DrawAPI` instead of `PIXI.Graphics`; existing PIXI.Graphics callers unchanged
- `VolumeOverlay` tile box migrated: `IsoRenderer.render(kind:"lines")` replaces manual
  `ensureLayer/new Container/addChild/bringToTop/Map`; `_handles` Map tracks `RenderHandle` per tile;
  `_drawInto(g: DrawAPI)` calls all draw utilities without touching PIXI; `onDestroy` added
- Shadow NOT yet migrated (requires `kind:"sprite"` in `_paint` — Phase 6)
- Build: 83 modules, 148.44 kB

---

## Resolved Bugs — 2026-06-17

- **B26** — Native elevation tooltip (XXft) reappears on tokens: fixed in `token-elev-gizmo.ts` — three early-return paths for `transformToken = true` now explicitly set `nativeTooltip.visible = false` *(resolved)*

- **Phase 5 bug** — Deletion leaving sprite clones visible until F5:
  Root cause: `getMesh(undefined)` in `iso-sprite-layer.ts` threw `TypeError` when `getTile(id)` returned
  `undefined` (tile already removed from `canvas.tiles` at time of `deleteTile` hook). Error swallowed by
  Foundry's hook system → `removeClone` never ran → clone persisted. Fix: null guard added to `getMesh`.
  `deleteTile`/`deleteToken` document hooks in `render-gate.ts` provide the cleanup trigger (belt-and-suspenders
  alongside `destroyTile`/`destroyToken`). *(resolved)*

- **Phase 5 bug** — Moving tile causes volume box + contour lines to disappear until tile reselected:
  Foundry creates preview clone during drag with same `id` as original. `destroyTile(previewClone)` fired
  `onTileDestroy(id)` → cleared original's handles + sprite clones. Fixed by guarding `destroyTile`/
  `destroyToken` with `!isPreviewClone(t)`. `isPreviewClone` checks `t.isPreview` property. *(resolved)*
