# History

Archive of completed work and resolved issues.

---

## IsoRenderer Refactor — Design Reference (Phases 0–8, archived 2026-06-19)

> Original REFACTOR.md content. Phases 0–8 complete on branch `refactor/iso-renderer`.
> Active continuation in current REFACTOR.md (Phases 9–11).

### Goal

Isolate all direct Foundry/PIXI API calls to a declared set of boundary files.
Every visual rendering decision flows through one entry point (`IsoRenderer`).
Every canvas read flows through one accessor (`canvas-env.ts`).

**Before:** ~37 files touch `canvas.*` directly. ~8 overlay classes each duplicate the same ~25-line
PIXI lifecycle block (ensureLayer → new Container → addChild → bringToTop → Map registry → destroy).

**After:** Foundry/PIXI calls confined to ~12 boundary files. One rendering API. One canvas accessor.
Consumers (overlays, gizmos) declare *what* to draw — they never touch `canvas.*` or `PIXI.*`.

### Boundary Files

| File | Permitted direct calls | Reason |
|------|----------------------|--------|
| `core/canvas-env.ts` | `canvas.*`, `game.user`, `game.settings` | The one canvas accessor |
| `core/flags.ts` | `game.settings.get`, `canvas.scene.getFlag` | Flag adapter |
| `render/layer-manager.ts` | `canvas.stage`, `PIXI.Container` | Layer registry |
| `render/iso-renderer.ts` | `PIXI.Container`, `PIXI.Graphics`, `PIXI.Sprite` | Rendering façade |
| `render/mesh-accessor.ts` | `tile.mesh`, `token.mesh` | Typed mesh reader |
| `render/render-gate.ts` | `Hooks.on*` | Thin hook subscriber |
| `transform/stage-transform.ts` | `canvas.app.stage`, `document.getElementById("hud")` | Stage transform |
| `transform/bg-transform.ts` | `canvas.environment.primary.background`, `PIXI.*` | Background counter-transform |
| `transform/tile-transform.ts` | `tile.mesh`, `renderFlags.set` | Tile mesh mutation |
| `transform/token-transform.ts` | `token.mesh`, `renderFlags.set` | Token mesh mutation |
| `transform/ruler-patch.ts` | `CONFIG.Token/Tile.hudClass`, `canvas.app.stage` | Prototype patches |
| `hud/hud-utils.ts` | DOM `.style`, `canvas.app.stage.worldTransform` | HUD CSS positioning |
| `ui/*` | `Hooks.on renderSceneConfig/TileConfig/TokenConfig/GridConfig` | AppV2 form injection |
| `occluder/occluder.ts` | `tile.mesh.alpha`, `canvas.tiles/tokens.placeables` | Alpha occlusion |
| `render/fog-helpers.ts` | `canvas.visibility.testVisibility`, `canvas.fog.isPointExplored`, `canvas.tokens.controlled` | Fog visibility |

### New Files Created

| File | Absorbs from | Responsibility |
|------|-------------|----------------|
| `core/canvas-env.ts` | ~37 scattered `canvas.*` reads | Single typed accessor |
| `render/iso-renderer.ts` | 8 overlay classes (PIXI lifecycle boilerplate) | Single rendering entry point |
| `render/iso-geometry.ts` | `draw/volume-box.ts`: computeVerts, computeTokenVerts, tokenFootprint | Footprint math |
| `render/mesh-accessor.ts` | 11 `as unknown as MeshLike` casts | Safe typed mesh reader |
| `render/render-lifecycle.ts` | `render/render-gate.ts` dispatch logic + scattered hook handlers | All rendering decisions |

### IsoRenderer API

```typescript
const IsoRenderer = {
  render(spec: RenderSpec): RenderHandle,
  clear(key: string): void,
  clearOwner(ownerId: string): void,
  clearLayer(layer: LayerKey): void,
  clearAll(): void,
};

type ShapeSpec =
  | { kind: "rect";    w: number; h: number;       fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "circle";  radius: number;              fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "polygon"; points: P2[];                fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "lines";   build: (g: DrawAPI) => void }
  | { kind: "text";    content: string;             style: TextStyleSpec; alpha?: number }
  | { kind: "sprite";  texture: TextureRef;         anchor?: P2; scale?: P2; alpha?: number };

interface RenderSpec {
  owner:        { kind: "tile" | "token" | "background"; id: string };
  visual:       ShapeSpec;
  interaction?: Interaction;    // any shape becomes interactive
  space:        CoordSystem;    // "WORLD" | "ISO3D" | "GRID" | "IMAGE" | "SCREEN" | "VIEWPORT"
  placement:    { anchor: P2 | P3; offset?: P2 };
  layer?:       LayerKey;
  z?:           number | "top";
  visibility?:  "always-visible" | "sight-tracked";  // default: "always-visible"
  testPoint?:   P2;      // ground-level point for fog test (needed when anchor is elevated)
  flat?:        boolean; // apply inverse stage transform — visual appears screen-upright
  hitArea?:     P2[];
  key:          string;  // idempotency — render() with same key replaces prior visual
}
```

