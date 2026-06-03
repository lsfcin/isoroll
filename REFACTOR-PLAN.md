# isoroll-module — Incremental Refactor Plan

> Branch: `feature-full-refactor`
> Strategy: one atomic step at a time. Each step = one commit. I implement, you test, we advance.
> No step changes behavior AND structure simultaneously.

---

## How we work

After each step I will:
1. Implement the change
2. List exactly what to test in Foundry
3. Wait for your go/no-go before the next step

**Risk levels:**
- 🟢 Low — new file, pure extraction, or import rename only
- 🟡 Medium — splits/merges of active hook code
- 🔴 High — changes execution flow (decouple, merge classes)

---

## Phase 0 — Infrastructure additions
> New files only. No callers yet. No Foundry testing needed — just TypeScript compile.

### Step 0.1 🟢 — Create `src/util.ts`
**What:** Extract `scheduleWrap(fn, label, delay=0)` as a shared utility.
Currently copy-pasted in `wall-manager.ts` (delay 0ms) and `preset-manager.ts` (delay 50ms).
**Files created:** `src/util.ts`
**Files changed:** none yet (callers updated in Phase 1)
**Test:** `tsc --noEmit` passes

---

### Step 0.2 🟢 — Create `render/layer-manager.ts`
**What:** Central PIXI layer registry. Replaces 7× duplicated `ensureLayer` / `bringToTop` / `clearAll`.
Exposes:
```ts
LayerManager.ensureLayer(key: string): PIXI.Container
LayerManager.bringToTop(key: string): void
LayerManager.clearLayer(key: string): void
LayerManager.clearAll(): void
LayerManager.declareOrder(keys: string[]): void  // z-order policy
```
**Files created:** `src/render/layer-manager.ts`
**Files changed:** none yet (callers updated in Phase 4)
**Test:** `tsc --noEmit` passes

---

### Step 0.3 🟢 — Create `draw/constants.ts`
**What:** Extract all visual constants from `volume/overlay-geometry.ts`:
`ORANGE`, `BLACK`, `DASH_LEN`, `GAP_LEN`, `ALPHA_BOX`, `ALPHA_CONTOUR`, `ALPHA_ANCHOR`.
**Files created:** `src/draw/constants.ts`
**Files changed:** none yet
**Test:** `tsc --noEmit` passes

---

## Phase 1 — Trivial cross-file fixes
> Single-line changes, import updates only. No behavior change.

### Step 1.1 🟢 — Export `isSceneEnabled()` from `volume/flags.ts`
**What:** Add one function to `VolumeFlags`:
```ts
static isSceneEnabled(): boolean {
  return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
}
```
Currently inlined as `isEnabled()` in 7 classes.
**Files changed:** `src/volume/flags.ts` (add 3 lines)
**Test:** tsc only

---

### Step 1.2 🟢 — Replace all 7 `isEnabled()` with `VolumeFlags.isSceneEnabled()`
**What:** Remove private `isEnabled()` from each class; use the shared export.
Affected: `CanvasTransform`, `ObjectTransform`, `VolumeOverlay`, `VolumeGizmos`,
`TokenOverlay`, `TokenVolumeOverlay`, `TokenVolumeGizmos`.
**Files changed:** 7 files (import + one call site each)
**Test in Foundry:**
- Enable isoroll on a scene → tiles/tokens should have transforms applied
- Disable isoroll → everything flat
- Switch scenes → re-enable on new scene works

---

### Step 1.3 🟢 — Replace `wrap()` in `wall-manager.ts` with `scheduleWrap`
**Files changed:** `src/walls/wall-manager.ts`
**Test in Foundry:**
- Generate base walls on a tile → walls appear
- Delete tile → linked walls deleted
- Drag tile → walls follow

---

### Step 1.4 🟢 — Replace `wrap()` in `preset-manager.ts` with `scheduleWrap`
**Files changed:** `src/preset/preset-manager.ts`
**Test in Foundry:**
- Apply a preset to a tile → settings update
- Debounce doesn't fire early

---

## Phase 2 — Math/draw extraction
> Extract shared utilities into new files; update all callers. No logic change.

