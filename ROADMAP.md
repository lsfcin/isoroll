# isoroll — Roadmap
> Pending work only — a finished item is cut, not ticked; done work is deleted and git is the history. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.

<!-- Goal: agent-ready roadmap. Each milestone includes file paths, function names, flag names,
     and technical context sufficient for implementation without prior session context. -->

## Status

Feature Phases 3 + 4 complete. **Phase 5 (door secondary image) is next feature priority.**

IsoRenderer refactor — Phases 0–11 complete, merged to `develop`. Wall bugs 3a/3b/3c + B29 + B28 + B31 fixed. Occluder lifecycle path verified.

**Active branch:** `develop` — Phase 6 slice z-ordering complete and merged. Phase 6B (per-slice fog) deferred (see below). B28 and B31 resolved this session.

## Backlog

- **P4 — TS scene assembler (`ts-assembler`)** ✅ DONE — Pure TS twin of scene_assemble.py in src/assemble/; golden-diff parity vs Python on l-room + novel twin-room fixture (4 views, tie-rule validation, 59/59 tests green).
- **P6 floor/fog spike (`floor-fog-spike`)** 🔲 IN FLOW — evidence spike: floor-as-iso-tiles (merged strips) vs live background regen, measured for fog participation. Plan: `.loop/floor-fog-spike/1-plan.md`. Decision left OPEN for Lucas (☐ co-decide); resolves SCENE-CREATION § Floor/background.
- **P7a — Painter MVP-1 (`painter-mvp-1`)** 🔲 IN FLOW — in-Foundry painter for the FROZEN grammar CORE (walls/floors/openings + slice + live re-assembly + auto WallDefs); MVP-2 (sloped groups / opacity-window / group-ops) deferred to a separate loop. Plan: `.loop/painter-mvp-1/1-plan.md`.
- **Shadow params in presets** — shadow shape, radius, opacity, and enabled state should be included when saving/loading image presets for tiles and tokens. Currently presets only capture image transform fields.
- **Assess Last Asylum for z-blocking** (INBOX 2026-08-01, ref in [refs/REFS.md](refs/REFS.md)) — Lucas flagged it as an isometric game that avoids z-blocking well. Look at it against **Phase 6** below and separate the two mechanisms it could be using: *authoring* discipline (level layout that never puts a tall occluder on a camera-near cell) versus *runtime* handling (cutaway walls, fade-on-overlap, per-slice sorting). Only the second is ours to copy; the first belongs to the painter grammar in `isoroll-content`. Scoping pass, not a build.

## Rejected

- **Matching the stage projection to the bake's camera** instead of turning the manifest's cells on
  import (CP-2, 2026-08-01). It is expressible — rotation +45° with both skews negated reproduces
  isoroll-content's `x = u - v` exactly — but it breaks the `a = c` invariant every preset is built
  on, so `heightDir` stops being `{1,-1}` and `counterFactor`'s derivation no longer holds. The turn
  belongs to the importer, the only thing that crosses the two frames.

---

## Phase 6B — Per-Slice Fog Visibility 🔲 DEFERRED

### Deferred Reason

Per-slice fog creates hard immersion breaks: vertical-crop slice boundaries are visible
in the fog edge, cutting the 3D tile silhouette in an obviously wrong way for voxel-art tiles.
Whole-tile fog (broadcast from `slices[0]`) reinstated. Revisit only after finding a fog-edge
approach that respects the tile's silhouette (e.g. silhouette mask, per-cell alpha, or
geometry-aware fade rather than a hard crop boundary).

**Already implemented and committed:**
- `sliceCellOverlaps()` in `src/render/iso-tile-geom.ts` — cell→slice mapping utility, ready for reuse.
- `drawCellMarkers()` refactored in `src/render/iso-tile-debug-cells.ts` to call `sliceCellOverlaps`.
- `applySliceFog()` logic in git working-tree history (never committed); see session 2026-06-30.

### Context

