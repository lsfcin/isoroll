# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

**Abbreviations:** EIF = Enable Isometric false; TBF = iso true + Transformed Background false; TBT = iso true + Transformed Background true; GCT = Grid Configuration Tool.

---

## B22-0b — TBT grid offset (gap between outline and grid)

**Symptom:** In TBT mode, a visible gap appears between the dashed scene outline and the rendered grid mesh.

**Root cause:** In TBT, `BackgroundTransform.reset()` is called (no counter-transform on bg).
bg-gizmos computes the dashed outline using `scX=scY=sx` (isoCT=false in TBT). But the grid
mesh rendering may use different scale assumptions. The `sx = bgW/texW` ratio may not map
to the grid cell size, causing the outline to appear at the right visual position while the
grid mesh is offset. Needs debug data to confirm.

**Fix (bg-gizmos.ts, investigate first):**
Add debug logging in `BackgroundGizmos.show()` comparing bg pixel dimensions vs
`canvas.dimensions.sceneWidth/sceneHeight` in TBT mode. Fix scale mismatch once root cause
confirmed.

---

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

## B12 — Token elevation label renders as black square (intermittent)

**Symptom:** When changing token elevation via the orange circle elevation handle, the
elevation label on the grid (the "1 ft" text Foundry renders near the token) occasionally
appears as a solid black square instead of readable text. Intermittent — not reproducible via
elevation changes through other means (only observed via the drag handle).

**Root cause hypothesis:** Rapid successive `setFlag` calls during drag may cause a race
condition in Foundry's label rendering or texture cache.

**Affected:** `TokenVolumeGizmos` elevation drag → `token.document.update({ elevation })`.

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

**Affected:** `onRefreshTile` in `tile-transform.ts`; `onUpdateTileFlags`; drag commit in
`tile-drag.ts` case `"imgOffset"`.

---

## B26 — EIF live background displaced from scene outline

**Symptom:** In a scene saved as EIF (iso disabled), the background image appears offset or
reduced in size in the live view, while the scene outline (dashed border) is at the correct
position. The GCT preview shows the background correctly. No rotation or distortion — only
position/size mismatch.

**Hypothesis:** `BackgroundTransform.capture()` is called inside the `canvasReady` hook, but
Foundry may finalize the background sprite's position in a post-`canvasReady` render tick.
The captured `orig.posX/posY/scaleX/scaleY` are therefore pre-finalization values. Subsequent
`reset()` calls restore to these stale coordinates. GCT creates a fresh preview sprite from
current scene data (correct), so the live bg and GCT preview diverge.

**Alternative hypothesis:** `BackgroundTransform.getSprite()` returns
`canvas.environment.primary.background` which may be a different object than the actually
rendered sprite on some Foundry scene types (e.g. the default world splash screen). The
`reset()` then writes to an off-screen or secondary sprite while the visible sprite is at
Foundry's natural position — or vice-versa.

**Fix direction:** Defer `capture()` by one `requestAnimationFrame` tick after `canvasReady`
so Foundry completes its own bg positioning before we snapshot it. Or re-capture on the first
`updateScene` call if `originalBg` appears stale. Needs live debug logging first.

**Affected:** `BackgroundTransform.capture()` / `reset()` in `bg-transform.ts`;
`CanvasTransform.onCanvasReady()` in `stage-transform.ts`.

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
