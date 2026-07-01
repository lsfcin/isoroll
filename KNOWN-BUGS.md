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


## B28 — Swap-tile slice grid footprint wrong after `swapSide()` (commit a6f0540 partial fix)

**Symptom:** After pressing the swap gizmo on a 4×1 tile, `isoroll.debugSlices(true)` shows:
- Wrong number of slices (8 instead of 4 when tile exactly on grid boundary; 4 when off-grid — inverted behavior)
- Slice cut lines at wrong horizontal positions
- Grid cell coordinate labels misaligned with visible grid

**Attempted fix (commit a6f0540):** Changed `_gridMetrics` to read visual dims via `tileFlipped` flag
(`visW = flipped ? docH : docW`), and added `effectiveI = flipped ? nSlices-1-i : i` for depth
reversal. Build passes; behavior still wrong.

**Root cause (not yet identified):** Three hypotheses under investigation:
1. `tile-transform.ts` sets `mesh.scale.x` from raw `tile.document.width` (not visual dims). After
   swap, `docW = 1gs` → `mesh.scale.x = -1gs/texW`. `_computeSliceCuts` then projects world points
   via `fromWorld(mesh)` using this wrong scale, producing bad UV values. Need to read
   `tile-transform.ts` `onRefreshTile` to confirm.
2. `mesh.x ≠ tile.document.x`. Formula: `mesh.x = doc.x + heightDir.x * elevPx + imageOffset.x * gs`
   (confirmed from `tile-transform.ts`). `_gridMetrics` uses `doc.x` for NW corner; if mesh is
   shifted, the snap grid won't align with visual tile position.
3. The "8 cells on-grid" count might be two debug containers overlapping (lifecycle race creating
   slices twice before destroying old ones).

**Files:** `src/render/iso-tile-renderer.ts` — `_gridMetrics`, `_computeSliceCuts`, `_createTileSlices`
**Next step:** Add `console.log({ docW, docH, flipped, visW, visH, Wg, Hg, nSlices })` to `_gridMetrics`
in-game, swap a tile, read output. Also check `tile-transform.ts::onRefreshTile` for how `mesh.scale.x`
is set relative to `docW` vs visual dims.

---

## B30 — Copy-paste tile does not carry linked walls

**Symptom:** Ctrl+C / Ctrl+V (or drag-duplicate) of a tile produces a new tile without
linked walls. The pasted tile has no walls associated and the wall overlay is absent.

**Expected:** Paste should duplicate the wall group along with the tile and link them
to the new tile document.

**Likely cause:** Foundry's tile paste path creates a new `TileDocument` by copying
the source document's data, which includes `flags.isoroll.linkedWalls` (the array of
wall IDs). Those IDs point to the ORIGINAL tile's walls, not newly created ones.
Our paste hook (if any) does not detect the duplication, re-create the wall documents,
and remap the flag to the new IDs. Net result: the new tile's flag is stale (references
old walls) or absent (flags stripped on paste).

**Files to investigate:**
- `src/walls/wall-manager.ts` or `wall-manager-impl.ts` — look for a `createTile` /
  `onDropTile` / `onPasteTile` hook that should handle duplication
- Foundry hook `preCreateTile` / `createTile` — check if we intercept tile creation
  triggered by paste vs. drop, and whether we clone wall documents there

---

## B31 — Unseen iso tiles flicker during / after token movement

**Symptom:** An iso tile with `hideOnFog=true` (or any unseen tile) briefly becomes
visible while a token is moving, then disappears again when movement stops. Also
blinks intermittently while the token is stationary if the revealed fog circle overlaps
with the tile's sprite screen area — even though the tile's grid base is in the dark.

**Root cause (hypothesis):** `onSightRefresh` tests the tile's world-space AABB
(`document.x/y` ± `width/height`) against `testPerimeterVisible`. For elevated iso
tiles the sprite is shifted from the grid footprint (the counter-transform moves the
mesh upward in iso screen space to simulate height). The world AABB and the sprite
screen area therefore diverge: the fog test can report "visible" when the sprite is
in the dark, or "not visible" when the sprite is actually in the revealed circle.

During token motion Foundry fires `sightRefresh` on every animation frame. If any
intermediate frame moves the revealed area over the world AABB (even for one tick),
the tile flashes visible, then disappears on the next frame.

**Secondary factor:** Foundry's visibility polygon may expand mid-animation (smear
across the movement path), temporarily covering the tile AABB regardless of elevation.

**Files:**
- `src/render/iso-tile-renderer.ts` — `onSightRefresh`: the `docX/docY/w/h` AABB
  passed to `applyTileFog` should be replaced with the mesh-space AABB (includes
  elevation offset). See `mesh.x / mesh.y` set by `tile-transform.ts::onRefreshTile`.
- `src/render/fog-apply.ts` — `applyTileFog` / `testPerimeterVisible`
- `src/transform/tile-transform.ts` — `onRefreshTile`: how `mesh.x/y` relates to
  `document.x/y + elevationOffset`

**Workaround:** None. Noticeable mainly on tiles with large `boundHeight` or where
the grid footprint is far from the visible sprite (e.g. wall tiles placed at the scene
edge).

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
