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

## B3 — Generate base walls places walls at original tile footprint, not image base

**Symptom:** Clicking the "Generate Base Walls" HUD button places 4 walls at the tile's
original grid footprint (tile.x/y + width/height), ignoring `imageOffset`, `imageScale`,
elevation offset, and `boundHeight`. The walls should be placed at the isometric image
base rectangle as computed by `imageRect()`.

**Affected:** `generateBaseWalls` / `generateBaseWallDefs` in `wall-ops.ts`.

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

## B7 — SceneConfig Iso tab has excess height, Save Changes floats in empty space

**Symptom:** The Iso tab in the Scene Configuration popup (AppV2) has too much vertical space
at the bottom. The "Save Changes" button floats in the middle of that empty space instead of
sitting at the bottom of the form content.

**Root cause hypothesis:** AppV2 tab content height is not being constrained — the tab panel
expands to a fixed dialog height rather than wrapping its content. Likely a missing
`overflow`, `height`, or `flex` CSS rule on the injected tab content container.

**Affected:** `src/transform/scene-config.ts` — tab injection / CSS for the Iso tab panel.

---

## B5 — Module overlays, gizmos, and walls visible inside GridConfig tool

**Symptom:** Opening the Grid Configuration Tool does not hide isoroll overlays, volume gizmo
handles, or wall overlays. All three remain visible on the canvas while the grid config dialog
is open, which is visually confusing.

**Expected:** When GridConfig is active, module overlays should be suppressed (similar to how
Foundry's native controls hide themselves during scene configuration).

**Affected:** All overlay/gizmo activate() methods — they hook on `controlTile`/`controlToken`
but do not hook on any GridConfig open/close event. Likely fix: listen for `closeGridConfig`
hook and call `clearAll()` on all overlays/gizmos.

---

## B11 — imgScale handle cursor shows wrong diagonal direction

**Symptom:** The white square handle for image scale (tiles, tokens, background) uses the
`nwse-resize` cursor (↖↘, top-left/bottom-right diagonal). The handle sits at the top-right
corner of the image, so the correct cursor is `nesw-resize` (↗↙, top-right/bottom-left).

**Affected:** `makeSquareCounterHandle(0xffffff, "nwse-resize")` calls in `gizmos-handles.ts`
and any equivalent in `background-gizmos.ts`.

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

## B8 — TileConfig Iso tab has extra wrapping container not present in other tabs

**Symptom:** The Iso tab content in the Tile config popup (AppV2) is visually wrapped in an
extra bordered/outlined div. Other tabs (Position, Appearance, Overhead) render their fields
directly without this outer container. The extra wrapper causes a visual indent/border that
breaks consistency with native Foundry tab layout.

**Affected:** `src/transform/tile-config.ts` (or wherever the Iso tab HTML is injected) —
likely an extra `<div class="form-group">` or `<fieldset>` wrapping the entire tab content.

---

## B9 — TileConfig Iso tab: "Volume Manipulation" label wraps to two lines

**Symptom:** The label "Volume Manipulation" in the Iso tab renders as two lines ("Volume" /
"Manipulation") while "Image Manipulation" renders correctly on one line. Both should be
single-line bold labels.

**Affected:** Same injection site as B8 — likely a missing `white-space: nowrap` or a CSS
width constraint forcing the wrap, possibly related to the extra wrapper from B8.

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

> ~~B4 — Background gizmo handles mispositioned~~ — resolved (was a stale dist/ artifact
> from branch switching, not a code regression).
