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

## B4 — Background gizmo handles mispositioned in isometric + transformed-background scene (POSSIBLE REGRESSION — under investigation)

**Symptom:** In GridConfig on an isometric scene where `transformBackground = true`,
the translate/scale handles appear at the grid center instead of at the background
image corners. The dashed contour outline appears at the correct position.
Non-isometric scenes and untransformed-background scenes are unaffected.

**Status:** Reproducible on `feature-full-refactor`, not on `main`. Investigating
whether this is a stale dist/ artifact from branch switching or a real code regression.
No code changes in `background-gizmos.ts` or `canvas-transform.ts` were made on this
branch. Only real code change near this area: `gizmos-handles.ts` baseline visual tweak
(affects `makeSwapHandle` only, which BackgroundGizmos does not call).

**Action:** Retest after `npm run build` (clean build, not watch mode).