### Step 2.1 🟢 — Create `draw/shapes.ts` — shared dash drawing
**What:** Extract `drawDash` + `drawDashedContour` from `volume/overlay-geometry.ts`.
Also moves `drawDashedContour` out of `volume/gizmos-handles.ts` (same function, different file).
**Files created:** `src/draw/shapes.ts`
**Files changed:** `volume/overlay-geometry.ts` (remove + import), `volume/gizmos-handles.ts` (remove + import)
**Test in Foundry:**
- Select a tile with isoroll enabled → dashed contour visible
- Background gizmo shows dashed outline in GridConfig

---

### Step 2.2 🟡 — Create `draw/contour.ts` — unified `drawMeshContour`
**What:** `VolumeOverlay.drawImageContour()` and `TokenOverlay.drawContour()` are identical logic.
Extract to `drawMeshContour(g: PIXI.Graphics, mesh: MeshLike): void`.
Introduce shared `MeshLike` interface (replaces 4 inline `M` type definitions).
**Files created:** `src/draw/contour.ts`
**Files changed:** `volume/overlay.ts`, `volume/token-overlay.ts` (remove local duplicates, import)
**Test in Foundry:**
- Select tile with "show image manipulation" enabled → image contour outline visible, correct shape
- Select token with image manipulation enabled → same

---

### Step 2.3 🟢 — Create `gizmos/mesh-corners.ts`
**What:** Extract from `volume/gizmos-drag.ts`:
`clientToGlobal`, `imageBLCorner`, `imageTRCorner`, `imageBCCorner`, `imageTCCorner`,
`snapQuarterPx`, `snapQuarterUnits`.
Fix `imageBLCorner` etc. to accept `{ mesh: unknown }` instead of `Tile` — removes `tAsT` cast
in `token-gizmos.ts`.
**Files created:** `src/gizmos/mesh-corners.ts`
**Files changed:** `volume/gizmos-drag.ts` (remove exported, import from new file),
`volume/token-gizmos.ts` (remove `tAsT` cast), `volume/background-gizmos.ts` (update import)
**Test in Foundry:**
- Drag tile volume handles → positions correct
- Drag token image handles → positions correct
- Drag background gizmo → works

---

### Step 2.4 🟢 — Create `ui/tab-helpers.ts`
**What:** Extract `addIsorollTab` and `cbGroup` from `transform/scene-config.ts`.
Rename `cbGroup` → `flagCheckbox` here.
**Files created:** `src/ui/tab-helpers.ts`
**Files changed:** `transform/scene-config.ts` (remove + import),
`transform/tile-config.ts` (update import if used)
**Test in Foundry:**
- Open SceneConfig → isoroll tab appears, all checkboxes work
- Open TileConfig → isoroll tab appears

---

## Phase 3 — File splits
> One file becomes N files. All existing behavior preserved.

### Step 3.1 🟡 — Split `transform/scene-config.ts` → extract `ui/token-config.ts`
**What:** Move `registerTokenConfigHook` + its i18n key lists to its own file.
`scene-config.ts` becomes SceneConfig-only.
**Files created:** `src/ui/token-config.ts`
**Files changed:** `transform/scene-config.ts` (remove registerTokenConfigHook),
`src/module.ts` (add `TokenConfig.activate()` call — or wire from scene-config.ts)
**Test in Foundry:**
- Open TokenConfig → isoroll tab present, all token height/offset fields work

---

### Step 3.2 🔴 — Split `transform/canvas-transform.ts` → `stage-transform.ts` + `bg-transform.ts`
**What:** `canvas-transform.ts` has two distinct concerns:
- Stage rotation + skew + previewOverride (`CanvasTransform`)
- Background sprite counter-transform + GridConfig sprite-override hack

Split into:
- `transform/stage-transform.ts` — `CanvasTransform` class
- `transform/bg-transform.ts` — `BackgroundTransform` class (the onRenderGridConfig hack lives here)
`applyCurrentState()` stays in stage-transform.ts as coordinator; calls bg-transform.

**Files created:** `transform/stage-transform.ts`, `transform/bg-transform.ts`
**Files deleted:** `transform/canvas-transform.ts`
**Files changed:** `src/module.ts` (update activate calls), all files that import canvas-transform
**Test in Foundry (thorough — this is critical path):**
- Scene opens → stage rotation/skew applied correctly
- Open GridConfig → background moves with handles, counter-transform applied
- Background yScale dragging works in GridConfig
- Scene config preview updates transform live
- Close GridConfig → everything back to normal

---

