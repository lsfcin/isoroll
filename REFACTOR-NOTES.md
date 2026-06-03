# isoroll-module — Refactor Assessment

> Read-only review. No code changed. Priority order: highest structural impact first.

---

## Macro View

### Folder structure — good overall

| Folder | Purpose | Verdict |
|--------|---------|---------|
| `transform/` | Stage + object counter-transform, config tabs, ruler | Mostly cohesive |
| `volume/` | 3D box overlay, gizmo handles, flags, geometry helpers | Slightly bloated |
| `walls/` | Linked wall CRUD, overlay, history | Well split |
| `preset/` | Preset storage, application logic | Well split |
| `occluder/`, `resolver/`, `sorter/` | Single-concern micro-modules | Good |

### File size — acceptable, not ideal

```
221  object-transform.ts   ← over limit
215  gizmos.ts             ← over limit
199  canvas-transform.ts   ← borderline
198  background-gizmos.ts  ← borderline
```

The two over-limit files are fixable (see micro notes below).

### Module entry point — clean

`module.ts` is 43 lines and only wires up `activate()` calls. Good.

---

## Macro Issues

### M1 — Layer lifecycle duplicated across 7 classes ← biggest problem

Every overlay/gizmo class owns its own copy of these ~25 identical lines:

```ts
private static layer: PIXI.Container | null = null;
private static ensureLayer(): PIXI.Container { /* identical */ }
private static bringToTop(): void            { /* identical */ }
static clearAll(): void                      { /* near-identical */ }
static hide(id: string): void                { /* near-identical */ }
```

Affected classes: `VolumeOverlay`, `VolumeGizmos`, `TokenOverlay`, `TokenVolumeOverlay`,
`TokenVolumeGizmos`, `BackgroundGizmos`, `WallOverlay`.

**Fix:** Extract a `CanvasLayer` helper (could be a class, mixin, or factory function).
Something like:

```ts
// volume/canvas-layer.ts
export function createCanvasLayer(): {
  ensureLayer(): PIXI.Container;
  bringToTop(): void;
  clearLayer(): void;
} { ... }
```

This alone cuts ~100 lines of duplication and makes all overlays consistent.

### M2 — `isEnabled()` repeated in 7 classes

```ts
private static isEnabled(): boolean {
  return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
}
```

Exact copy in: `CanvasTransform`, `ObjectTransform`, `VolumeOverlay`, `VolumeGizmos`,
`TokenOverlay`, `TokenVolumeOverlay`, `TokenVolumeGizmos`.

**Fix:** Export `isSceneEnabled()` from `volume/flags.ts` (already the flag authority).

### M3 — `onCanvasReady` + `onUpdateScene` boilerplate repeated in every overlay

Every class registers:
```ts
Hooks.on("canvasReady",  ThisClass.clearAll);
Hooks.on("updateScene",  (scene) => { if (scene.id !== canvas.scene?.id) return; ThisClass.clearAll(); });
```

**Fix:** These two hooks could be handled by the `CanvasLayer` helper (M1 fix), reducing
each class's `activate()` to only the hooks unique to it.

### M4 — Responsibilities in `scene-config.ts` — three concerns in one file

The file:
1. Re-exports `registerRulerPatch` and `registerTileConfigHook` (barrel)
2. Owns `addIsorollTab` and `cbGroup` (shared UI helpers)
3. Registers `SceneConfig` tab (correct)
4. Registers `TokenConfig` tab (wrong place — should be `token-config.ts`)

**Fix:**
- Move `registerTokenConfigHook` to `token-config.ts` (mirrors the existing `tile-config.ts`)
- Move `addIsorollTab` + `cbGroup` to `ui-helpers.ts` so they're importable without pulling in scene-specific logic
- Remove the re-export barrel lines — callers can import directly

---

## Micro Issues

### m1 — `drawImageContour` duplicated in `VolumeOverlay` and `TokenOverlay`

`VolumeOverlay.drawImageContour()` (~30 lines) and `TokenOverlay.drawContour()` (~30 lines)
are identical in logic: read mesh properties, compute 4 corners, draw screen-adaptive dashed outline.

