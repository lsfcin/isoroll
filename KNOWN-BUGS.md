# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

---


## B1 — Gizmo and line sizes scale with scene grid size

**Symptom:** Handle diamonds, circles, and bounding-box lines scale up/down relative to
Foundry's native grid gizmos when the scene grid size changes (tested at 20, 50, 100 px).
Our sizes are calibrated for a single grid size, not screen-space invariant.

**Affected:** All `make*Handle` factories in `gizmos-handles.ts`; `LINE_W` constants in
`wall-overlay.ts`; `HANDLE_SIZE` constant.

**Expected:** Handle sizes and line widths should remain constant in screen pixels
regardless of grid size (i.e., they should be divided by canvas zoom, not by grid size).

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


## B4 — SceneConfig Iso tab: tiles and tokens don't transform live on "Enable Isometric" toggle

**Symptom:** In the SceneConfig popup → Iso tab, toggling the "Enable Isometric" checkbox
triggers an immediate live preview for the grid and background (correct behavior). However,
tiles and tokens do NOT counter-transform until "Save Changes" is clicked and the scene
reloads. Expected: tiles and tokens should react instantly, the same way the grid and
background do.

**Affected:** `CanvasTransform.previewOverride` triggers the stage transform preview,
but `ObjectTransform` hooks (`refreshTile`, `refreshToken`) are not re-fired during the
preview — they only run on actual scene update (after Save). Likely needs an explicit
`canvas.tiles.placeables.forEach(t => t.refresh())` call when the preview override changes.

---

## B6 — GridConfig "Reset Changes" clears background dashed outline and gizmos

**Symptom:** In the Grid Configuration Tool, clicking "Reset Changes" causes the background
dashed contour and all background gizmo handles to disappear. They do not reappear unless the
GridConfig is closed and reopened (or the background is reselected).

**Root cause hypothesis:** Reset Changes fires a scene or canvas update event (likely
`updateScene` or equivalent) that triggers `clearAll()` on the background gizmos/overlay.
The gizmos don't re-register after the reset because no `controlTile`/selection hook fires.

**Affected:** `BackgroundGizmos` / `CanvasTransform` overlay hooks.

---



## B16 — TokenConfig: saving "Transform Token" loses transform, breaks token image placement

**Symptom:** In the TokenConfig popup → Iso tab, toggling "Transform Token" shows a correct
live preview (token counter-transforms as expected). However, clicking "Update Token" to save
causes the transformation to be lost. After saving, the token image appears placed directly on
the grid with incorrect rotation/skew — not the expected undistorted sprite.

**Uncertainty:** Not confirmed whether this regressed during refactoring (steps 1–3) or was
pre-existing. The live-preview path works; the save/reload path does not.

**Root cause hypothesis:** On save, Foundry re-renders the token via `refreshToken` hook.
The `ObjectTransform` handler may not be re-applying the counter-transform after the token
document update, or the `transformToken` flag value isn't being read correctly on refresh.

**Affected:** `ObjectTransform.onRefreshToken` in `transform/object-transform.ts` —
check whether it reads the updated flag value after a token document save.

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

## B13 — Native Foundry tile corner scale does not scale the 3D volume height

**Symptom:** Resizing a tile using Foundry's native corner scale handle (orange square in the
tile controls) changes width/height but does not proportionally adjust `boundHeight`. The 3D
volume box becomes incorrect (too tall or too short relative to the new tile size).

**Expected:** When tile dimensions change via native scale, `boundHeight` should rescale
proportionally so the visual volume maintains its aspect ratio.

**Affected:** `onUpdateTile` in `wall-manager.ts` / `VolumeGizmos` — no handler currently
adjusts `boundHeight` in response to a pure width/height change from native controls.

---

## B14 — Undo stacks every intermediate drag step, not just the drop

**Symptom:** Ctrl+Z after dragging a handle (width, height, move, imgOffset, etc.) requires
multiple presses to undo the single drag action — one press per intermediate update fired
during the drag. The undo stack should record only the final committed value (on pointer-up),
not every frame.

**Root cause hypothesis:** `commitDrag` / equivalent is called on every `pointermove` event,
and each call fires a `document.update` / `setFlag` which Foundry records as a separate undo
entry. Fix: only call the final commit on `pointerup`; during drag, either use a local
preview or throttle without persisting.

