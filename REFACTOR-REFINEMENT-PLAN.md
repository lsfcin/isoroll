# isoroll-module — Refactor Refinement Plan

> Branch: `feature-full-refactor`
> Scope: Everything left after Phases 0–9. Phases 0–8 complete; Phase 9 done partially
> and differently from the original plan. This document supersedes REFACTOR-PLAN.md's
> Phase 9 and captures all residual issues found by reading the current codebase.
>
> Same working contract as before: one step at a time, test between steps.

---

## Current state snapshot

Files still above 150-line warning threshold (all under 200 hard limit):

| File | Lines |
|------|-------|
| `background/bg-gizmos.ts` | 185 |
| `walls/wall-overlay.ts` | 170 |
| `tiles/tile-drag.ts` | 167 |
| `tiles/tile-gizmos.ts` | 163 |
| `tokens/token-gizmos.ts` | 160 |
| `walls/wall-manager.ts` | 157 |
| `transform/bg-transform.ts` | 145 |
| `walls/wall-overlay-ops.ts` | 143 |
| `volume/overlay-geometry.ts` | 139 |

---

## Issues catalogue

### I1 — `overlay-geometry.ts` fully duplicates `draw/constants.ts`

`volume/overlay-geometry.ts` redeclares all 10 constants already in `draw/constants.ts`
(`ORANGE`, `BLACK`, `DASH_LEN`, `GAP_LEN`, `ANCHOR_DASH`, `ANCHOR_GAP`,
`ALPHA_FRONT_OUTLINE/FILL`, `ALPHA_BACK_OUTLINE/FILL`) with identical values.
`draw/constants.ts` was created in Phase 0.3 but `overlay-geometry.ts` was never updated
to import from it. Consumers of overlay-geometry that re-export these constants are
silently working on local copies.

**Fix:** Remove the 10 constant declarations from `overlay-geometry.ts`; add
`import { ... } from "../draw/constants"`.

---

### I2 — `MeshLike` type defined in 5 places

| File | Name | Shape |
|------|------|-------|
| `draw/contour.ts` | `MeshLike` (exported) | read-only 6-field |
| `gizmos/mesh-corners.ts` | local `M` in `meshCorner` | read-only 6-field, same |
| `tiles/tile-transform.ts` | local `MeshLike` | mutable 8-field (has `skew.set`, `scale.set`, `anchor.set`) |
| `tokens/token-transform.ts` | local `MeshLike` | same mutable 8-field |
| `tokens/token-gizmos.ts` | local `M` | 4-field read-only partial |

Two distinct shapes are needed:
- **ReadMeshLike** — for drawing/corner calculations (read-only). `draw/contour.ts` already exports this.
- **MutMeshLike** — for transform application (needs set() methods). Duplicated across tile-transform + token-transform.

**Fix:**
- `gizmos/mesh-corners.ts` local `M` → import `MeshLike` from `draw/contour.ts`.
- `tokens/token-gizmos.ts` local `M` → import `MeshLike` from `draw/contour.ts`.
- Export `MutMeshLike` (the mutable 8-field shape) + `EPS = 1e-6` from
  `tiles/tile-transform.ts`; import both in `tokens/token-transform.ts`.
  This also repairs the judgment error in Phase 9 that contradicted the plan's
  "stays unified" note by at minimum sharing the duplicated types.

---

### I3 — `zoom` accessor copied 8 times

```ts
(canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1
```

Appears in: `bg-drag.ts`, `handle-factories.ts`, `hud-patches.ts`, `tile-drag.ts`,
`token-gizmos.ts`, `token-elev-gizmo.ts`, `ruler-patch.ts` (×2). One call per file = 8
copies of an ugly 52-character cast.

**Fix:** Add `canvasZoom(): number` to `src/util.ts`. All 8 sites replace with `canvasZoom()`.

---

### I4 — `gd` (grid distance) accessor copied 9 times

```ts
(canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1
```

Appears in: `tile-drag.ts`, `tile-gizmos.ts`, `token-elev-gizmo.ts` (×2),
`token-transform.ts`, `tile-transform.ts`, `overlay-geometry.ts` (×2), `wall-coords.ts`.

**Fix:** Add `gridDistance(): number` to `src/util.ts`.

---