**Fix:** Move to `overlay-geometry.ts` as `drawMeshContour(g, mesh)` with a shared `MeshLike` type.

### m2 — `computeVerts` and `computeTokenVerts` nearly identical

In `overlay-geometry.ts` (lines 50–115). Only differences:
- Tile: `x/y = center`, size already in canvas px
- Token: `x/y = top-left`, size in grid units

The 45-line body is duplicated. Extract a common `buildBoxVerts(tx, ty, tw, th, E, EH, ex, ey)` that
both call after computing their specific inputs.

### m3 — `MeshLike` / `M` type defined 4 times inline

| File | Local name |
|------|-----------|
| `object-transform.ts:4` | `MeshLike` (exported) |
| `gizmos-drag.ts:41` | `M` (inline in `meshCorner`) |
| `overlay.ts:133` | `M` (inline in `drawImageContour`) |
| `token-overlay.ts:88` | `M` (inline in `drawContour`) |

These describe the same mesh interface. One canonical `PixiMeshLike` in a shared
`volume/types.ts` would do.

### m4 — `wrap()` duplicated in `WallManager` and `PresetManager`

```ts
// wall-manager.ts
function wrap(fn: () => Promise<void>, label: string): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), 0);
}

// preset-manager.ts — same but delay = 50ms
function wrap(fn: () => Promise<void>, label: string): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), 50);
}
```

**Fix:** Export `scheduleWrap(fn, label, delay = 0)` from a shared `util.ts`.

### m5 — Elevation-to-canvas conversion repeated everywhere

```ts
const E = elev * gs / gd;
```

This one-liner appears in: `object-transform.ts`, `overlay-geometry.ts`, `gizmos.ts`,
`token-volume-gizmos.ts`, `wall-core.ts`. No bug risk here, but a named helper
`elevToCanvas(elev, gs, gd)` would make the formula auditable in one place.

### m6 — Drag handler lifecycle repeated across 4 classes

`VolumeGizmos`, `TokenGizmos`, `TokenVolumeGizmos`, `BackgroundGizmos` all implement:
```ts
private static drag: SomeDragState | null = null;
private static readonly onMove = (e) => ThisClass.handleMove(e);
private static readonly onUp   = (e) => ThisClass.handleUp(e);
// beginDrag: addEventListener x2
// handleMove: if drag, commit
// handleUp: removeEventListener, commit
```

~20 lines × 4 classes = 80 lines of structural duplication.

**Fix:** A generic `startPointerDrag<T>(state: T, onCommit: (s: T, gx, gy) => void)` function
that handles the addEventListener/removeEventListener lifecycle and calls back.

### m7 — Debug log block duplicated in `VolumeOverlay` and `VolumeGizmos`

The `onRefreshTile` debug logging block (checking the global debug flag, printing
`id`, `preview`, `hasPreview`, `flags`, `doc`, `mesh` coords) is copy-pasted verbatim.

**Fix:** Extract `logRefreshTile(source: string, tile, flags)` into a debug util.

### m8 — `CanvasTransform` reaches into `BackgroundGizmos.getTempYScale()`

In `canvas-transform.ts:157`:
```ts
const bgYS = BackgroundGizmos.getTempYScale();
```

This creates a coupling from the core transform logic to the UI gizmos layer.
`CanvasTransform` now can't be understood or tested without `BackgroundGizmos`.

**Fix:** Pass `yScale` as a parameter to `applyBackground(yScale?: number)` or
expose a shared reactive state object that both read. The gizmo sets it; the transform reads it.

### m9 — `tAsT` cast in `token-gizmos.ts:60`

```ts
const tAsT = token as unknown as Tile;
const bl   = imageBLCorner(tAsT);
```

`imageBLCorner` (in `gizmos-drag.ts`) accepts `Tile` but only uses `tile.mesh`.
The cast exposes that the function signature is wrong.

