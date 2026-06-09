# isoroll-module — Coordinate System Refactor Plan

## Goal

Standardize all coordinate transforms into an unmistakeable, modular system.
Each coordinate space = one module. All conversions route through WORLD as hub.
Consistent naming for variables across all files.

---

## Coordinate Systems (canonical names)

| System | Description | Key unit |
|--------|-------------|----------|
| WORLD | Canvas/scene pixel space. Origin = scene top-left (incl. padding). `tile.document.x/y` (CENTER), `token.document.x/y` (TOP-LEFT). | canvas px |
| VIEWPORT | Foundry `<canvas>` element pixels. | canvas element px |
| SCREEN | Browser window pixels (`clientX/Y`). | browser px |
| IMAGE | Per-tile texture, normalised [0,1]². `(0,0)` = top-left, `(1,1)` = bottom-right. | unitless |
| GRID | Grid-unit coords. `world = grid × gridSize`. | grid units |
| ISO3D | Conceptual 3D space. `x/y` = world footprint at elev=0, `z` = elevation in grid-distance units. | mixed |

**IMPORTANT — tile.document coords (Foundry v14):**
- `tile.document.x/y` = CENTER of tile footprint, canvas pixels (WORLD space)
- `tile.document.width/height` = canvas pixels
- `token.document.x/y` = TOP-LEFT of token footprint, canvas pixels (WORLD space)
- `token.document.width/height` = grid units → multiply by gridSize for pixels

---

## Variable Naming Standard

### Scalars
| Old | New | Meaning |
|-----|-----|---------|
| `gs` | `gridSize` | canvas.grid.size — canvas pixels per grid unit |
| `gd` | `gridDist` | canvas.grid.distance — world distance per grid unit |
| `E` | `elevPx` | elevation offset in canvas pixels |

### Coordinate variables (suffix = coord space)
| Suffix | Space | Example |
|--------|-------|---------|
| `World` | WORLD canvas px | `baseCenterWorld`, `anchorWorld` |
| `Vp` | VIEWPORT px | `ptVp` |
| `Screen` | SCREEN browser px | `ptScreen` |
| `UV` | IMAGE [0,1]² | `anchorUV` |
| `Grid` | GRID units | `posGrid` |
| `Iso3D` | ISO3D | `posIso3D` |

### Projection fields
| Old | New | Meaning |
|-----|-----|---------|
| `hdx`, `hdy` | `proj.heightDir.x`, `proj.heightDir.y` | elevation direction vector |
| `E * hdx` | `elevPx * proj.heightDir.x` | world-space elevation offset x |

---

## Target File Structure (transform/)

```
transform/
  coord-types.ts           ← types: P2, P3, AffineMatrix, TileMeshCoord  [KEEP, already good]
  coord-sys-viewport.ts    ← VIEWPORT ↔ WORLD  [from dev-viewport.ts — already correct]
  coord-sys-screen.ts      ← SCREEN ↔ WORLD    [from dev-screen.ts — needs wt param fix]
  coord-sys-grid.ts        ← GRID ↔ WORLD      [from dev-grid.ts — already correct]
  coord-sys-image.ts       ← IMAGE ↔ WORLD     [from dev-image.ts — already correct]
  coord-sys-iso3d.ts       ← ISO3D ↔ WORLD     [from dev-iso3d.ts — already correct]
  coord-map.ts             ← facade re-exports + transformCoord() dispatcher [update in place]
  coord-transforms.ts      ← DELETE after wiring (all fns moved to coord-sys-*.ts)
  coord-debug.ts           ← keep, no changes needed
  stage-transform.ts       ← keep, no changes needed
  bg-transform.ts          ← keep, no changes needed
  object-transform.ts      ← keep, no changes needed
  tile-transform.ts        ← variable renames only
  token-transform.ts       ← variable renames only
  ruler-patch.ts           ← keep, no changes needed
```

**DELETE after all steps complete:**
- `dev-coord-types.ts` (empty stub)
- `dev-viewport-transform.ts` (empty stub)
- `dev-world-transform.ts` (empty stub)
- `dev-world.ts` (world = hub = identity, no module needed)
- `dev-coord-dispatcher.ts` (replaced by coord-map.ts dispatcher)
- `coord-map-new.ts` (replaced by updated coord-map.ts)
- `coord-map.ts.backup`

---

## curried API contract

Every `coord-sys-*.ts` module must export exactly:

```typescript
// Convert FROM this space TO world
export const toWorld = (params...) => (p: P2 | P3) => P2;

// Convert FROM world TO this space
export const fromWorld = (params...) => (p: P2) => P2 | P3;
```

Dispatcher in `coord-map.ts` composes: `fromWorld(toSysParams)(toWorld(fromSysParams)(p))`.

---

## Steps (ordered, each independently testable)

