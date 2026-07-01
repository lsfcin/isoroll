# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

## B2 — Tile position jumps on grid size change

**Symptom:** When grid size changes (e.g. via GridConfig), tokens and walls reposition
consistently to maintain their grid-unit position. Tiles jump to a wrong position. Moving
the tile afterward snaps linked walls back to the tile correctly (walls track the correct
position; the tile is the one that jumps).

**Note:** Foreground tile behavior was intentionally designed to hold pixel size through
grid rescales (unlike tokens which scale). The POSITION should still follow the same
rescale logic as tokens/walls — only SIZE should be stable.

**Affected:** `onPreUpdateScene` / `onUpdateSceneGridRescale` in `object-transform.ts`.

---

## B25 — imageOffset anchor not refreshed on the spot when flag changes

**Symptom:** After changing `imageOffset` (via drag or TileConfig form), the tile mesh
anchor and position are not always updated immediately. The change is correct after a
manual tile re-select or scene reload.

**Root cause:** `tile.document.setFlag(MODULE_ID, "imageOffset", ...)` sends a document
update where `changed` only contains `flags.*`. Foundry's `Tile._onUpdate` sets render
flags only for `x`, `y`, `width`, `height`, `rotation`, etc. — flag-only updates set no
render flags, so `refreshTile` hook never fires and our `onRefreshTile` is not called.

A partial fix (`onUpdateTileFlags` in `tile-transform.ts`) detects isoroll flag changes
and manually sets `renderFlags.set({ refreshMesh: true })` to trigger the hook. However
the imgOff→anchor mapping has a coordinate-space subtlety: `imgOff` is stored as a
WORLD-space displacement normalized by gridSize (anchor moves to `baseCenterWorld + imgOff
* gridSize`), and correctly expressing it in IMAGE [0,1]² space to update the anchor
in-place requires a two-point `transformCoord` difference. Not worth the complexity now.

**Workaround:** Re-select the tile after changing imageOffset.

---

## B26 — Fog extraction ImageData zero-width crash on tile hover

**Symptom:** `IndexSizeError: Failed to construct 'ImageData': The source width is zero or not a number` appears in the console, originating from `worker.js → image-compressor.js → pixelsToOffscreenCanvas`. Happens intermittently when hovering a tile. Foundry also logs `FogExtractor | Buffer compression has failed!`. Does not break functionality visibly.

**Stack:** Foundry's FogExtractor tries to compress a fog buffer where the source canvas has zero width. Triggered by `commit → #save → _extractBase64 → compressBufferBase64 → ImageData(buffer, 0)`.

**Likely cause:** A zero-dimension offscreen canvas produced during fog extraction when a tile has unusual dimensions or when the scene is in an intermediate state during hover. Not isoroll code — entirely in Foundry internals.

**Action:** Monitor for Foundry upstream fix. If it worsens, investigate whether isoroll tile dimension handling produces zero-width image regions.

---

## B27 — Black screen flash when entering scene (F5, scene activation, GridConfig close)

**Symptom:** On scene load (page reload / F5, scene activation from scene list, or closing
GridConfig and returning to the active scene), tiles briefly appear projected against a
black background before the background image renders in. Lasts ~0.5–1s then resolves.

**Trigger conditions confirmed:**
- Page reload (F5) with isoroll scene active
- Activating a scene from the sidebar
- Closing the GridConfig dialog (returns to the scene mid-animation tick)

**Likely cause:** `onCanvasReady` fires and draws tile overlays (3D boxes, sprite clones)
before Foundry finishes painting the background sprite. IsoRenderer renders into canvas
layers that are already visible while `canvas.environment.primary.background` is still
loading/positioning. When GridConfig closes, `onGridConfigClose` → `onCanvasReady` may
fire before the background restores its non-preview state.

**Action:** Investigate deferring `onCanvasReady` tile/token rendering until background
sprite is confirmed ready, or hook into a later Foundry lifecycle event.

---

## B32 — Tile-slice z-ordering inconsistent when two tiles share equal depth bands (FIXED)

**Symptom:** Two tiles crossing in an X pattern (e.g., 4×1 horizontal and 1×4 flipped vertical) display correct z-ordering on first placement but wrong ordering after moving and returning to the same position. Specifically a slice at a shallower isometric depth (e.g., cell (5,7), depth=2) renders on top of a slice at a deeper depth (e.g., cell (4,8), depth=4).

**Root cause (two mechanisms):**
1. **Z-index collision**: For the X-cross configuration, all slice pairs from the two tiles receive identical z-indices. PIXI's stable sort breaks ties by PIXI-container insertion order.
2. **Insertion order change**: Foundry fires `drawTile` after a native drag ends. The handler called `IsoTileRenderer.create()` — which destroys and re-appends slices to the END of the PIXI container — permanently changing the tiebreaker order.
   During a gizmo drag, z-indices temporarily diverge (tile at different position), PIXI physically reorders its children array, and when the tile returns the modified order persists.

**Fix (committed on `fix/b32-slice-zorder-collision`):**
- `render-lifecycle-tile.ts` `drawTile()`: changed `r.create()` → `r.rebuild()` for normal-state tiles. `rebuild()` is a no-op when slices already exist, preventing spurious destroy+re-insert.
- `iso-tile-geom.ts` `buildSlice()` and `iso-tile-renderer.ts` `_syncTileSlices()`: added `tile.document.sort` as a tiebreaker in the z-index formula (`... * DEPTH_SCALE + tileSort`). Foundry sort values are small integers so depth ordering is never violated. Users can now set tile Sort in TileConfig to control which tile appears in front at equal depths.

---

## Design Discussion — TileConfig / TokenConfig popup hides isoroll overlays

**Observation:** Opening the TileConfig or TokenConfig popup causes all isoroll visuals
(volume gizmo handles, 3D bounding box, image contour) to disappear. Closing the popup
does not restore them — tile/token must be deselected and reselected.

**Cause:** Foundry fires `controlTile`/`controlToken` with `controlled = false` when the
config popup opens, which our hooks interpret as a deselect.

**Open question:** Is this the right UX? Overlays are editing tools — having them disappear
while the config popup is open may be intentional (reduces clutter). The cost is one
extra click (reselect) after closing the popup. Decide before fixing.