### Step 3.3 🟡 — Extract `hud/hud-patches.ts` from `transform/object-transform.ts`
**What:** `onRenderTokenHUD` is HUD patching, not a transform concern.
Move it to `src/hud/hud-patches.ts`. Register its hook from there.
**Files created:** `src/hud/hud-patches.ts`
**Files changed:** `transform/object-transform.ts` (remove method + hook registration),
`src/module.ts` (add `HudPatches.activate()`)
**Test in Foundry:**
- Move a token → HUD repositions correctly (aligns with isometric position, not screen-center)

---

### Step 3.4 🟡 — Split `walls/wall-core.ts` → `walls/wall-coords.ts` + `walls/wall-flags.ts`
**What:** `wall-core.ts` has two distinct concerns:
- Coordinate functions + type aliases + shims → `wall-coords.ts`
- Flag accessors (getLinkedWallIds, getDoorBehavior etc.) → `wall-flags.ts`
**Files created:** `walls/wall-coords.ts`, `walls/wall-flags.ts`
**Files deleted:** `walls/wall-core.ts`
**Files changed:** `walls/wall-manager.ts`, `walls/wall-ops.ts`, `walls/wall-overlay.ts`,
`walls/wall-overlay-ops.ts`, `walls/wall-history.ts` (update imports)
**Test in Foundry:**
- Generate base walls → appear
- Move tile → walls follow
- Door state changes → behavior applies

---

### Step 3.5 🟡 — Split `walls/wall-ops.ts` → `wall-crud.ts` + `wall-sync.ts` + `wall-door.ts`
**What:**
- `wall-crud.ts` — generateBaseWalls, deleteLinkedWalls, generateBaseWallDefs, createWallsFromDefs,
  linkSelectedWalls, unlinkAllWalls, extractWallDefs, applyWallDefs
- `wall-sync.ts` — updateLinkedWallPositions, flipLinkedWallAnchorsX
- `wall-door.ts` — applyDoorBehavior, cycleDoorBehavior
**Files created:** `walls/wall-crud.ts`, `walls/wall-sync.ts`, `walls/wall-door.ts`
**Files deleted:** `walls/wall-ops.ts`
**Files changed:** `walls/wall-manager.ts`, `walls/wall-history.ts` (update imports)
**Test in Foundry:**
- Generate base walls, move tile (sync), flip tile (flipAnchorsX), delete linked walls
- Toggle door open/closed → behavior toggles
- Undo (Ctrl+Z) → wall history works

---

## Phase 4 — Layer manager adoption
> Wire each overlay/gizmo class to `LayerManager` one at a time.
> Each step: remove `layer`, `ensureLayer`, `bringToTop` from the class; use `LayerManager` instead.
> After all 7: declare z-order policy in LayerManager.

### Step 4.1 🟡 — Wire `VolumeGizmos` → LayerManager
**What:** Remove private `layer`, `ensureLayer()`, `bringToTop()` from `VolumeGizmos`.
Use `LayerManager.ensureLayer("volume-gizmos")` and `LayerManager.bringToTop("volume-gizmos")`.
`clearAll()` calls `LayerManager.clearLayer("volume-gizmos")`.
**Files changed:** `volume/gizmos.ts`, `render/layer-manager.ts` (add key constant)
**Test in Foundry:**
- Select tile with isoroll enabled → gizmo handles appear
- Drag width/height/elevation handles → values update
- Deselect → handles disappear
- Canvas ready (scene switch) → no ghost handles

---

### Step 4.2 🟡 — Wire `VolumeOverlay` → LayerManager
**Files changed:** `volume/overlay.ts`
**Test in Foundry:**
- Select tile → 3D box outline visible
- Elevation/height gizmo drag → box redraws correctly

---

### Step 4.3 🟡 — Wire `TokenGizmos` → LayerManager
**Files changed:** `volume/token-gizmos.ts`
**Test in Foundry:**
- Select token with image manipulation enabled → handles appear
- Drag offset/scale handles → token updates

---

### Step 4.4 🟡 — Wire `TokenVolumeGizmos` → LayerManager
**Files changed:** `volume/token-volume-gizmos.ts`
**Test in Foundry:**
- Select token with volume manipulation enabled → orange elevation circle appears
- Drag elevation → token moves vertically

---

### Step 4.5 🟡 — Wire `TokenOverlay` → LayerManager
**Files changed:** `volume/token-overlay.ts`
**Test in Foundry:**
- Select token → image contour outline visible (if showImageManipulation=true)

---