**Fix:** Change `meshCorner` / `imageBLCorner` etc. to accept `{ mesh: unknown }` or
a `MeshHost` interface, so tokens and tiles both satisfy it without casting.

### m10 — `getProjection(canvas.scene)` called at every use site

`canvas.scene` is the only argument ever passed. The projection changes only on
`updateScene`. Having to pass it every time is noisy.

**Fix:** Add `currentProjection(): IsoProjection` (0-argument) alongside the
existing `getProjection()` in `constants.ts`. All in-canvas call sites switch to
`currentProjection()`; `getProjection` stays for preview overrides.

---

## Low Coupling — findings

| Pair | Verdict |
|------|---------|
| `CanvasTransform` → `BackgroundGizmos` | **Bad** (see m8) |
| `WallOverlay` → `wall-core`, `wall-overlay-ops` | Good (clean boundary) |
| `gizmos.ts` → `gizmos-drag.ts`, `gizmos-handles.ts` | Good (math + factory separated) |
| `preset-manager.ts` → `preset-ops.ts` | Good (pure dispatcher) |
| `VolumeOverlay` → `overlay-geometry.ts` | Good |

Only one real cross-layer coupling issue (M8 above).

---

## High Cohesion — findings

| File | Assessment |
|------|-----------|
| `gizmos-drag.ts` | High — drag math only |
| `gizmos-handles.ts` | High — PIXI handle factories only |
| `overlay-geometry.ts` | High — vertex math + draw primitives |
| `wall-manager.ts` | High — pure hook dispatcher |
| `preset-manager.ts` | High — pure hook dispatcher |
| `wall-ops.ts` | Moderate — mixes CRUD, transform, door behavior (194 lines) |
| `scene-config.ts` | **Low** — barrel + shared helpers + two unrelated hooks |
| `gizmos.ts` | Moderate — lifecycle + drag orchestration together (acceptable) |
| `background-gizmos.ts` | Moderate — mixes UI injection, event handlers, drag orchestration |

---

## Naming

- `asSD(scene)` in `preset-ops.ts` — too cryptic. Use `asSceneDoc`.
- `tAsT` — reveals design smell (see m9). Fix the root cause, not the name.
- `E`, `EH` — fine as locals (math convention), but `elevCanvasPx` / `topCanvasPx` would
  survive a future reader who doesn't know the projection model.
- `wrap()` — should be `scheduleWrap()` when exported, to signal it's async-and-deferred.
- `onMove` / `onUp` as static arrow fields — consistent and fine.

---

---

## Proposed Restructuring  ← supersedes S1–S5 below

> Target: 100–150 lines per file. Domain-first split. One clear concern per file.
> Estimates include only logic lines — boilerplate (imports, types, blank lines) adds ~15–25 lines.

### Domain map — where things go

