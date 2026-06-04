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

<!-- I1–I7 DONE (A1–A4, committed 76808e3 + 71272a2) -->
<!-- Extra (unplanned, agreed): helpers moved to gizmos/img-drag.ts — no tile/token hierarchy -->

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

### I15 — Re-export chains obscure true module boundaries

Three layered re-export chains mislead readers about where symbols live:

**Chain 1 — `mesh-corners` symbols tunnelled through `tile-drag`:**
`tile-drag.ts` re-exports `imageBottomLeft`, `imageTopRight`, `imageBottomCenter`,
`imageTopCenter`, `clientToGlobal`, `snapQuarterPx`, `snapQuarterUnits` from
`../gizmos/mesh-corners`. Consumers (`tile-gizmos.ts`, `token-gizmos.ts`,
`token-elev-gizmo.ts`, `bg-gizmos.ts`) import these as if they were drag logic.
`clientToGlobal` is particularly misplaced — it is a generic coordinate helper with
no tile-drag semantics.

**Chain 2 — `drawDashedContour` tunnelled through `handle-draw` then `handle-factories`:**
`draw/shapes.ts` defines `drawDashedContour`. `handle-draw.ts` re-exports it.
`handle-factories.ts` re-exports it again (from `handle-draw`). `bg-gizmos.ts`
imports it from `handle-draw` — a handle-primitives file — rather than from
`draw/shapes` where it belongs.

**Chain 3 — `handle-factories.ts` backward-compat re-exports now unused:**
`handle-factories.ts` re-exports `makeCircleHandle`, `makeSquareCounterHandle`,
`drawDashedContour` "for backward compat" but no file currently imports these
FROM `handle-factories` (they all import from `handle-draw` directly).

**Fix:**
- Remove the `export { imageBottomLeft, … } from "../gizmos/mesh-corners"` line
  from `tile-drag.ts`. Update `tile-gizmos.ts`, `token-gizmos.ts`,
  `token-elev-gizmo.ts`, `bg-gizmos.ts` to import those symbols from
  `../gizmos/mesh-corners` directly.
- Remove `export { drawDashedContour } from "../draw/shapes"` from `handle-draw.ts`.
  Update `bg-gizmos.ts` to import `drawDashedContour` from `../draw/shapes`.
- Remove the three backward-compat re-exports from `handle-factories.ts`.

---

### I16 — `scene-config.ts` acts as barrel in addition to its own hook

`transform/scene-config.ts` contains the real `registerSceneConfigHook` function
AND re-exports from three other modules:
```ts
export { registerRulerPatch }    from "./ruler-patch";
export { registerTileConfigHook } from "./tile-config";
export { registerTokenConfigHook } from "../ui/token-config";
```
`module.ts` imports all four registrations from this one file. This is the same
barrel anti-pattern as I9 (wall-core, wall-ops): adds indirection and hides the
actual location of each symbol.

**Fix:** Remove the three re-export lines from `scene-config.ts`. Update `module.ts`
to import each registration function directly from its source file:
- `registerRulerPatch` from `./transform/ruler-patch`
- `registerTileConfigHook` from `./transform/tile-config`  
- `registerTokenConfigHook` from `./ui/token-config`
Risk: 🟢 (import-path-only change in module.ts).

---

### I17 — `scene-config.ts` and `tile-config.ts` are UI code in `transform/`

`transform/scene-config.ts`: AppV2 tab injection into SceneConfig. Reads projection
flags to build a dropdown; injects HTML form fields; wires change events.

`transform/tile-config.ts`: AppV2 tab injection into TileConfig. Same pattern.

Both are form-injection UI code. `ui/` already holds `token-config.ts` (same
pattern) and `tab-helpers.ts`. The asymmetry — token config in `ui/`, scene/tile
config in `transform/` — is a cohesion failure: `transform/` should contain
coordinate and rendering math, not DOM form code.

**Fix:**
- Move `transform/scene-config.ts` → `ui/scene-config.ts`.
- Move `transform/tile-config.ts` → `ui/tile-config.ts`.
- Update `module.ts` imports (already cleaned up by I16, now points to `./ui/scene-config` etc.).
- Relative imports inside scene-config.ts that reference `./stage-transform` or
  `./constants` will need updating to `../transform/stage-transform` etc.
