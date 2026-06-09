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

## Remaining Step

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