### STEP 1 — Create coord-sys-screen.ts (from dev-screen.ts, fixed)
**File:** `src/transform/coord-sys-screen.ts`
**Prerequisite:** also create `coord-sys-viewport.ts` (Step 2a — needed as import)
**Problem:** `dev-screen.ts.toWorld()` only does screen→viewport (subtracts rect). Missing viewport→world leg.
**Fix:**
```typescript
import type { P2, AffineMatrix } from './coord-types.js';
import { toWorld as vpToWorld, fromWorld as worldToVp } from './coord-sys-viewport.js';

const getCanvasRect = () => (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();

export const toWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  const rect = getCanvasRect();
  const vpFn = vpToWorld(wt);
  return (p: P2) => vpFn({ x: p.x - rect.left, y: p.y - rect.top });
};

export const fromWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  const rect = getCanvasRect();
  const worldFn = worldToVp(wt);
  return (p: P2) => {
    const vp = worldFn(p);
    return { x: vp.x + rect.left, y: vp.y + rect.top };
  };
};
```
**Test:** roundtrip `toWorld(wt)(fromWorld(wt)(pt))` === pt.

---

### STEP 2 — Rename dev-viewport/grid/image/iso3d to coord-sys-*
**Files:** create new files with fixed imports (P2/P3 from `coord-types`, not `dev-world`):
- `dev-viewport.ts` → `coord-sys-viewport.ts`
- `dev-grid.ts` → `coord-sys-grid.ts`
- `dev-image.ts` → `coord-sys-image.ts`
- `dev-iso3d.ts` → `coord-sys-iso3d.ts`

Fix imports in each: replace `from '../world.js'` → `from './coord-types.js'`

**Test:** `tsc --noEmit` passes.

---

### STEP 3 — Update coord-map.ts dispatcher to use coord-sys-* modules
**File:** `src/transform/coord-map.ts`

Replace current dispatcher with coord-sys-* based one:
```typescript
export type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types.js';
export type CoordSystem = 'SCREEN' | 'VIEWPORT' | 'WORLD' | 'IMAGE' | 'GRID' | 'ISO3D';

import { toWorld as screenToWorld, fromWorld as worldToScreen } from './coord-sys-screen.js';
import { toWorld as vpToWorld,     fromWorld as worldToVp }     from './coord-sys-viewport.js';
import { toWorld as gridToWorld,   fromWorld as worldToGrid }   from './coord-sys-grid.js';
import { toWorld as imageToWorld,  fromWorld as worldToImage }  from './coord-sys-image.js';
import { toWorld as iso3dToWorld,  fromWorld as worldToIso3d }  from './coord-sys-iso3d.js';
```
Keep `transformCoord()` signature identical — callers (tile-transform.ts, coord-debug.ts) must not change.

**Test:** `transformCoord(pt, 'WORLD', 'IMAGE', { mesh })` in tile-transform still works (no behaviour change).

---

### STEP 4 — Delete dead files
Remove:
- `dev-coord-types.ts`
- `dev-viewport-transform.ts`
- `dev-world-transform.ts`
- `dev-world.ts`
- `dev-coord-dispatcher.ts`
- `coord-map-new.ts`
- `coord-map.ts.backup`

After deletion: `tsc --noEmit` must pass. Build must pass.

---

### STEP 5 — Delete coord-transforms.ts (now redundant)
All functions re-expressed in coord-sys-*.ts.
Verify no remaining imports of `coord-transforms.ts` before deleting.

---

### STEP 6 — Rename variables in tile-transform.ts
Pure rename, zero logic change. Target:
- `gs` → `gridSize`
- `gd` → `gridDist`
- `E` → `elevPx`
- `baseCenter` → `baseCenterWorld` (clarifies WORLD space)
- `anchorUV` stays `anchorUV` (UV is already correct caps)
- `boundH` stays (already clear: bound height in canvas px)
- `hdx`, `hdy` → `const hDir = proj.heightDir`, then `hDir.x`, `hDir.y`

**Test:** `tsc --noEmit` passes. No runtime change.

---

### STEP 7 — Rename variables in token-transform.ts
Same renames: `gs` → `gridSize`, `gd` → `gridDist`, `E` → `elevPx`.
Inline `hdx`/`hdy` via `const hDir = proj.heightDir`.

**Test:** `tsc --noEmit` passes.

---

### STEP 8 — Rename params in util.ts elevToCanvas()
```typescript
// Before:
export function elevToCanvas(elev: number, gs: number, gd: number): number

// After:
export function elevToCanvas(elev: number, gridSize: number, gridDist: number): number
```
Update all call sites (tile-transform.ts, token-transform.ts, draw/volume-box.ts).

**Test:** `tsc --noEmit` passes.

---

### STEP 9 — Fix anchor refresh trigger (separate bug fix)
**Problem:** When `imageOffset` flag changes in the UI, `onRefreshTile` must re-fire.
**Investigate:** Where does imageOffset flag update originate? Does it call `tile.refresh()`?
**Fix:** Ensure the flag-update path calls `tile.refresh()` so anchor recalculates.

---

## Invariants to preserve throughout

1. `transformCoord()` public signature unchanged — no callers break.
2. `tsc --noEmit` must pass after each step.
3. `applyTileCounter` logic untouched until explicitly planned.
4. Anchor compute order in `onRefreshTile` untouched until Step 9.
5. `coord-transforms.ts` stays alive until Step 5 confirms no imports remain.

---

## Current callers of coord-map (must not break)

- `src/transform/tile-transform.ts` — imports `transformCoord, P2`
- `src/transform/coord-debug.ts` — imports `transformCoord, CoordSystem, TransformContext, P2, P3`