```
src/
  module.ts              ~40 ln  ← entry point only, no logic
  flags.ts               ~75 ln  ← all module flag accessors (moved from volume/)

  math/
    projection.ts        ~95 ln  ← IsoProjection type, PROJECTION_TYPES, getProjection,
                                    currentProjection (0-arg shorthand)
    coords.ts            ~90 ln  ← BoxVerts, P types; computeVerts, computeTokenVerts,
                                    elevToCanvas helper

  draw/
    constants.ts         ~25 ln  ← ORANGE, BLACK, DASH_LEN, GAP_LEN, ALPHA_* constants
    shapes.ts            ~45 ln  ← drawDash, drawDashedContour (pure PIXI primitives,
                                    no domain knowledge)
    volume-box.ts        ~55 ln  ← drawBox, drawAnchorLine (uses BoxVerts from math/coords)
    contour.ts           ~50 ln  ← drawMeshContour (merged from overlay.ts +
                                    token-overlay.ts, was duplicated)

  render/
    layer-manager.ts     ~70 ln  ← PIXI layer registry + z-order policy. Central point
                                    for all overlay layer creation, bringToTop, clearAll.
                                    Exposes ensureLayer(key)/clearLayer(key)/enforceOrder().
                                    Eliminates the 7×duplicated ensureLayer/bringToTop.

  transform/
    stage-transform.ts   ~85 ln  ← canvas stage rotation/skew, apply/reset,
                                    previewOverride state, canvasReady/updateScene hooks
    bg-transform.ts      ~90 ln  ← background sprite counter-transform (capture,
                                    apply, reset, getBackground, setOutlineVisible)
                                    + onRenderGridConfig sprite-override hack
    object-transform.ts  ~130 ln ← per-tile and per-token mesh counter-transform,
                                    preUpdateScene grid-rescale. Stays unified (tile +
                                    token logic is symmetric, splitting would re-duplicate)
    ruler-patch.ts       ~80 ln  ← unchanged

  hud/
    hud-patches.ts       ~45 ln  ← TokenHUD reposition (from object-transform.ts)
                                    + TileHUD reposition stub (currently a no-op comment)
                                    Both small; one file justified.

  ui/
    tab-helpers.ts       ~55 ln  ← addIsorollTab, flagCheckbox (renamed from cbGroup)
                                    Pure HTML builders, no Foundry hook knowledge
    scene-config.ts      ~95 ln  ← registerSceneConfigHook only (projection UI,
                                    enable checkbox, preview sync)
    tile-config.ts       ~85 ln  ← registerTileConfigHook only (unchanged)
    token-config.ts      ~30 ln  ← registerTokenConfigHook (split from scene-config.ts)

  gizmos/
    handle-factories.ts  ~130 ln ← ALL PIXI handle factory fns: makeHandle,
                                    makeCircleHandle (renamed from makeElevHandle),
                                    makeSquareCounterHandle, makeFaceHandle,
                                    makeSwapHandle, makeMoveHandle, createRotateBlocker,
                                    bgCorner (moved from gizmos-handles.ts),
                                    drawDashedContour stays in draw/shapes.ts
    mesh-corners.ts      ~40 ln  ← imageBLCorner, imageTRCorner, imageBCCorner,
                                    imageTCCorner, clientToGlobal, snapQuarterPx,
                                    snapQuarterUnits. Shared by tile + token gizmos.

  tiles/
    tile-overlay.ts      ~80 ln  ← VolumeOverlay lifecycle + draw dispatch.
                                    Uses layer-manager for layer ops.
    tile-gizmos.ts       ~100 ln ← VolumeGizmos lifecycle + handle setup + swapSide.
                                    Uses layer-manager for layer ops.
    tile-drag.ts         ~130 ln ← DragState, HandleType, handleTypeMap,
                                    handlePositions, projectDrag, commitDrag.
                                    Tile-specific; token drag is inline in token-gizmos.ts.

  tokens/
    token-overlay.ts     ~110 ln ← TokenOverlay + TokenVolumeOverlay merged.
                                    One class, one layer, same 4 hooks.
                                    Shows image contour when showImageManip=true,
                                    3D box when showVolumeManip=true.
    token-gizmos.ts      ~120 ln ← TokenGizmos (image offset/scale/yScale handles).
                                    Uses layer-manager.
    token-elev-gizmo.ts  ~85 ln  ← TokenVolumeGizmos (elevation handle only).
                                    Kept separate: distinct drag state type,
                                    distinct visual + interaction concern.

  background/
    bg-gizmos.ts         ~135 ln ← BackgroundGizmos lifecycle, show(), scaleVerticalStep,
                                    HTML injection, event wiring. Uses layer-manager.
    bg-drag.ts           ~45 ln  ← BgDrag type + commitBgDrag. Small but semantically
                                    clean (pure drag math, no PIXI, no DOM).

  walls/
    wall-types.ts        ~33 ln  ← WallDef, WallConfig, DoorBehavior, TileAnchor (unchanged)
    wall-coords.ts       ~80 ln  ← TileDoc/WallDoc type aliases, wallsLayer()/scene()
                                    shims, tileRect, imageRect, anchorToCanvas,
                                    defToCanvas, canvasToAnchor
    wall-flags.ts        ~55 ln  ← getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls,
                                    getDoorBehavior, setDoorBehavior, hasLinkedDoor
                                    (split from wall-core.ts)
    wall-crud.ts         ~95 ln  ← generateBaseWallDefs, createWallsFromDefs,
                                    deleteLinkedWalls, generateBaseWalls,
                                    linkSelectedWalls, unlinkAllWalls,
                                    extractWallDefs, applyWallDefs
    wall-sync.ts         ~50 ln  ← updateLinkedWallPositions, flipLinkedWallAnchorsX
    wall-door.ts         ~25 ln  ← applyDoorBehavior, cycleDoorBehavior
                                    (yes, 25 lines — clean semantic unit, worth it)
    wall-history.ts      ~88 ln  ← unchanged
    wall-manager.ts      ~100 ln ← hook dispatcher. HUD rendering moves to hud/.
                                    onUpdateTile/onDeleteTile/onDeleteWall/
                                    onUpdateWall stay here.
    wall-overlay.ts      ~130 ln ← WallOverlay visualization + select mode.
                                    Uses layer-manager.
    wall-overlay-ops.ts  ~143 ln ← endpoint drag, line hover, select interaction,
                                    dblclick. At limit; could split to
                                    wall-endpoint-drag.ts (~80 ln) +
                                    wall-select-ops.ts (~65 ln) if needed.

  preset/
    preset-types.ts      ~41 ln  ← unchanged
    preset-storage.ts    ~116 ln ← unchanged (read/write/cache — single concern)
    preset-diff.ts       ~45 ln  ← changedFlagKeys, intersects, bgNativeChanged,
                                    tileNativeChanged, TILE/TOKEN/BG_PRESET_KEYS
    preset-apply.ts      ~90 ln  ← applyTile, applyToken, applyBackground,
                                    autoApplyTile, autoApplyToken, autoApplyBackground,
                                    autoApplyTileWalls, applyPresetToSource
    preset-upsert.ts     ~60 ln  ← upsertTile, upsertToken, upsertBackground,
                                    debounced, timer maps
    preset-manager.ts    ~90 ln  ← hook dispatcher (unchanged in role)

  occluder/occluder.ts   ~47 ln  ← unchanged
  sorter/depth-sorter.ts ~45 ln  ← unchanged
  resolver/asset-resolver.ts ~91 ln ← unchanged
```