### I5 — `E = elev * gs / gd` elevation conversion not extracted

Appears as inline computation in: `tile-transform.ts`, `token-transform.ts`,
`tile-gizmos.ts`, `token-elev-gizmo.ts`, `overlay-geometry.ts` (×2).
A named `elevToCanvas(elev, gs, gd)` makes the formula auditable and the call
sites self-documenting.

**Fix:** Add `elevToCanvas(elev: number, gs: number, gd: number): number` to `src/util.ts`.

---

### I6 — Drag lifecycle boilerplate repeated across 4 classes

`VolumeGizmos`, `TokenGizmos`, `TokenElevGizmo`, `BackgroundGizmos` each implement
the identical 20-line pointer-drag lifecycle:

```ts
private static drag: SomeDragState | null = null;
private static readonly onMove = (e: PointerEvent) => This.handleMove(e);
private static readonly onUp   = (e: PointerEvent) => This.handleUp(e);
// beginDrag: window.addEventListener x2
// handleMove: guard + commit
// handleUp: window.removeEventListener + guard + commit
```

~20 lines × 4 classes = 80 lines of structural duplication.

**Fix:** Export `startPointerDrag<T>(state: T, onCommit: (s: T, gx: number, gy: number) => void, yOnly?: boolean): void` from `src/util.ts`. It:
1. Calls the commit callback immediately (optional: on first move only).
2. Adds pointermove listener → calls commit with current position.
3. Adds pointerup listener (once) → removes pointermove, calls commit.

`yOnly` flag supports `TokenElevGizmo` which only needs `gy`.

Each class drops its `onMove` / `onUp` statics and its `handleMove` / `handleUp`
methods; `beginDrag` becomes a single `startPointerDrag(state, commitFn)` call.

---

### I7 — Token drag math duplicates tile-drag.ts

`TokenGizmos.commit()` implements `imgOffset`, `imgYScale`, `imgScale` drag math
from scratch (~30 lines), identical in logic to the corresponding `case` blocks in
`tile-drag.ts`'s `projectDrag`. Magic constant `12` appears hardcoded in
`token-gizmos.ts:130` — same value as `IMG_YSCALE_SNAP_PX = 12` in `tile-drag.ts`
but not imported.

**Fix:**
- Export `IMG_YSCALE_SNAP_PX` from `tile-drag.ts`.
- Extract three pure math helpers from `tile-drag.ts`'s switch into named functions:
  `projectImgOffset(dx, dy, wt, startX, startY)`,
  `projectImgYScale(dx, dy, wt, zoom, startYScale, halfH)`,
  `projectImgScale(gx, gy, startGX, startGY, startScale, cx, cy, wt)`.
- `TokenGizmos.commit()` calls these helpers instead of re-implementing the math.

---

### I8 — `computeVerts` and `computeTokenVerts` share 35-line identical body

Both functions in `overlay-geometry.ts` preprocess inputs differently (tile uses center
coords + canvas px; token uses top-left + grid units) then produce identical output via
the same 35-line formula block. The formula block is copy-pasted verbatim.

**Fix:** Extract `buildBoxVerts(tx, ty, tw, th, E, EH, ex, ey, elevation): BoxVerts`
as a private function in `overlay-geometry.ts`. Both public functions call it after
computing their entity-specific inputs.

---

### I9 — Barrel files `wall-core.ts` and `wall-ops.ts` are dead weight

Both files exist only as backward-compat re-export barrels:

```ts
// wall-core.ts
export * from "./wall-coords";
export * from "./wall-flags";

// wall-ops.ts
export * from "./wall-crud";
export * from "./wall-sync";
export * from "./wall-door";
export { getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls, canvasToAnchor } from "./wall-core";
export { getDoorBehavior, setDoorBehavior, hasLinkedDoor } from "./wall-core";
```

`wall-manager.ts` imports from both. Keeping these alive adds an indirection layer
and signals to readers that `wall-ops.ts` is a coherent module when it isn't.

**Fix:** Update `wall-manager.ts` (and any other importer) to import directly from
`wall-coords`, `wall-flags`, `wall-crud`, `wall-sync`, `wall-door`. Delete both barrels.

---

### I10 — `onRenderTileHUD` belongs in `hud/hud-patches.ts`, not `wall-manager.ts`