Slice z-ordering is solved. Each tile is split into `Wg+Hg-1` PIXI.Sprite slices on the
`LAYER_KEYS.ISO_SPRITES` (`"iso-sprites"`) layer on `canvas.stage`. The cell→slice
association algorithm is implemented in `src/render/iso-tile-geom.ts::sliceCellOverlaps`.

**Layer warning (for future implementors):** A prior attempt applied fog to slices placed in the
wrong layer — they appeared BEHIND the fog layer. Always use `LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES)`
— same call used in `_createTileSlices()` in `iso-tile-renderer.ts`.

### Fog State Vocabulary

No formal enum. Three states in the fog system:
- **VISIBLE** — `testPointVisible(pt, viewers)` returns true → `tint = 0xffffff`, `visible = true`, id added to `seenTileIds`
- **EXPLORED** — in `seenTileIds` but not currently visible → `tint = EXPLORED_TINT (0x808080)`, `visible = true`
- **UNSEEN** — never seen, not visible → `visible = false` (if `hideOnFog=true`) or checked via `canvas.fog.isPointExplored` (if `hideOnFog=false`)

Functions in `src/render/fog-state.ts`: `testPointVisible`, `testPerimeterVisible`, `applyNonVisibleFog`, `seenTileIds`, `EXPLORED_TINT`.
Functions in `src/render/fog-apply.ts`: `applyTileFog` (current whole-tile version), `getViewers`.

### Current behavior (to replace)

`onSightRefresh()` in `iso-tile-renderer.ts:141–167`:
1. Calls `applyTileFog(slices[0], ...)` — tests the whole tile AABB
2. Broadcasts `slices[0].tint/visible/alpha/filters` to all other slices

All slices share identical fog state — no per-slice granularity.

### Target behavior

Each slice gets fog state from the MAX visibility of its overlapping grid cells:
- VISIBLE beats EXPLORED beats UNSEEN
- Test each cell's world center with `testPointVisible({ x: cx + gs/2, y: cy + gs/2 }, viewers)`
- Store per-cell result, then for each slice pick the best cell result
- Apply tint/visible/alpha to that slice independently (not copied from slice[0])
- `seenTileIds` stays at tile granularity (tracks if ANY slice was ever seen)

### Implementation plan

**Step 1 — Extract shared cell→slice overlap utility** (new export, probably in `iso-tile-geom.ts` or a new `iso-tile-cell-overlap.ts`):

```typescript
// Returns for each slice index the list of overlapping cell (dc,dr) pairs.
// Same N/S corner algorithm as drawCellMarkers — NORTH=(cx+gs,cy), SOUTH=(cx,cy+gs).
export function sliceCellOverlaps(
  cuts: number[], fw: number, Wg: number, Hg: number,
  snapX: number, snapY: number, gs: number,
  ax: number, flipped: boolean, mesh: MeshRef
): Map<number, Array<{dc: number; dr: number}>>
```

**Step 2 — New `applySliceFog` function** (new helper in `fog-apply.ts` or `iso-tile-renderer.ts`):

```typescript
function applySliceFog(
  slices: PIXI.Sprite[], tile: Tile,
  doc: PlaceableDoc, tileId: string,
  hideOnFog: boolean, viewers: Token[]
): void
```

Calls `sliceCellOverlaps`, then for each slice i:
1. Get overlapping cells
2. For each cell test `testPointVisible(cellCenter, viewers)`
3. Best result → apply tint/visible to `slices[i]`
4. Still add tileId to `seenTileIds` if ANY cell of ANY slice is currently visible

**Step 3 — Wire into `onSightRefresh()`** — replace `applyTileFog` + broadcast loop with `applySliceFog`.

### Key Files

