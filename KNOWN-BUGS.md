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

> ~~B4 — Background gizmo handles mispositioned~~ — resolved (was a stale dist/ artifact
> from branch switching, not a code regression).