### Visibility Taxonomy

```
visibility: "always-visible"  →  draw regardless of fog/vision state
                                  use for: GM overlays, gizmos, volume boxes, debug

            "sight-tracked"   →  follow token sight system (three states)
                                  use for: sprite clones, shadows, objects that fog-match

When "sight-tracked", IsoRenderer manages tint on sightRefresh via fog-helpers.ts:
  visible    →  tint 0xffffff (full brightness)
  explored   →  tint canvas.colors.fogExplored
  unexplored →  visible = false
```

Elevated anchors (e.g. label at top of elevation line) MUST set `testPoint` to the ground position.
Fog data is at ground level — elevated anchor tests outside that map and always reads as visible.

### Lifecycle Entry Points (render-lifecycle.ts)

```typescript
export function onCanvasReady(): void
export function onCanvasTeardown(): void
export function onSceneChange(scene: Scene, changes: object): void
export function onTileRefresh(tile: Tile, flags?: Record<string, boolean>): void
export function onTileFlagsChange(tile: Tile): void
export function onTileSelect(tile: Tile): void
export function onTileDeselect(tile: Tile): void
export function onTileMove(tile: Tile): void
export function onTokenRefresh(token: Token, flags?: Record<string, boolean>): void
export function onTokenFlagsChange(token: Token): void
export function onTokenSelect(token: Token): void
export function onTokenDeselect(token: Token): void
export function onTokenMove(token: Token): void
export function onSightRefresh(): void
export function onGridConfigOpen(app: Application): void
export function onGridConfigClose(): void
export function onGridConfigPreview(params: object): void
```

### Rules (established)

1. **Boundary rule**: only boundary files may use `canvas.*`, `PIXI.*`, `Hooks.*`, `game.*`, `CONFIG.*` directly.
2. **Idempotency**: `IsoRenderer.render({ key })` replaces the prior visual for that key. Call unconditionally.
3. **Single decision point**: all show/hide/update/clear calls happen inside a `render-lifecycle.ts` function.
4. **Strangler Fig**: never two live implementations of the same logic. New file wraps old, callers migrate, old deleted.
5. **Commit rule**: module must load in Foundry with the scene functional at every commit.
6. **200 LOC limit**: new source files obey the workspace hard block.

### Phase Summary (Phases 0–8 complete)

- **Phase 0** — Pre-flight: branch created, `IsoSpriteLayer._sort()` stub added.
- **Phase 1** — Stub new files: canvas-env, iso-renderer, iso-geometry, mesh-accessor, render-lifecycle, history.ts created with full interfaces.
- **Phase 2** — canvas-env live: all `canvas.grid?.size`, `canvas.app.stage.worldTransform`, etc. replaced across 7+ files.
- **Phase 3** — iso-geometry + mesh-accessor live: computeVerts/tokenFootprint absorbed; volume-box.ts purely functional; MeshLike casts eliminated.
- **Phase 4** — render-lifecycle live: all dispatch/classification moved from render-gate; RenderGate slimmed to ~50 lines.
- **Phase 5** — IsoRenderer core + VolumeOverlay tile box: full IsoRenderer implemented and proven end-to-end.
- **Phase 6** — All overlays migrated: VolumeOverlay (token), TokenBackground, VolumeGizmos, TokenGizmos, BackgroundGizmos, WallOverlay, Occluder (gated behind `isorollNewOccluder` flag).
- **Phase 7** — UI + Background: bg-html/bg-drag/tile-config/token-config boundary violations fixed; GridConfig flow verified.
- **Phase 8** — Cleanup + enforcement: tile shadow migrated to IsoRenderer `kind:"sprite"`; boundary grep audit clean; KNOWN-BUGS + ROADMAP updated.

### Migration Strategy: Strangler Fig

Never two live versions of the same logic simultaneously. New file created with full interface, initially delegates to old code. Callers updated to call new file. Old code inside new file replaced. Old file deleted only when fully replaced. At every step: one source of truth, builds cleanly, loads in Foundry.

---

## Completed — 2026-06-22

### IsoRenderer Refactor — Cleanup Phase 11 *(on branch refactor/cleanup)*