### Step 4.6 🟡 — Wire `TokenVolumeOverlay` → LayerManager
**Files changed:** `volume/token-volume-overlay.ts`
**Test in Foundry:**
- Select token → 3D volume box visible (if showVolumeManipulation=true)

---

### Step 4.7 🟡 — Wire `BackgroundGizmos` → LayerManager
**Files changed:** `volume/background-gizmos.ts`
**Test in Foundry:**
- Open GridConfig → background gizmo handles appear
- Drag handles → background adjusts
- Close GridConfig → handles disappear

---

### Step 4.8 🔴 — Wire `WallOverlay` → LayerManager + declare z-order
**What:** This is the payoff step. Wire `WallOverlay`. Then add:
```ts
LayerManager.declareOrder([
  "volume-overlay", "volume-gizmos",
  "token-overlay", "token-volume-overlay",
  "token-gizmos", "token-volume-gizmos",
  "bg-gizmos",
  "wall-overlay",   // must be on top — declared last
]);
```
Remove the fragile z-order comment from `wall-overlay.ts`.
**Files changed:** `walls/wall-overlay.ts`, `render/layer-manager.ts`, `src/module.ts`
(LayerManager.declareOrder called after all activate())
**Test in Foundry (critical — z-order validation):**
- Select tile with walls → wall overlay renders ABOVE gizmos and 3D box
- Drag tile → walls follow, still on top
- Move a wall endpoint → wall redraws above gizmos
- Multiple tiles selected in sequence → layers don't bleed

---

## Phase 5 — File merges
> Combine over-split files. Biggest gain: token overlay pair.

### Step 5.1 🔴 — Merge `token-overlay.ts` + `token-volume-overlay.ts` → `tokens/token-overlay.ts`
**What:** Both classes register identical hooks, identical layer lifecycle, same entity.
Merge into one `TokenOverlay` class with one `show()` that conditionally draws image contour
(when `showImageManipulation=true`) and/or 3D box (when `showVolumeManipulation=true`).
**Files created:** `src/tokens/token-overlay.ts`
**Files deleted:** `volume/token-overlay.ts`, `volume/token-volume-overlay.ts`
**Files changed:** `src/module.ts` (remove one activate call),
`volume/token-gizmos.ts`, `volume/token-volume-gizmos.ts` (update import if any)
**Test in Foundry:**
- Token with showImageManipulation=true → contour visible
- Token with showVolumeManipulation=true → 3D box visible
- Both true → both visible
- Select/deselect → clears correctly
- Scene switch → all cleared

---

### Step 5.2 🟡 — Move `token-gizmos.ts` + `token-volume-gizmos.ts` → `tokens/`
**What:** No merge — keep separate classes (different drag types, different concerns).
Just move files and update imports.
**Files moved:** → `src/tokens/token-gizmos.ts`, `src/tokens/token-elev-gizmo.ts`
(rename token-volume-gizmos to token-elev-gizmo — more descriptive)
**Files deleted:** `volume/token-gizmos.ts`, `volume/token-volume-gizmos.ts`
**Files changed:** `src/module.ts`
**Test in Foundry:**
- Token image handles work
- Token elevation handle works

---

### Step 5.3 🟡 — Move background files → `background/`
**What:** Move `volume/background-gizmos.ts` → `background/bg-gizmos.ts`.
Absorb `volume/background-gizmos-drag.ts` back into `bg-gizmos.ts`
(was split only to hit 200-line limit; Phase 0.2 reduced it enough to re-merge).
**Files created:** `src/background/bg-gizmos.ts`, `src/background/bg-drag.ts`
**Files deleted:** `volume/background-gizmos.ts`, `volume/background-gizmos-drag.ts`
**Files changed:** `transform/canvas-transform.ts` (or `bg-transform.ts` after Step 3.2),
`src/module.ts`
**Test in Foundry:**
- GridConfig background gizmo fully functional

---

## Phase 6 — Volume folder cleanup
> Rename remaining volume/ files to their semantic homes.

### Step 6.1 🟢 — Rename `volume/overlay.ts` → `tiles/tile-overlay.ts`
**Files moved:** `src/tiles/tile-overlay.ts`
**Files changed:** `src/module.ts`, any other importers
**Test in Foundry:** Select a tile → 3D box shows

### Step 6.2 🟢 — Rename `volume/gizmos.ts` → `tiles/tile-gizmos.ts`
**Files moved:** `src/tiles/tile-gizmos.ts`
**Files changed:** `src/module.ts`
**Test in Foundry:** Tile gizmo handles work

