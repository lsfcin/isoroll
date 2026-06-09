# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

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

## Design Discussion — TileConfig / TokenConfig popup hides isoroll overlays

**Observation:** Opening the TileConfig or TokenConfig popup causes all isoroll visuals
(volume gizmo handles, 3D bounding box, image contour) to disappear. Closing the popup
does not restore them — tile/token must be deselected and reselected.

**Cause:** Foundry fires `controlTile`/`controlToken` with `controlled = false` when the
config popup opens, which our hooks interpret as a deselect.

**Open question:** Is this the right UX? Overlays are editing tools — having them disappear
while the config popup is open may be intentional (reduces clutter). The cost is one
extra click (reselect) after closing the popup. Decide before fixing.