### What drives each split decision

**`render/layer-manager.ts`** — The most impactful new file.
Currently layer ordering is implicit: whoever calls `bringToTop` last wins. `wall-overlay.ts`
even has a comment encoding the ordering dependency:
> "VolumeGizmos.bringToTop() runs on every refreshTile — stay above it by re-topping here.
> This handler registers after VolumeGizmos (WallManager activates last)."

`layer-manager.ts` makes the z-order declarative. All 7 overlay classes stop managing their
own PIXI.Container; they call `LayerManager.ensureLayer(key)` and `LayerManager.bringToTop(key)`.
Eliminates M1 (7× duplicated lifecycle) and makes rendering order auditable in one place.

**`math/` vs `draw/`** — Clean split: math files return numbers/objects, never touch PIXI.
Draw files receive computed values and write to `PIXI.Graphics`. No crossover.
`overlay-geometry.ts` currently does both; the split separates them.

**`hud/hud-patches.ts`** — HUD repositioning is a *patching* concern (we override Foundry's
default layout) not a transform concern. Moves `onRenderTokenHUD` out of `object-transform.ts`
and gives `onRenderTileHUD` (currently a no-op comment) a proper home.

**`bg-transform.ts` vs `stage-transform.ts`** — Stage and background transforms are applied
together (`applyCurrentState`) but their mechanics are independent. The GridConfig sprite-override
hack (`onRenderGridConfig`, ~55 lines of complex per-frame mutation) is background-specific and
sits awkwardly in `canvas-transform.ts`. Split makes each file readable on its own.
`stage-transform.ts` keeps `applyCurrentState` since it's the coordinator.