### Step 6.3 🟢 — Move `volume/gizmos-drag.ts` (tile parts) → `tiles/tile-drag.ts`
**What:** After Step 2.3, `gizmos-drag.ts` contains only tile-specific drag logic:
`DragState`, `HandleType`, `handleTypeMap`, `handlePositions`, `projectDrag`, `commitDrag`.
Rename file to reflect that.
**Files moved:** `src/tiles/tile-drag.ts`
**Files changed:** `tiles/tile-gizmos.ts`
**Test in Foundry:** All tile drag handles work

### Step 6.4 🟢 — Move `volume/gizmos-handles.ts` → `gizmos/handle-factories.ts`
**What:** After Step 2.3, this file has only PIXI factory functions.
Name "gizmos-handles" implies tile-specific; "handle-factories" is accurate.
**Files moved:** `src/gizmos/handle-factories.ts`
**Files changed:** all importers (tile-gizmos, token-gizmos, token-elev-gizmo, bg-gizmos)
**Test in Foundry:** All handle types render correctly

### Step 6.5 🟡 — Move `volume/flags.ts` → `src/flags.ts`
**What:** `flags.ts` is a module-wide file. Imported by transform/, walls/, preset/, occluder/.
Moving it out of volume/ removes an incorrect naming signal.
**Files moved:** `src/flags.ts`
**Files deleted:** `volume/flags.ts`
**Files changed:** all importers (~15 files) — pure path update
**Test in Foundry:**
- Enable/disable isoroll → all flags still read correctly
- Tile/token height flags → gizmos respond

---

## Phase 7 — Coupling + naming fixes
> Fix the one real cross-layer coupling and clean up naming debt.

### Step 7.1 🔴 — Decouple `CanvasTransform` from `BackgroundGizmos`
**What:** `canvas-transform.ts:157` calls `BackgroundGizmos.getTempYScale()`.
Core transform should not depend on UI gizmos.
Fix: expose a shared reactive state `BgYScaleOverride` (a simple mutable ref in `bg-transform.ts`
or a dedicated `render/preview-state.ts`). BackgroundGizmos writes it; BgTransform reads it.
**Files changed:** `transform/canvas-transform.ts` (or `stage-transform.ts` post 3.2),
`volume/background-gizmos.ts` (or `background/bg-gizmos.ts` post 5.3)
**Test in Foundry:**
- Open GridConfig → drag background Y scale → live preview updates correctly

---

### Step 7.2 🟢 — Drop `_` prefixes from `WallOverlay` private statics
**What:** `_layer`, `_boxes`, `_selectTile`, `_altMode`, `_pendingRefresh`, `_rafId`,
`_ensureLayer`, `_bringToTop`, `_drawDisplay`, `_drawSelect`, `_setAltMode`
→ drop the underscore (TypeScript `private` makes it unnecessary).
**Files changed:** `walls/wall-overlay.ts`
**Test in Foundry:** Wall overlay still renders; select mode works

---

### Step 7.3 🟢 — Rename cryptic abbreviations (batch)
**What:**
| File | Old | New |
|------|-----|-----|
| `preset-ops.ts` | `asSD(d)` | `asSceneDoc(d)` |
| `wall-manager.ts` | `tt` | `loc` |
| `wall-manager.ts` | `wc` | `wallCount` |
| `wall-overlay.ts` | `la` | `alpha` |
| `background-gizmos-drag.ts` | `el(n)` | `getField(n)` |
| `background-gizmos-drag.ts` | `fire(n)` | `dispatchChange(n)` |
| `background-gizmos.ts` | `getEl(n)` | `getField(n)` |
| `overlay-geometry.ts` | `pt(x,y)` | `vec2(x,y)` |

**Files changed:** 5 files
**Test in Foundry:** Smoke test — enable scene, select tile, wall overlay

---

### Step 7.4 🟢 — Rename `makeElevHandle` → `makeCircleHandle`
**What:** `makeElevHandle` is used for elevation, image offset, and background translate.
It's not "elev" — it's a counter-transformed circle with configurable color/cursor.
Rename the factory; update all call sites.
**Files changed:** `gizmos/handle-factories.ts` (or current gizmos-handles.ts),
`tiles/tile-gizmos.ts`, `tokens/token-gizmos.ts`, `tokens/token-elev-gizmo.ts`,
`background/bg-gizmos.ts`
**Test in Foundry:** All circle handles appear and respond