**Affected:** `VolumeGizmos.commitDrag`, `TokenGizmos.commit`, `TokenVolumeGizmos` — all
call document updates on every move event.

---

## B15 — Undo does not revert token elevation changes made via elevation handle

**Symptom:** After changing a token's elevation using the orange circle elevation handle,
Ctrl+Z does not restore the previous elevation value. Other handle types (imgOffset, etc.)
may work correctly — this is specific to token elevation.

**Root cause hypothesis:** Token elevation updates may bypass the `WallHistory` undo system
(which tracks tile-linked operations) and Foundry's own undo may not capture `setFlag` /
`update` calls made from the elevation drag handler.

**Affected:** `TokenVolumeGizmos` elevation drag handler → `token.document.update`.

---

## B10 — Opening TileConfig popup hides all isoroll gizmos and overlays

**Symptom:** When the Tile config popup is opened for a selected tile, all isoroll visuals
(volume gizmo handles, 3D bounding box overlay, image contour) disappear. They were visible
before the popup opened. Closing the popup does not restore them — the tile must be
deselected and reselected.

**Root cause hypothesis:** Opening TileConfig fires `controlTile` with `controlled = false`
(or equivalent deselect event) before re-selecting, causing overlays/gizmos to call `hide()`.
Alternatively, a `renderTileConfig` hook clears the controlled state.

**Affected:** `VolumeOverlay`, `VolumeGizmos`, `TokenVolumeOverlay`, `TokenVolumeGizmos` —
all check `controlTile` hook; none guard against TileConfig open/close lifecycle.

---

## B17 — Tile swap doesn't mirror imageOffset inside 3D volume

**Symptom:** When a tile is flipped (`tileFlipped = true`), the image visually mirrors, but
its position inside the 3D volume box is wrong. The gap between image-left-border and
volume-left-border (`a`) and the gap between image-right-border and volume-right-border (`b`)
are preserved after the swap. They should be mirrored: `a` becomes the right-side gap, `b`
becomes the left-side gap.

**Expected:** After flip, imageOffset.x should be reflected around the tile center — effectively
negated (or `tileWidth - offsetX - imageWidth`) — so the image sits symmetrically mirrored
inside the volume box.

**Affected:** Wherever `imageOffset` is consumed together with `tileFlipped`, likely in
`transform/object-transform.ts` or `volume/overlay-geometry.ts`.

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

## ~~B24 — TileHUD and TokenHUD mispositioned on first right-click after F5~~ RESOLVED

**Root cause (confirmed):** Foundry sets `#hud style.left = wt.tx`, `style.top = wt.ty`
only inside the `canvasPan` handler. `applyStage()` on `canvasReady` mutates stage
rotation/skew (changing `wt.tx/ty`) but `#hud` CSS is never updated until the first pan.
Additionally, PIXI's `worldTransform` is only recomputed during the render loop — it is
stale (identity) right after `stage.rotation/skew` are set.

**Fix:** `CanvasTransform.syncHudAfterStageApply()` in `stage-transform.ts` — called at
the end of `onCanvasReady`:
1. Force worldTransform flush: `stage.transform.updateLocalTransform(); stage.worldTransform.copyFrom(stage.localTransform)`
2. Sync `#hud` CSS: `hud.style.left = wt.tx + "px"; hud.style.top = wt.ty + "px"`

Also refactored: both TileHUD and TokenHUD now use `_updatePosition` prototype patch
(not hooks). `isoHudCenter` and `isoVisualCssWidth` extracted to `hud-utils.ts`.

---

---

## B25 — SceneConfig Iso tab: "Save Changes" floats in large empty vertical space

**Symptom:** In the SceneConfig popup → Iso tab, the "Save Changes" button appears at the
bottom of a large empty vertical gap below the Transformations fieldset. Was previously
correct (compact layout). Regressed during the refactor.

**Affected:** SceneConfig Iso tab template / form layout — likely `src/ui/scene-config.ts`
or the Handlebars template it renders. Probably a missing CSS rule or removed height
constraint on the fieldset / tab content area.

---

> ~~B4 — Background gizmo handles mispositioned~~ — resolved (was a stale dist/ artifact
> from branch switching, not a code regression).