- `src/render/iso-tile-renderer.ts` — `onSightRefresh()` (lines 141–167), `_createTileSlices()` (line 62 for layer reference)
- `src/render/iso-tile-debug-cells.ts` — `drawCellMarkers()` — source of truth for N/S corner algorithm and `sliceBounds` construction; duplicate logic to shared util
- `src/render/fog-apply.ts` — `applyTileFog()` (current whole-tile impl to keep as fallback)
- `src/render/fog-state.ts` — `testPointVisible`, `seenTileIds`, `EXPLORED_TINT`, `applyNonVisibleFog`
- `src/render/layer-manager.ts` — `LAYER_KEYS.ISO_SPRITES = "iso-sprites"` — must match layer used in `buildSlice()`

### Checklist

- [x] Extract `sliceCellOverlaps()` utility (shared by debug + fog)
- [x] Update `drawCellMarkers()` to call utility instead of inline logic
- [x] Implement `applySliceFog()` using per-cell visibility tests
- [x] Wire `applySliceFog()` into `onSightRefresh()` replacing the current whole-tile broadcast
- [ ] Verify slices appear on the correct layer (not behind fog) — compare with `_createTileSlices` layer call

---

## Phase 5 — Door Secondary Image 🔲 PENDING

### Problem

Tiles with linked door walls support `hide`, `fade`, and `none` behavior on door open/close. No way to swap to a secondary texture (e.g. closed door tile → open doorway tile).

### Solution

Add a fourth door behavior mode `"image"` that swaps `tile.mesh.texture` to a configurable secondary texture on open, restores on close.

### Checklist