---

### Step 7.5 🟢 — Standardize `wt` for worldTransform matrix (batch rename)
**What:** `m` used in `object-transform.ts`, `token-gizmos.ts`, `background-gizmos-drag.ts`,
`wall-overlay-ops.ts`. `wt` used in `overlay.ts`, `token-overlay.ts`. Standardize to `wt`.
**Files changed:** 4 files
**Test in Foundry:** Transform correctness — tile/token positions unchanged

---

## Phase 8 — Preset splitting

### Step 8.1 🟢 — Extract `preset/preset-diff.ts`
**What:** From `preset-ops.ts`, extract: change detection helpers, key lists
(`TILE_PRESET_KEYS`, `TOKEN_PRESET_KEYS`, `BG_PRESET_KEYS`), `changedFlagKeys`,
`intersects`, `bgNativeChanged`, `tileNativeChanged`.
Pure functions, no side effects.
**Files created:** `preset/preset-diff.ts`
**Files changed:** `preset/preset-ops.ts`, `preset/preset-manager.ts`
**Test in Foundry:** Preset application detects changes correctly

---

### Step 8.2 🟢 — Extract `preset/preset-upsert.ts`
**What:** From `preset-ops.ts`, extract: debounce infrastructure, `upsertTile`,
`upsertToken`, `upsertBackground`.
**Files created:** `preset/preset-upsert.ts`
**Files changed:** `preset/preset-ops.ts`, `preset/preset-manager.ts`
**Test in Foundry:** Modifying a tile updates preset (debounced upsert fires)

---

### Step 8.3 🟢 — Extract `preset/preset-apply.ts`
**What:** From `preset-ops.ts`, extract: `applyTile`, `applyToken`, `applyBackground`,
`autoApplyTile`, `autoApplyToken`, `autoApplyBackground`, `autoApplyTileWalls`,
`applyPresetToSource`.
**Files created:** `preset/preset-apply.ts`
**Files changed:** `preset/preset-ops.ts` (now only shims remain → tiny)
**Test in Foundry:** Apply a saved preset to a tile → all flags update correctly

---

## Phase 9 — Math folder (optional, lowest priority)

### Step 9.1 🟢 — Create `math/projection.ts`
**What:** Move `IsoProjection`, `PROJECTION_TYPES`, `getProjection` from
`transform/constants.ts`. Add `currentProjection()` (0-argument shorthand for
`getProjection(canvas.scene)`). Update all ~10 call sites to use `currentProjection()`.
**Files created:** `src/math/projection.ts`
**Files changed:** `transform/constants.ts` (re-export or delete), all callers
**Test in Foundry:** All projections (dimetric, trimetric, custom) apply correctly

---

### Step 9.2 🟢 — Create `math/coords.ts`
**What:** Move `BoxVerts`, `P`, `computeVerts`, `computeTokenVerts` from
`volume/overlay-geometry.ts`. Merge `computeVerts` / `computeTokenVerts` bodies
into a shared `buildBoxVerts(tx, ty, tw, th, E, EH, ex, ey)` (m2 fix).
**Files created:** `src/math/coords.ts`
**Files changed:** `volume/overlay-geometry.ts`
**Test in Foundry:** Tile and token 3D box overlays render correctly

---

## Summary table

| Phase | Steps | Risk | Main gain |
|-------|-------|------|-----------|
| 0 — Infrastructure | 3 | 🟢 | New files, no callers |
| 1 — Trivial fixes | 4 | 🟢 | Eliminate M2 + m4 duplications |
| 2 — Draw extraction | 4 | 🟢/🟡 | Eliminate m1 + m3 duplications |
| 3 — File splits | 5 | 🟡/🔴 | Eliminate M4, clean transform domain |
| 4 — Layer manager | 8 | 🟡/🔴 | Eliminate M1+M3, fix z-order |
| 5 — Merges | 3 | 🟡/🔴 | Eliminate S2 token split waste |
| 6 — Volume cleanup | 5 | 🟢/🟡 | Eliminate S3+S5 naming mismatch |
| 7 — Coupling/naming | 5 | 🟢/🔴 | Fix m8, naming debt |
| 8 — Preset split | 3 | 🟢 | Eliminate S2 for preset domain |
| 9 — Math folder | 2 | 🟢 | Fix m2 + m10 |
| **Total** | **42** | | |

> We are on **Step 0.1** next.