**`tokens/token-overlay.ts`** — Merges `TokenOverlay` + `TokenVolumeOverlay`. Rationale:
same hooks, same layer, same lifecycle, same entity. Separation was by visual concern ("image
contour" vs "3D box") but not by interaction pattern. One show() that conditionally draws both
based on `showImageManipulation` / `showVolumeManipulation` flags. Saves ~60 lines of lifecycle
duplication.

**`wall-door.ts` at 25 lines** — Small is fine. Door behavior is orthogonal to wall CRUD and
position sync. Easy to find when the concern is "how do doors affect tile visibility."

**`preset/preset-diff.ts`** — Change detection helpers and key lists are pure functions with
no side effects. Pulling them out makes `preset-apply.ts` and `preset-manager.ts` readable
without scrolling past detection infrastructure.

### Files that are NOT split

- `object-transform.ts` — Tile and token counter-transform stay together. The math is
  symmetric (same `getProjection` + `counterFactor` + `ratio`), same guard patterns,
  same grid-rescale hook. Splitting by entity here would re-duplicate the shared logic.
- `bg-drag.ts` — 45 lines. Small but clean: pure drag math, no PIXI, no DOM side effects.
  Mirrors the tile `tile-drag.ts` / gizmo split pattern.
- `preset-storage.ts` — 116 lines but single concern (read/write/cache). No split needed.

---

## File-split Semantics ← original analysis, superseded by section above

### S1 — `volume/` folder has three unrelated tenants

Folder name implies "3D bounding volume things." Actual contents:

| File(s) | True concern | Belongs in `volume/`? |
|---------|-------------|----------------------|
| `overlay.ts`, `gizmos.ts` | Tile visual overlays | Partly |
| `token-*.ts` (×4) | Token visual overlays + gizmos | Partly |
| `background-gizmos*.ts` (×2) | Background image handles in GridConfig | **No** — unrelated to volumes |
| `overlay-geometry.ts` | Shared math primitives | Yes |
| `flags.ts`, `settings.ts` | Module-wide flag/settings | **No** — imported by `transform/`, `walls/`, `preset/`, `occluder/` |
| `gizmos-handles.ts`, `gizmos-drag.ts` | Shared PIXI utilities | Shared, not folder-specific |

`flags.ts` is the worst offender: it's a module-level file living in a subsystem folder.
It should be `src/flags.ts`.

### S2 — Token concerns split across 4 files; tiles use 2

For tiles: `overlay.ts` (visuals) + `gizmos.ts` (interaction). Clean 2-file split.

For tokens:
```
token-overlay.ts         ← image contour only
token-volume-overlay.ts  ← 3D box only
token-gizmos.ts          ← image manipulation handles
token-volume-gizmos.ts   ← elevation handle only  (165 lines, one handle)
```

All four classes register the **same hooks**, manage the **same layer lifecycle**, fire on
the **same events** for the **same entity**. The "image vs volume" split added 2 files and
~100 lines of duplicated boilerplate without meaningful semantic gain.

**Fix:** Merge → `token-overlay.ts` (all token visuals) + `token-gizmos.ts` (all token
handles). Matches the tile pattern.

### S3 — `gizmos-handles.ts` and `gizmos-drag.ts` named as tile-specific, used as shared

`gizmos-handles.ts` imported by tile gizmos, token gizmos, token volume gizmos, AND
background gizmos. The name sounds tile-specific. Worse: `bgCorner` and `drawDashedContour`
(background-specific) live inside it.

`gizmos-drag.ts` mixes two groups:
- **Truly shared**: `clientToGlobal`, `imageBLCorner/TR/BC/TC`, `snapQuarterPx` — used by tile
  gizmos, token gizmos, token volume gizmos, background gizmos
- **Tile-specific**: `DragState`, `HandleType`, `handleTypeMap`, `handlePositions`,
  `projectDrag`, `commitDrag` — only used by `gizmos.ts`

These groups do not belong in the same file.

### S4 — `background-gizmos-drag.ts` is a mechanical split, not semantic

44-line file containing `BgDrag` type + `commitBgDrag`. Split purely to keep
`background-gizmos.ts` under 200 lines. With the `CanvasLayer` helper (M1), `background-gizmos.ts`
drops ~25 lines and can absorb its drag math back. No semantic reason to keep them apart.

### S5 — `overlay.ts` / `gizmos.ts` unnamed by entity

Class inside: `VolumeOverlay`, `VolumeGizmos` — but file is `overlay.ts`, `gizmos.ts`.
Token counterparts are `token-overlay.ts`, `token-gizmos.ts`.
The asymmetry makes grep/navigation harder than it should be.
**Fix:** Rename to `tile-overlay.ts`, `tile-gizmos.ts`.

### Ideal folder structure

```
src/
  flags.ts                    ← move out of volume/
  module.ts
  transform/                  ← unchanged
  shared/
    overlay-geometry.ts       ← unchanged
    handle-factories.ts       ← was gizmos-handles.ts
    drag-utils.ts             ← clientToGlobal + imageMeshCorner helpers + snap fns
                                 (split out of gizmos-drag.ts)
  tiles/
    tile-overlay.ts           ← was overlay.ts
    tile-gizmos.ts            ← was gizmos.ts
    tile-drag.ts              ← was gizmos-drag.ts (tile-specific parts only)
  tokens/
    token-overlay.ts          ← merge: token-overlay + token-volume-overlay
    token-gizmos.ts           ← merge: token-gizmos + token-volume-gizmos
  background/
    background-gizmos.ts      ← absorb background-gizmos-drag.ts
  walls/                      ← unchanged
  preset/                     ← unchanged
  occluder/ sorter/ resolver/ ← unchanged
```

---

## Naming — Standardization

### File names — consistent ✓

All files use kebab-case. No action needed.

### Class names — consistent ✓

All classes use PascalCase. No action needed.

### Private field naming — INCONSISTENT

`WallOverlay` uses underscore prefix for private statics (`_layer`, `_boxes`, `_ensureLayer`, `_bringToTop`).
Every other overlay class uses no prefix. Pick one and apply everywhere.

**Recommendation:** No prefix (matches TypeScript convention for `private`).
WallOverlay is the odd one out — drop its underscores.

### Map field name — INCONSISTENT across all overlay classes

| Class | Field name | Value type |
|-------|-----------|-----------|
| `VolumeOverlay` | `boxes` | `Map<string, PIXI.Graphics>` |
| `VolumeGizmos` | `sets` | `Map<string, PIXI.Container>` |
| `TokenOverlay` | `boxes` | `Map<string, PIXI.Graphics>` |
| `TokenVolumeOverlay` | `boxes` | `Map<string, PIXI.Graphics>` |
| `TokenVolumeGizmos` | `sets` | `Map<string, PIXI.Container>` |
| `WallOverlay` | `_boxes` | `Map<string, PIXI.Container>` |

`boxes` vs `sets` carries no semantic distinction — `WallOverlay._boxes` is a `Container`, not `Graphics`.
Once the `CanvasLayer` helper (M1) is extracted, this becomes one field with one name.

**Recommendation:** Name it `graphics` for `PIXI.Graphics` maps, `containers` for `PIXI.Container` maps.
Or just `items` uniformly in the base helper.

### Cryptic abbreviations — fix these

| Location | Name | Should be |
|----------|------|-----------|
| `preset-ops.ts:21` | `asSD(d)` | `asSceneDoc(d)` |
| `wall-manager.ts:109` | `tt` (i18n localize shortcut) | `loc` or `t18n` — or inline `game.i18n.localize` |
| `wall-manager.ts:108` | `wc` (wall count) | `wallCount` |
| `wall-overlay.ts:175` | `la` (line alpha) | `alpha` |
| `scene-config.ts:55` | `cbGroup(...)` | `flagCheckbox(...)` |
| `background-gizmos-drag.ts:19` | `el(n)` | `getField(n)` |
| `background-gizmos-drag.ts:20` | `fire(n)` | `dispatchChange(n)` |
| `background-gizmos.ts:115` | `getEl(n)` | `getField(n)` — same thing, different name! |
| `overlay-geometry.ts:28` | `pt(x, y)` | `vec2(x, y)` or `point(x, y)` |

The `el` / `getEl` inconsistency is the worst: same one-liner, two different names, in files
that are tightly coupled.

### Math locals — tolerable but worth a note

These appear in 6+ files each:

| Name | Meaning | Verdict |
|------|---------|---------|
| `gs` | `canvas.grid.size` | OK as local |
| `gd` | `canvas.scene.grid.distance` | OK as local |
| `E` | elevation in canvas px | Borderline — `elevPx` clearer |
| `EH` | elevation + boundH in canvas px | `topElevPx` or `topPx` clearer |
| `hdx`, `hdy` | height direction vector components | OK with the prefix convention |
| `m` | `worldTransform` matrix | Overloaded — same name used in both `canvas-transform.ts` (the transform itself) and every drag file (the matrix). `wt` (world transform) used in overlay files. Pick `wt` everywhere. |

`m` vs `wt` for the worldTransform matrix: used as `m` in `object-transform.ts`, `token-gizmos.ts`,
`background-gizmos-drag.ts`, `wall-overlay-ops.ts`; used as `wt` in `overlay.ts`, `token-overlay.ts`.
**Pick `wt` everywhere** — more descriptive, less collision risk with generic `m`.

### `commit` vs `commitDrag` — inconsistent pattern

| Class | Method name | Notes |
|-------|------------|-------|
| `VolumeGizmos` | delegates to `commitDrag(drag, gx, gy)` | exported function |
| `TokenGizmos` | `private static commit(drag, gx, gy)` | private method |
| `TokenVolumeGizmos` | `private static commit(drag, gy)` | private method (only y!) |
| `BackgroundGizmos` | `private static commit(drag, gx, gy)` | private method |

All should be named `commitDrag`. The `TokenVolumeGizmos` version takes only `gy` — that's
fine domain-wise (elevation only uses vertical) but the name should still match the pattern.

### `makeElevHandle` — misleading name

`makeElevHandle` in `gizmos-handles.ts` is the counter-transformed circle used for:
- elevation handle (orange, `n-resize`)
- image offset handle (white, `move`)
- background translate handle (white, `move`)

It's not "elevation handle" — it's "counter-transformed circle handle". The elevation one
is just one use case.

**Recommendation:** Rename to `makeCircleHandle(color, cursor)`. The elevation semantic
belongs at the call site, not the factory.

### `applyTileCounter` — undescriptive

In `object-transform.ts:20`. "Counter" is jargon that requires knowing the domain.

**Recommendation:** `applyTileCounterTransform` — one extra word, full clarity.

### `onRenderTileHUD` in `WallManager` — name doesn't match behavior

The method name suggests it just handles a render event. It actually:
1. Removes and re-adds all isoroll buttons
2. Wires click handlers for generate/unlink/delete/door/select actions

**Recommendation:** `setupTileHUD` — matches what `tile-config.ts` does with `registerTileConfigHook` (which is also "setup on render").

---

## Priority Refactor Hits (if doing one pass)

1. **Extract `CanvasLayer` helper** — eliminates ~100 lines across 7 classes (M1+M3)
2. **Export `isSceneEnabled()` from `flags.ts`** — trivial, 7 copies gone (M2)
3. **Move `drawMeshContour` to `overlay-geometry.ts`** — removes `VolumeOverlay`/`TokenOverlay`
   duplication and gets `gizmos.ts` under 200 lines (m1)
4. **Merge `computeVerts`/`computeTokenVerts` bodies** — shared inner function (m2)
5. **Fix `scene-config.ts` cohesion** — split out `token-config.ts`, `ui-helpers.ts` (M4)
6. **Fix `imageBLCorner` signature** — accept mesh host, remove `tAsT` hack (m9)
7. **Export shared `MeshLike` type** — one definition, four imports (m3)
8. **Export `scheduleWrap` util** — trivial, two duplicates gone (m4)
9. **Decouple `CanvasTransform` from `BackgroundGizmos`** — pass yScale explicitly (m8)