- `ruler-patch.ts` stays in `transform/` — it patches coordinate transform behaviour,
  not UI. Only the config form files move.

---

<!-- I18 DONE (folded into A3) -->

---

## Priority + sequencing

Dependencies shown as arrows. Do in this order within each group.

### Group A — Eliminating duplication (no behavior change, low risk)

<!-- A1–A4 DONE -->

| Step | What | Risk | Files changed | Gain |
|------|------|------|---------------|------|
| A5 | I8: Extract `buildBoxVerts` in `overlay-geometry.ts` | 🟢 | 1 file | Eliminate 35 lines of duplication |
| A6 | I9: Update `wall-manager.ts` imports to direct paths; delete `wall-core.ts` + `wall-ops.ts` | 🟢 | 2 files deleted + 1 updated | Remove 2 barrel files |
| A7 | I15: Remove re-export chains — strip mesh-corners passthrough from `tile-drag.ts`; strip `drawDashedContour` from `handle-draw.ts`; strip unused backward-compat re-exports from `handle-factories.ts`; update all consumers to import from true source | 🟢 | ~6 files | Import paths reflect real module boundaries |
| A8 | I16: Remove barrel re-exports from `scene-config.ts`; update `module.ts` to import each registration from its source file | 🟢 | 2 files | Remove hidden indirection barrel |

### Group B — Cohesion fixes (moderate restructuring, low-medium risk)

| Step | What | Risk | Files changed | Gain |
|------|------|------|---------------|------|
| B1 | I10: Move `onRenderTileHUD` from `wall-manager.ts` → `hud/hud-patches.ts` | 🟡 | 2 files | Correct responsibility |
| B2 | I11: Add `currentProjection()` to `constants.ts`; update all in-canvas call sites | 🟢 | ~10 files | Readability at every call site |
| B3 | I12: Move `overlay-geometry.ts` → `draw/volume-box.ts`; move `volume/settings.ts` → `src/settings.ts`; delete `volume/` folder | 🟡 | ~5 importers + module.ts | Remove misleading folder |
| B4 | I17: Move `transform/scene-config.ts` → `ui/scene-config.ts`; move `transform/tile-config.ts` → `ui/tile-config.ts`; fix relative imports inside both files | 🟡 | 2 files moved + module.ts | `transform/` = math only; `ui/` = all config forms |

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
| `tiles/tile-drag.ts` | 167 | ~140 (I7 + I15 removes re-exports) |
| `tokens/token-gizmos.ts` | 160 | ~125 (I6 + I7) |
| `hud/hud-patches.ts` | 25 | ~80 (I10) |
| `util.ts` | 4 | ~40 (I3+I4+I5+I6+I18) |
| `transform/scene-config.ts` → `ui/scene-config.ts` | 122 | ~115 (I16 removes barrel lines; I17 moves file) |
| `gizmos/handle-factories.ts` | 66 | ~52 (I15 removes unused re-exports) |
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

## Files to move after this plan

- `transform/scene-config.ts` → `ui/scene-config.ts` (I17)
- `transform/tile-config.ts` → `ui/tile-config.ts` (I17)

## Math centralization — final state

After all A–C steps the canonical location for each class of pure math:

| Math | Location |
|------|----------|
| Projection constants + `getProjection` + `currentProjection` | `transform/constants.ts` |
| `canvasZoom`, `gridDistance`, `elevToCanvas`, `screenToCanvas` | `src/util.ts` |
| Box vertex geometry (`buildBoxVerts`) | `draw/volume-box.ts` (private) |
| Tile drag projection (`projectDrag`) | `tiles/tile-drag.ts` |
| Token/tile shared image-drag math (after I7) | `tiles/tile-drag.ts` (shared helpers) |
| Background drag math (`commitBgDrag`) | `background/bg-drag.ts` |
| Snap helpers (`snapQuarterPx`, `snapQuarterUnits`) | `gizmos/mesh-corners.ts` |
