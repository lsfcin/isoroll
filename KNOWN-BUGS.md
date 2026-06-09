# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

---

## GCT Arrow-Key & Iso-State Bugs — Fix Plan

Abbreviations used below:
- **EIF** — Enable Isometric = false
- **TBF** — Enable Isometric = true, Transformed Background = false
- **TBT** — Enable Isometric = true, Transformed Background = true
- **GCT** — Grid Configuration Tool

### Step 1 — B22-1 + B22-2: Arrow key handlers ✅ DONE

**Root cause:** `document.addEventListener('keydown', ...)` registers in bubble phase.
Foundry's handlers (on form inputs, registered before ours) run first. Then ours runs.
- Ctrl+Arrow → Foundry moves shiftY, then our `scaleVerticalStep` also runs (Bug 1)
- Arrow → Foundry moves one field by ±1, then our handler applies ±2 to cancel+redirect (user's hack, Bug 2)

**Fix (bg-html.ts only):**
1. Register in capture phase `{ capture: true }` — fires before any bubble-phase handler. `e.preventDefault()` blocks Foundry entirely.
2. Update `removeEventListener` to also pass `{ capture: true }` (capture and bubble are independent registrations — without the flag, the listener leaks).
3. Revert user's ±2 hack to clean ±1 deltas.
4. Replace `canvas.scene?.getFlag(MODULE_ID, "enabled")` guard with `CanvasTransform.effectiveEnabled()` — respects current SceneConfig preview state, fixes the EIF-diagonal issue.

### Step 2 — B22-0a: GCT uses saved state, not effective state ✅ DONE

**Root cause:** `BackgroundTransform.onRenderGridConfig` reads saved scene flags. Comment says
"SceneConfig and GCT are never open simultaneously" — wrong assumption. User changes iso in
SceneConfig → opens GCT → Foundry closes SceneConfig first → `onCloseSceneConfig` fires →
`previewOverride = null` → `applyCurrentState()` reverts to saved flags → GCT opens showing
saved state. Pending SceneConfig changes are gone.

**Fix (stage-transform.ts, bg-transform.ts, bg-html.ts, bg-gizmos.ts):**
Added `CanvasTransform.lastPreviewState` (captured from `previewOverride` before clear in
`onCloseSceneConfig`). Added `gctEffectiveEnabled()` / `gctEffectiveTransformBg()` with 3-way
fallback: live SceneConfig preview → `lastPreviewState` → saved flag. `CanvasTransform.onRenderGridConfig`
re-applies correct stage/bg state when pending differs from saved. All GCT-context code (gizmos,
isTBF(), arrow handler) switched to gct-effective methods. `lastPreviewState` cleared on `closeGridConfig`.

### Step 3 — B22-0c: EIF gizmos distorted in GCT ✅ RESOLVED by Step 2

Gizmos `isoCT` now uses `gctEffectiveEnabled/TransformBg()` — correct in all pending-state scenarios.

### Step 4 — B22-0b: TBT grid offset (gap between outline and grid)

**Root cause:** In TBT, `BackgroundTransform.reset()` is called (no counter-transform on bg).
bg-gizmos computes the dashed outline using `scX=scY=sx` (isoCT=false in TBT). But the grid
mesh rendering may use different scale assumptions. The `sx = bgW/texW` ratio may not map
to the grid cell size, causing the outline to appear at the right visual position while the
grid mesh is offset. Needs debug data to confirm.

**Fix (bg-gizmos.ts, investigate first):**
Add debug logging in `BackgroundGizmos.show()` comparing bg pixel dimensions vs
`canvas.dimensions.sceneWidth/sceneHeight` in TBT mode. Fix scale mismatch once root cause
confirmed. Defer until Steps 1–3 done — some symptoms may shift.

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

## B22 — GridConfig arrow keys move background in projected grid axes, not screen axes

**Symptom:** In the Grid Configuration Tool with Iso enabled, the arrow keys (which control
Scene Offset / `shiftX` / `shiftY`) move the background along projected grid axes (diagonal
in screen space) instead of visually left/right/up/down. E.g. pressing ← moves the image
diagonally. The behaviour is disorienting because the user's mental model is screen-space
movement.

**Related UX question:** The displayed X and Y offset values are in grid coordinate units.
Under iso transform these map to diagonal screen directions, so the numbers don't match
visual intuition. Showing offsets in screen pixels (or suppressing the native field and
replacing it with a screen-space pair) may be more readable — worth deciding before fixing
the key behaviour.

**Strategy:**
- Intercept bare arrow key events inside `onRenderGridConfig` (same site as the existing
  CTRL+wheel handler in `bg-gizmos.ts` / future `bg-html.ts`).
- For each arrow key, compute the required `(ΔshiftX, ΔshiftY)` in grid coords that
  produces a pure screen-space movement. `screenToCanvas` in `src/util.ts` already inverts
  the world transform; feed it `(±step, 0)` for left/right and `(0, ±step)` for up/down.
- Write the resulting deltas into the `shiftX` / `shiftY` inputs and trigger `change` so
  the preview redraws.
- Decide whether to also replace the displayed values with screen-px equivalents (a separate
  read-only "Screen offset" row, keeping native fields hidden, is one option).

**Affected:** `BackgroundGizmos.onRenderGridConfig` (currently `background/bg-gizmos.ts`,
will become `background/bg-html.ts` after C2); `screenToCanvas` in `src/util.ts` (already
available).

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

## B27 — Background position not updated after GCT save ✅ DONE

**Symptom:** After saving changes in GCT (shiftX/shiftY), the scene outline (dashed border)
moves to the correct position but the background image remains at the old position. Reloading
Foundry places the background correctly.

**Root cause:** GCT save triggers `canvas.draw()` (shiftX/shiftY are in Foundry's redraw list).
`canvasReady` fires with a freshly created bg sprite. Our `onCanvasReady` called `reset()` BEFORE
re-capturing, which applied stale `originalBg` values (from the pre-draw canvasReady) to the new
sprite — moving it back to the old position. We then captured that wrong position. Subsequent
`applyCurrentState()` in EIF restored to the wrong captured position.

**Fix (stage-transform.ts + bg-transform.ts):** Track `lastCapturedSprite` (the sprite pointer at
last `capture()` call). In `onCanvasReady`, only call `reset()` if `bg === lastCapture` (same
sprite = no canvas.draw() redraw, guard against racing updateScene). New sprite after canvas.draw()
is at Foundry's correct position — skip reset, re-capture immediately.

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
