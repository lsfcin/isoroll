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

## B32 — Tile-slice z-ordering inconsistent between adjacent/crossing tiles (FIXED)

**Symptom:** At wall junctions (L, T, X), a slice that should render behind a neighbor tile's slice sometimes renders fully on top. Correct on some placements/sessions, wrong on others; moving tiles could flip the outcome.

**Root cause (found via headless dumpZOrder + per-slice screen bounds):**
Slice→depth-cell assignment was *index arithmetic* — `d = kStart + i` walked the footprint frontier assuming cut k is the boundary between frontier cells k and k+1. Wall art overhangs its footprint, so frontier corners could project *inside* the texture on one side and fall off (clamp+filter) on the other. The cut set then shifts relative to the walk: e.g. a 1×4 wall with left overhang got cuts `{W(r0)..W(r0+3)}` instead of `{W(r0+1)..E}` — every slice assigned the cell one band deeper, plus a footprint-overflow cell for the last slice. The wrong bands collided exactly with the neighbor tile's correct bands, producing zIndex ties whose winner was PIXI insertion order (session/drag-history dependent). Secondary defects: `kStart = min(Wg-1, Hg-1)` shifted all bands for tiles fractionally overlapping cells on both axes, and the raw `document.sort` tiebreaker (Foundry sorts are 100000-spaced) could swallow whole depth bands.

**Fix (branch `fix/b32-slice-zorder-collision`):**
- `iso-tile-depth.ts` (new): geometric assignment — `frontierFaces()` gives each frontier cell's visible-face interval; `computeSliceCuts()` projects faces with the same flip-mirror+clamp as cuts (same texture space); `sliceDepthCell()` picks the face nearest the slice's image-x midpoint. Overhang clamps to the nearest edge face. Replaces the index walk at all five former copies (buildSlice, sync, dump, create-log, debug labels — labels now show the exact cells feeding zIndex by construction).
- `kStart` removed entirely; cuts are now derived from the same face endpoints (frontierCorners folded in).
- `tileSortBand()`: cross-tile tiebreaker is the tile's *rank* by `(sort, id)`, bounded below `TOKEN_BAND` — deterministic, no exact cross-tile ties, `document.sort` still controls front/back at equal depth.
- Verified headless (puppeteer + dumpZOrder + pixel diff): junction bands deterministic, stable across move-and-return, and pixel-identical after adversarially reversing the PIXI children order.

**Note (pre-existing, discovered during verification):** un-hiding a tile does not restore slice visibility — `_syncTileSlices` sets `visible=false` when `doc.hidden` but never resets it on unhide; slices reappear only after a rebuild. Tracked as B33 below.

---

## B33 — Un-hiding a tile leaves its slices invisible

**Symptom:** Toggle a sliced tile hidden, then visible again: the tile stays invisible until its slices are rebuilt (scene reload, move, or debugSlices toggle).

**Root cause:** `_syncTileSlices` (iso-tile-renderer.ts) applies `slices[i].visible = false` when `doc.hidden` but has no else-branch to restore `visible = true`; `onSightRefresh`/fog only copies slice[0] state to the rest.

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