`WallManager.onRenderTileHUD` (55 lines, half the class) handles DOM injection and
click wiring for the TileHUD. `hud/hud-patches.ts` already exists for exactly this
concern. The wall-manager's job is wall document lifecycle (update/delete hooks),
not DOM patching.

`hud-patches.ts` currently has only the TokenHUD repositioning patch (25 lines).
Adding the TileHUD buttons there makes it the single HUD-patching file.

**Fix:**
- Move `onRenderTileHUD` logic from `WallManager` to `HudPatches.activate()`.
- `WallManager.activate()` removes the `renderTileHUD` hook registration.
- `wall-manager.ts` shrinks from 157 → ~100 lines ✓.
- `hud-patches.ts` grows from 25 → ~80 lines ✓.

---

### I11 — `getProjection(canvas.scene)` verbose at 10+ call sites

Every in-canvas call site passes the same argument — `canvas.scene` — which is the
only argument ever used in production. The verbosity forces readers to parse a
two-argument call when the second argument never varies.

**Fix:** Add `currentProjection(): IsoProjection` to `transform/constants.ts`:
```ts
export function currentProjection(): IsoProjection {
  return getProjection(canvas.scene);
}
```
All in-canvas call sites (`tile-transform.ts`, `token-transform.ts`, `tile-gizmos.ts`,
`tile-drag.ts`, `token-elev-gizmo.ts`, `overlay-geometry.ts` ×2, `handle-draw.ts` ×3,
`bg-gizmos.ts`) switch to `currentProjection()`. `getProjection(scene)` stays for
the two test/preview override sites that pass a non-canvas scene.

---

### I12 — `overlay-geometry.ts` mixes concerns and lives in wrong folder

`volume/overlay-geometry.ts` contains:
- **Constants** — should import from `draw/constants.ts` (I1)
- **Types** (`BoxVerts`, `P`) + `point()` — pure data, no PIXI
- **Geometry** (`computeVerts`, `computeTokenVerts`, shared `buildBoxVerts`) — pure math
- **PIXI drawing** (`drawAnchorLine`, `drawBox`) — uses PIXI.Graphics

The `volume/` folder now has only two files (`overlay-geometry.ts`, `settings.ts`).
Neither is "volume"-specific in name — they're geometry helpers and module settings.

**Fix (two-part):**
1. After I1: `overlay-geometry.ts` stops redeclaring constants; imports from `draw/constants`.
2. Move the file to `draw/volume-box.ts` — more discoverable alongside the other draw utilities.
   All importers (`tile-overlay.ts`, `token-overlay.ts`) update their import path.
   `volume/` folder is left with only `settings.ts` — rename to `src/settings.ts`
   (a module-level concern, same move as was done for `flags.ts`).

---

### I13 — `bg-gizmos.ts` at 185 lines — HTML injection mixed with PIXI drawing

`BackgroundGizmos` does two distinct things:
- **HTML injection** — inserts the "Vertical Scale" field into GridConfig, wires its
  `change` event, patches `_processSubmitData`, registers key/wheel handlers.
  (~60 lines, `onRenderGridConfig`, `scaleVerticalStep`, `onCloseGridConfig`)
- **PIXI drawing** — computes background corners, draws dashed contour, places handles,
  manages drag state. (~125 lines, `show`, `beginDrag`, `commit`, `handleMove`, `handleUp`)

**Fix:** Extract HTML injection concern into `background/bg-html.ts` (~60 lines).
`bg-gizmos.ts` drops to ~125 lines ✓, `bg-html.ts` is cleanly testable in isolation.

---

### I14 — `wall-overlay-ops.ts` at 143 lines; could split at endpoint/select boundary

`wall-overlay-ops.ts` has two distinct interaction concerns:
- **Endpoint drag** — `addEndpointHandles`, `addEndpointDrag` (~70 lines)
- **Select mode + hover + dblclick** — `addLineHover`, `addSelectInteraction`,
  `addWallDblClick` (~73 lines)

Not urgent (both under 150 today), but the semantic boundary is clear.

**Fix (optional/deferred):** Split into `wall-endpoint-drag.ts` + `wall-select-ops.ts`
if either grows past 150 during future bug fixes.

---

## Priority + sequencing

Dependencies shown as arrows. Do in this order within each group.