- [ ] Add `"image"` to `DoorBehavior` type in `src/walls/wall-types.ts`
- [ ] Add `flags.isoroll.doorOpenTexture` (string URL) to `TileDocument` flags in `src/flags.ts`
- [ ] Add `mode === "image"` branch in `applyDoorBehavior()` in `src/walls/wall-door.ts`: on open swap `tile.mesh.texture` to texture loaded from flag; on close restore from `tile.document.texture.src`
- [ ] Cache loaded texture (use Foundry's `loadTexture(url)`)
- [ ] Add `"image"` to cycle sequence in `cycleDoorBehavior()` in `src/walls/wall-door.ts` (after `"fade"`)
- [ ] Add texture picker field for `doorOpenTexture` to Iso tab in `src/ui/tile-config.ts` (shown only when behavior = `"image"`)

### Key Files

- `src/walls/wall-door.ts` — `applyDoorBehavior()`, `cycleDoorBehavior()`
- `src/walls/wall-types.ts` — `DoorBehavior` type
- `src/flags.ts` — tile flags
- `src/ui/tile-config.ts` — Iso tab config form

---

## Phase 6 — Painter's Algorithm: Research + Design Guidelines 🔲 PENDING

### Problem

The painter's algorithm (z-sort by key) breaks with cyclic occlusion: Tile A in front of B, B in front of C, C in front of A — no linear z-order satisfies all three. Inherent to isometric projection with arbitrarily-sized objects. Acute for multi-cell tiles: a single tile occupies multiple depth bands simultaneously, so one `zIndex` value is correct for part of the tile and wrong for the rest.

Current `IsoSpriteLayer._sort()` is a stub (Phase 3 wiring only). No sort algorithm runs yet.

### Core Design: Iso-Diagonal Slice Model

**Insight (session 2026-06-11):** If every rendered object fits inside exactly one grid cell, painter's algorithm works — ties don't matter because adjacent cells never cyclically occlude each other. Multi-cell tiles break this because they straddle multiple depth bands simultaneously.

**Solution: slice each multi-cell tile into per-iso-column strips, sort each strip independently.**

#### Frontier Cells

For a tile with footprint W×H grid cells (col 0..W-1, row 0..H-1), **frontier cells** are those on the SE-facing edges visible to the camera:

```
frontier(c, r) = (c == W-1) OR (r == H-1)
```

Example — 3×3 tile (iso projection, camera SE, depth = col+row):

```
iso-depth 0:      N              ← (0,0)  interior
iso-depth 1:    N   N            ← (1,0),(0,1)  interior
iso-depth 2:  F   N   F          ← (2,0),(1,1),(0,2)  edges=F, center=N
iso-depth 3:    F   F            ← (2,1),(1,2)  both frontier
iso-depth 4:      F              ← (2,2)  SE corner
```

Frontier count = W + H - 1. For 3×3: 5 frontier cells, 4 interior.

#### Iso-Diagonal Columns (slices)

In SE isometric projection, "iso-diagonal columns" are diagonals at constant `col - row`. For a W×H tile there are `W + H - 1` such diagonals (iso columns), indexed `k = 0..(W+H-2)`.

Each iso column k contains all grid cells where `c - r = k - (H-1)`, clipped to the footprint. Sorting depth for iso column k = `tile_col + tile_row + k` (a continuous, monotonically increasing sequence across the tile).

**Slicing maps tile image columns to iso-diagonal columns.** For an untransformed (counter-transformed) tile, the image x-axis aligns with the world's east direction, so image-space x increases monotonically with iso depth. This means:

- Vertical cuts in image space at `W + H - 1` equally-spaced x-positions produce `W + H - 1` rectangular slices
- Each slice i gets depth key = `tile_base_depth + i`
- Adjacent slices are in strict depth order — no ties, no cycles within the tile itself
- Each slice is an independent `PIXI.Sprite` (sub-frame of shared base texture, zero extra VRAM)

#### Cut Point Calculation

For an untransformed tile, the iso projection maps grid cell (c, r) to image-space x:

```
x_img(c, r) = img_width * (c * cos_θ - r * sin_θ + offset) / projected_tile_width
```

where θ is the iso stage rotation angle, and `projected_tile_width` is the tile's full width in iso-projected image space.

Simpler approximation for implementation:
- Iso column k → image x cut at `x_k = img_width * k / (W + H - 1)`
- This is correct when imageOffset = 0 and the tile exactly fills its footprint
- With imageOffset: shift all cut points by `imageOffset.x * gridSize / img_width`

**Recompute when:** tile is dropped after drag, `imageOffset` changes, or scene gridSize changes. Not per-frame. Cache as `flags.isoroll.sliceCuts: number[]` (or compute on demand from flag values at draw time).

#### Slice Depth Assignment

```
slice[i].zIndex = (tile_col + tile_row) * BAND + i
```

where `BAND` is large enough to separate tile sort bands without collision (e.g. `BAND = W + H` rounded up to next power of 2, or a fixed `BAND = 256` safe for tiles up to 256 cells wide).

#### Token Insertion

After tile slices have depth keys, insert each token clone between the slices it belongs between:

- Token at `(tx, ty)` with size `(tw, th)` — compute its iso column: `k_token = tx/gridSize - ty/gridSize + (H - 1)` relative to the tile
- Token depth = `(tile_col + tile_row) * BAND + k_token + 0.5` (float, between two slice keys)
- Token renders in front of all slices at iso columns < k_token, behind all slices at iso columns > k_token

#### Cyclic Occlusion (residual problem)

Slicing eliminates within-tile cycles. Cross-tile cycles (Tile A slice in front of Tile B, but another slice of B in front of A) can still occur with overlapping tiles. This is inherent to painter's algorithm — Phase 6 research evaluates whether cycle detection or user-facing `document.sort` bands are the right mitigation.

### Implementation Changes vs Phase 3

| Phase 3 | Phase 6 |
|---------|---------|
| `tileClones: Map<string, PIXI.Sprite>` | `tileSlices: Map<string, PIXI.Sprite[]>` |
| one Sprite per tile | `W+H-1` Sprites per tile, shared base texture |
| `createTileClone(t)` | `createTileSlices(t)` — creates N sprites with `texture.frame` sub-rects |
| `syncSprite(clone, mesh)` | `syncSlice(slices, mesh)` — update positions of all slices |
| single `clone.zIndex` | each slice has its own zIndex |
| `removeClone(...)` | destroy all slice sprites |

`tokenClones` structure unchanged — tokens are already 1-cell sorted (or small enough that depth error is imperceptible).

### Checklist

- [x] Verify iso projection → image-space x mapping formula — uniform vertical cuts in image-x suffice; image-x increases monotonically with depth for counter-transformed tiles
- [x] Implement `createTileSlices(tile)` using `PIXI.Texture` frame sub-rects (`_createTileSlices` in `src/render/iso-sprite-layer.ts`)
- [x] Implement `syncSlices(slices, mesh)` — position all slices, keep them clipped to the corresponding image band (`_syncSlice`)
- [x] Implement token depth insertion between tile slices — tokens use `(x/gs + y/gs + elev/gs) * DEPTH_SCALE`; tiles use `(baseDepth + i) * DEPTH_SCALE`; tokens interleave at their depth
- [ ] Handle `imageOffset` shift in cut point calculation — deferred; cut formula assumes imageOffset=0 (correct for most tiles)
- [ ] Research cyclic occlusion between different tiles (topological sort vs. `document.sort` bands)
- [ ] Write recommendations: at what tile count does O(n²) cycle detection become expensive?
- [ ] If sort-band UI is viable: add sort-band field to Iso tab in `src/ui/tile-config.ts`

### Key Files

- `src/render/iso-sprite-layer.ts` — `_sort()` stub, `tileClones` (becomes `tileSlices`)
- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` calls `IsoSpriteLayer._sort()`
- `src/transform/` — iso projection params needed for cut point formula

### References

- isometric-perspective fork `foreground.js`:
  - `assignTileDepths()` (lines 316–341) — banded depth model (no slicing — tiles treated as single units, which is the problem we're solving)
  - `computeTokenEntries()` (lines 354–406) — token insertion between tile bands

---

## Phase 7 — Image Edit Mode UX 🔲 PENDING

### Problem

Image handles and contour work. Mode-switching UX is missing — no way to enter/exit image-edit mode without touching volume handles.

### Solution

Double-click enters image-edit mode (volume handles hidden, image handles shown). ESC or click-outside exits. Numeric inputs for offset/scale.

### Checklist

- [ ] Add per-tile/token `imageEditMode` in-memory state flag to `VolumeGizmos` (`src/tiles/tile-gizmos.ts`) and `TokenGizmos` (`src/tokens/token-gizmos.ts`)
- [ ] On enter image-edit mode: hide volume handles, keep image handles; on exit: restore
- [ ] Wire double-click entry point in gizmo classes
- [ ] Add ESC keydown listener to exit image-edit mode
- [ ] Add pointerdown-outside check to exit image-edit mode
- [ ] Add fine-tune numeric text inputs for offset/scale in `src/ui/tile-config.ts` and `src/ui/token-config.ts`

### Key Files

- `src/tiles/tile-gizmos.ts` — `VolumeGizmos`
- `src/tokens/token-gizmos.ts` — `TokenGizmos`
- `src/ui/tile-config.ts`, `src/ui/token-config.ts`

### Scope

`imageEditMode` is in-memory only — not persisted to flags.

---

## Phase 8 — Stance State Machine 🔲 PENDING

### Problem

Stance switching exists but lacks system integration and manual override.

### Checklist

- [ ] dnd5e hook integration (attack, skill, condition changes)
- [ ] Keyboard shortcut for manual stance override
- [ ] Fallback chain resolution at display time

---

## Phase 9 — Template Scene 🔲 PENDING

### Checklist

- [ ] Pre-built scene: ISO enabled, sample tiles placed
- [ ] Demonstrates volume gizmos + occlusion

---

## Phase 10 — Right-Click Context Menus 🔲 PENDING

### Checklist

- [ ] Redundant access to all controls (volume edit, image edit, presets)

---

## Future — Multiview 🔲 DEFERRED

- 8 directional facings + TOP
- Auto-detect from token movement direction

## Future — Animations 🔲 DEFERRED

- Single-frame impact → fluid frame sequences
- Frame naming: `{name}_{stance}_{facing}_{frame:04d}.{ext}`
