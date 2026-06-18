# History

Archive of completed work and resolved issues.

---

## Completed — 2026-06-18

### IsoRenderer Refactor — Phase 6e: BackgroundGizmos → IsoRenderer *(from REFACTOR.md)*

- `bg-gizmos.ts`: replaced PIXI boilerplate with `IsoRenderer.render()` for all background drag handles
- Pattern: `onPointerDown: (e) => { e.stopPropagation(); BackgroundGizmos.beginDrag(...); }` — no native event stop (same as token gizmos)
- `startPointerDrag` with window listeners confirmed working for background handles

### IsoRenderer Refactor — Phase 6f: WallOverlay → IsoRenderer *(from REFACTOR.md)*

Initial commit (`685e0cd`) migrated `WallOverlay` to `IsoRenderer.render()` but endpoint drag was broken. Full debug + rebuild this session:

**Problem:** `window.pointermove` never fired after `startPointerDrag` was called from wall endpoint `onPointerDown`. Root causes identified:
- `nativeEvent.stopImmediatePropagation()` on endpoint `pointerdown` breaks `window.pointermove` delivery — safe only on non-drag handlers (line single-clicks)
- Endpoint hitArea too small (no explicit hitArea → ~3px default for small drawn circle)

**Solution:** Rebuilt `drawWallDisplay` from scratch mirroring the working elevation handle pattern exactly (`e.stopPropagation()` only, no native stop). Confirmed `window.pointermove` fires correctly in tile-selected context with this pattern.

**Final `drawWallDisplay` implementation:**
- Renders wall line via `lineVis(c, col)` + two endpoint circles per wall via `IsoRenderer.render()`
- `epMove`: `toCanvas(ev)` → snap to `gridSize/4` (SHIFT bypasses) → `epH.update({placement})` + `lineH.update({visual: lineVis(nc, col)})`
- `epUp`: `toCanvas(ev)` + snap → `scene().updateEmbeddedDocuments("Wall", [{ _id, c: nc }])`
- Double-click on line or endpoint: opens wall config sheet (`wallDblClick` with shared `lastClick` per wall)
- Cursor: `"pointer"` on both line and endpoints (Foundry convention)

**Shared visual helpers (`drawEpDot`, `drawWallLine`):** Single source for endpoint dot + wall line rendering. Both `drawWallDisplay` and `drawWallSelect` use these — changing one changes both.

**Key findings:**
- `screenPointToCanvas(sx, sy, wt)` takes 3 args; use `CanvasEnv.worldTransform()` as third
- Line interaction requires `nativeEvent.stopImmediatePropagation()` on single-click (no drag follows) to prevent Foundry box selection — safe because no `startPointerDrag` is called afterward
- `lastClick = { t: 0 }` shared between line + both endpoints for consistent dblclick detection

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

---

## Completed — 2026-06-17

### IsoRenderer Refactor — Phase 6c: VolumeGizmos (tile handles) → IsoRenderer *(from REFACTOR.md)*

- `iso-renderer.ts`: implemented `kind:"circle"`, `kind:"rect"`, `kind:"polygon"` in `_paint`; added `fillAlpha?` to all three
- `iso-renderer.ts`: implemented `Interaction` — sets `c.eventMode="static"`, cursor, pointer event listeners on container
- `iso-renderer.ts`: added `testPoint?: P2` to `RenderSpec`; `isoRendererSightRefresh` uses it instead of `placement.anchor` when set (needed for `kind:"lines"` specs where anchor is world origin but test point should be token center)
- `tile-gizmos.ts`: PIXI container+handleTypeMap loop replaced with `IsoRenderer.render()` per handle; `_handleVisual()` / `_isFlat()` / `_cursor()` helpers; `_handleKeys` map replaces old `sets` map; rotate blocker retained in PIXI (needs `layer.toLocal()`)

**Key debugging findings (interaction hit-testing):**
- PIXI v7/v8 `_hitTestRecursive` only calls `containsPoint()` on `"static"`/`"dynamic"` objects — `"passive"` children are walked but never tested. Parent container with no `hitArea` and `"passive"` children = unhittable.
- Fix: upgrade children to `"static"` in `render()` when `spec.interaction` is set. Events bubble child→container where listeners live.
- Cursor must be set on the leaf hit target (child graphics), not just parent container. PIXI resolves cursor from the hit target outward, not inward.
- Both fixes folded into the interaction block in `render()`: `c.children.forEach(ch => { el.eventMode="static"; if(cursor) el.cursor=cursor; })`

### IsoRenderer Refactor — Phase 6d: TokenGizmos handles → IsoRenderer *(from REFACTOR.md)*

- `token-gizmos.ts`: removed `sets` Map, `_boxHandles` Map, `destroyMapped`, `LayerManager`, `makeCircleHandle`, `makeSquareCounterHandle`
- Single `_handleKeys: Map<string, Set<string>>` tracks all keys (box + elev + imgOffset + imgScale + imgYScale)
- Elevation handle: `kind:"circle"` `flat:true` cursor `"n-resize"`; img handles: `kind:"circle"`/`"rect"` `flat:true` with respective cursors
- `_drawBox`/`beginDrag`/`pushHistory`/`commit` unchanged

### Bug fixes — Fog visibility for token overlays *(from REFACTOR.md Phase 6b/6c)*

- **Indicator + label always visible in fog**: added `visibility:"sight-tracked"` to both; indicator uses `testPoint` at token center (anchor stays `{0,0}`)
- **Controlled tokens couldn't see own overlays**: `applyTokenFogContainer` gains optional `tokenId?`; if that token is in `canvas.tokens.controlled`, bypass fog test entirely — matches token sprite behavior