### Group A — Eliminating duplication (no behavior change, low risk)

| Step | What | Risk | Files changed | Gain |
|------|------|------|---------------|------|
| A1 | I1: Remove duplicate constants from `overlay-geometry.ts`; import from `draw/constants` | 🟢 | 1 file | Eliminate 10 duplicate declarations |
| A2 | I2: Export `MutMeshLike` + `EPS` from `tile-transform.ts`; import in `token-transform.ts`. Import `MeshLike` from `draw/contour.ts` in `mesh-corners.ts` + `token-gizmos.ts` | 🟢 | 4 files | 3 fewer type definitions |
| A3 | I3 + I4 + I5: Add `canvasZoom()`, `gridDistance()`, `elevToCanvas()` to `util.ts`; replace all 8+9+6 call sites | 🟢 | `util.ts` + ~12 files | Eliminate 23 verbose casts |
| A4 | I7: Extract `IMG_YSCALE_SNAP_PX` export from `tile-drag.ts`; extract 3 shared img-drag math helpers; `token-gizmos.ts` uses them | 🟡 | 2 files | Eliminate 30 lines of math duplication |
| A5 | I8: Extract `buildBoxVerts` in `overlay-geometry.ts` | 🟢 | 1 file | Eliminate 35 lines of duplication |
| A6 | I9: Update `wall-manager.ts` imports to direct paths; delete `wall-core.ts` + `wall-ops.ts` | 🟢 | 2 files deleted + 1 updated | Remove 2 barrel files |

### Group B — Cohesion fixes (moderate restructuring, low-medium risk)

| Step | What | Risk | Files changed | Gain |
|------|------|------|---------------|------|
| B1 | I10: Move `onRenderTileHUD` from `wall-manager.ts` → `hud/hud-patches.ts` | 🟡 | 2 files | Correct responsibility |
| B2 | I11: Add `currentProjection()` to `constants.ts`; update all in-canvas call sites | 🟢 | ~10 files | Readability at every call site |
| B3 | I12: Move `overlay-geometry.ts` → `draw/volume-box.ts`; move `volume/settings.ts` → `src/settings.ts`; delete `volume/` folder | 🟡 | ~5 importers + module.ts | Remove misleading folder |

### Group C — Structural pattern (higher impact, requires care)

| Step | What | Risk | Files changed | Gain |
|------|------|------|---------------|------|
| C1 | I6: Add `startPointerDrag<T>` to `util.ts`; refactor `VolumeGizmos`, `TokenGizmos`, `TokenElevGizmo`, `BackgroundGizmos` to use it | 🔴 | `util.ts` + 4 files | Eliminate ~80 lines drag boilerplate |
| C2 | I13: Extract `background/bg-html.ts` from `bg-gizmos.ts` | 🟡 | 2 files | bg-gizmos 185 → ~125 lines |

### Group D — Deferred / optional

| Step | What | Notes |
|------|------|-------|
| D1 | I14: Split `wall-overlay-ops.ts` into endpoint-drag + select-ops | Only if file grows past 150 |

---

## Net effect on line counts (after A–C)

| File | Now | After |
|------|-----|-------|
| `overlay-geometry.ts` → `draw/volume-box.ts` | 139 | ~100 (I1 + I8) |
| `wall-manager.ts` | 157 | ~100 (I10) |
| `bg-gizmos.ts` | 185 | ~125 (I13) |
| `tiles/tile-drag.ts` | 167 | ~145 (I7) |
| `tokens/token-gizmos.ts` | 160 | ~130 (I6 + I7) |
| `hud/hud-patches.ts` | 25 | ~80 (I10) |
| `util.ts` | 4 | ~30 (I3+I4+I5+I6) |
| `background/bg-html.ts` | — | ~60 (I13) |
| `draw/volume-box.ts` | — | ~100 (I12) |
| `src/settings.ts` | — | 23 (I12) |

All remaining files drop under 150 or stay well under it.

---

## Files to delete after this plan

- `volume/overlay-geometry.ts` → replaced by `draw/volume-box.ts`
- `volume/settings.ts` → replaced by `src/settings.ts`
- `volume/` folder (empty after above)
- `walls/wall-core.ts` (barrel, I9)
- `walls/wall-ops.ts` (barrel, I9)
