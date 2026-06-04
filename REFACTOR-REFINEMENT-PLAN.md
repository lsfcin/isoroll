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

<!-- I1–I9 DONE (A1–A6) -->
<!-- I15 DONE (A7, 4226b71) — mesh-corners passthrough + drawDashedContour chain + handle-factories unused re-exports all removed -->
<!-- I16 DONE (A8, c355ff2) — barrel re-exports removed from scene-config.ts -->
<!-- Extra (unplanned, agreed): helpers moved to gizmos/img-drag.ts — no tile/token hierarchy -->

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

<!-- I15 DONE (A7, 4226b71) -->

<!-- I16 DONE (A8, c355ff2) -->

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

<!-- A1–A8 DONE -->
<!-- A5: buildBoxVerts extracted in overlay-geometry.ts (3cfdd15) -->
<!-- A6: wall-core.ts + wall-ops.ts deleted; all importers rewired to direct sources (fa83421) -->
<!-- A7: mesh-corners passthrough removed from tile-drag.ts; drawDashedContour re-export removed from handle-draw.ts; unused backward-compat re-exports removed from handle-factories.ts (4226b71) -->
<!-- A8: barrel re-exports removed from scene-config.ts; module.ts imports direct (c355ff2) -->

### Group B — Cohesion fixes (moderate restructuring, low-medium risk)

<!-- B1 DONE (6d8c13f + 0d3b844) — onRenderTileHUD moved to hud/; HudPatches split into TileHud/TokenHud/HudUtils; WallManager public façade added -->
<!-- B2 DONE (2692922) — currentProjection() added; 15 call sites updated -->
<!-- B3 DONE (d059969) — overlay-geometry → draw/volume-box; volume/settings → src/settings; volume/ deleted -->
<!-- B4 DONE (d2a3800) — scene-config + tile-config moved from transform/ to ui/ -->

### Group C — Structural pattern (higher impact, requires care)

<!-- C1 DONE (f2f3afd) — startPointerDrag<T> added to util.ts; drag boilerplate removed from VolumeGizmos, TokenGizmos, TokenElevGizmo, BackgroundGizmos (~56 lines eliminated) -->
<!-- C2 DONE (a01f10d) — bg-html.ts extracted from bg-gizmos.ts; bg-gizmos 172 → 104 lines -->

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
- ~~`walls/wall-core.ts` (barrel, I9)~~ — deleted (A6)
- ~~`walls/wall-ops.ts` (barrel, I9)~~ — deleted (A6)

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