- **Phase 11** — Hook centralization: all `Hooks.on/once` calls moved from 14 subsystem files into `src/core/hook-registry.ts`. Explicit per-event execution order documented. Private handlers made public across `CanvasTransform` (5), `WallManager` (5+1 new), `TileHud`, `RenderGate` (2 new statics), `IsoSpriteLayer` (2 new methods). `BgHtml.activate()` → `setup()` (stores callbacks, no hook registration). `PresetManager.activate()` removed; 8 lambdas extracted as public statics. UI files: `registerXxxHook()` → `onRenderXxx()` named exports. Legacy occluder hooks isolated in `registerLegacyOccluderHooks()` guarded by `isorollNewOccluder` feature flag. *(688c019)*

---

## Resolved Bugs — 2026-07-01 (session 2)

- **B31** — Unseen iso tiles flicker during/after token movement. Two root causes fixed:
  1. **Fog AABB used doc-space coords, ignoring elevation** (`a210e26`): `onSightRefresh` passed `docX - w/2, docY - h/2` to `applyTileFog`. For elevated tiles, `mesh.x/y` = `doc.x/y + heightDir*elevPx + imgOffset*gs`, so the fog test fired on the wrong world position. Fix: destructure `getMesh(t)` to get `cx/cy` from `mesh.x/y` in `iso-tile-renderer.ts::onSightRefresh`.
  2. **Occluder set `mesh.alpha = 1.0` for iso tiles after `_onTick` corrected it** (`57c79fd`): `occluder.ts::_evaluateTile` wrote `mesh.alpha = 1.0` for all tiles unconditionally. `evaluateAll()` fires from Foundry's `canvas.perception.update()` at UTILITY priority (-50) — after isoroll's `_onTick` at -25 had already zeroed it — so the GPU rendered the native tile in `canvas.primary` for one frame (appearing partially lit by Foundry's VisibilityFilter). Fix: `_evaluateTile` now branches on `tileSlices.has(tile.id)`: iso tiles get `mesh.alpha = 0`, standard tiles keep the existing occlusion logic. `tileSlices` exported through `render/index.ts` facade. *(branch `fix/b31-tile-flash`)*

---

## Resolved Bugs — 2026-07-01

- **B28** — Swap-tile slice grid footprint wrong after `swapSide()`. Three layered root causes, each fixed separately:
  1. **Wrong Wg/Hg** (`96667d5`): `_gridMetrics` applied `flipped ? docH : docW` to un-swap dims, but `swapSide()` had already swapped `doc.width ↔ doc.height` — double-swap produced wrong Wg/Hg (e.g. 2×5 instead of 4×1). Fix: removed the un-swap branch; `doc.width`/`doc.height` are already visual dims post-swap.
  2. **Descending UV cuts → 1px-wide middle slices** (`c517728`): `scale.x < 0` made `transformCoord` return frontier-corner UV values in descending order; unsorted `cuts` array produced negative slice widths clamped to 1px. Fix: `projected.sort((a,b)=>a-b)` before dedup. Stale debug containers on swap also fixed here (clear before redraw).
  3. **Wrong cut positions** (`aa6f9f0`): `transformCoord` uses `Math.abs(scale.x)` internally, ignoring mirror. True UV for flipped tile is `2*ax − uv.x`. Without this, cuts landed at cell midpoints. Fix: `const uvx = flipped ? 2 * ax - uv.x : uv.x` in `computeSliceCuts` and matching fix in debug label rendering. `effectiveI = flipped ? nSlices-1-i : i` handles depth-order reversal in `buildSlice`.

---

## Resolved Bugs — 2026-06-22

- **B29** — Linked-wall displacement undo broken. Root cause: `epUp()` in `wall-overlay-ops.ts` called `scene().updateEmbeddedDocuments(...)` without first pushing a `"move"` entry to `WallHistory`. Fix: one-liner `WallHistory.push({ k:"move", wallId: d.wallId, prevC: d.c })` before the update call. `d.c` holds pre-drag canvas coords captured at `drawWallDisplay` time. `onUpdateWall` anchor-sync runs on undo too (option is `"undoMove"`, not exempted), so anchor stays consistent after undo. *(63f757f)*

---

## Completed — 2026-06-21

### IsoRenderer Refactor — Cleanup Phases 9 + 10 *(on branch refactor/cleanup)*

- **Phase 9** — Dead code purge: handle-draw factories, `drawGroundShadow`, `makeCounterWrapper` removed (zero callers confirmed). *(3448a94)*
- **Phase 10** — IsoRenderer phantom API trimmed: `kind:"3d-box"` (unimplemented shape), `space` field (was a no-op), `placement.offset` (unread) removed from the render spec. *(cdfc95f)*

---

## Resolved Bugs — 2026-06-21

- **Bug 3c** — Linked walls disappear during tile drag. Root cause: `drawWallDisplay` pre-computed `c = wdoc.c` (committed coords) before `IsoRenderer.render`; during drag `wdoc.c` never updates. For gizmo drag: Foundry deselect on gizmo grab cleared `_tileKeys`, blocking `refresh()`. Fix: `drawWallDisplay` now computes `c` from `imageRect(tile.document) + anchor` (live for preview clones, same as `IsoGeometry.tileVerts` used by working VolumeOverlay); `rebuild()` for preview clones calls `show(tile)` directly; `_dragActive` suppresses `hide()` during gizmo move. *(9811adf)*

- **Bug 3b** — Linked walls displaced after grid size change. Root cause: `updateLinkedWallPositions` in `.then()` iterated stale tile refs captured before canvas reload during batch update; errors silently swallowed. Fix: re-fetch `canvas.tiles.placeables` fresh in `.then()`; surface errors via `console.warn`. *(9811adf, 6558cf9)*

- **Bug 3a** — Tiles lost height proportion after grid size change. Root cause: `boundHeightBase` not scaled in grid rescale. Fix: `onUpdateSceneGridRescale` now scales `boundHeightBase.w/h` by ratio alongside `x, y, width, height`. *(ddf5e84)*

---

## Resolved Bugs — 2026-06-18

- **B28** — Token elevation label visible through fog. Root cause: `placement.anchor` on the label is the elevated world position `(lx, ly)` — `isoRendererSightRefresh` tested that coordinate, which lies outside the fog map stored at ground level. Fix: added `testPoint: { x: tx + tw/2, y: ty + th/2 }` to label's `IsoRenderer.render()` call in `token-background.ts:140`. Shadow and indicator were already correct (shadow used its own ground anchor; indicator had `testPoint`). *(238d5d2)*

---

## Completed — 2026-06-18 (session 2)

### IsoRenderer Refactor — Phase 6 Occluder → lifecycle-integrated path *(from REFACTOR.md)*

- `Occluder` class replaced with module-level `evaluateAll()` + `activateLegacy()` in `occluder.ts`
- All boundary violations fixed: `canvas.grid.size` → `CanvasEnv.gridSize()`, `canvas.tiles/tokens` → `CanvasEnv`, `canvas.scene.getFlag` → `VolumeFlags.isSceneEnabled()`, `game.settings.get("occlusionOpacity")` → `VolumeFlags.getOcclusionOpacity()` (new static method)
- New `VolumeFlags.isNewOccluder()` reads hidden setting `isorollNewOccluder` (default false)
- `render-lifecycle.ts` calls `occluderEvaluateAll()` in `onTokenRefresh`/`onTileRefresh`/`onTokenDraw`/`onTokenDestroy` gated on `VolumeFlags.isNewOccluder()`
- Gate: `isorollNewOccluder=false` → old `activateLegacy()` hooks run; `=true` → lifecycle only. Enable via `game.settings.set("isoroll","isorollNewOccluder",true)` then reload.

### IsoRenderer Refactor — Phase 7: UI + Background boundary fixes *(from REFACTOR.md)*

- `bg-drag.ts`: `canvas.app!.stage.worldTransform` → `CanvasEnv.worldTransform()` (Phase 2 deferral)
- `bg-html.ts`: `canvas.scene` reads → `CanvasEnv.scene()`/`CanvasEnv.sceneFlag()`; PIXI stage traversal extracted to `BackgroundTransform.findGridConfigPreviewBg()` on the declared PIXI boundary file
- `tile-config.ts`: `canvas.tiles.get(id)` → `CanvasEnv.getTile(id)` (already existed in canvas-env)
- `token-config.ts`: `canvas.tokens.get(id)` → `CanvasEnv.getToken(id)` (new accessor added)
- `canvas-env.ts`: added `getToken(id: string): Token | undefined`
- `bg-transform.ts`: added `findGridConfigPreviewBg(): PIXI.Sprite | null` (same traversal already in `onRenderGridConfig` — extracted to avoid PIXI in non-boundary `bg-html.ts`)
- Verified: SceneConfig double-inject guard working (`tabContentExists` check in `tab-helpers.ts`) ✓

### Fix: GridConfig re-renders overlay visuals during session *(fix in render-lifecycle.ts + render-gate.ts)*

- `refreshToken` fires every animation tick, causing isoroll overlays to reappear after `onGridConfigOpen` cleared them
- Fix: `_gridConfigOpen` flag (bool) in `render-lifecycle.ts`; set `true` on `onGridConfigOpen`, `false` + `onCanvasReady()` on `onGridConfigClose()`
- Guards added to `onTokenRefresh`, `onTileRefresh`, `onTokenDraw`, `onTileDraw` — early return when `_gridConfigOpen`
- `closeGridConfig` hook wired in `render-gate.ts` → `onGridConfigClose()`

---

## Completed — 2026-06-18 (session 1)

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
