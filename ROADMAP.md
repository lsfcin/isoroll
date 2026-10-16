# isoroll — Roadmap
> Pending work only — a finished item is cut, not ticked; done work is deleted and git is the history. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.

<!-- Goal: agent-ready roadmap. Each milestone includes file paths, function names, flag names,
     and technical context sufficient for implementation without prior session context. -->

## Status

**Phase 5 (door secondary image) is next feature priority.**

## Backlog

- **[animater] Assess Animater** — compatibility with Isoroll projection, elevation, occlusion and asset requirements; refs/REFS.md (backlog).
- **[modder-patterns] Assess Universal Modder** — transferable discovery, asset production, live-game verification and field-note patterns against our workflow; refs/REFS.md (backlog). Use reproducible Foundry fixtures.
- **[object-brush] Compare the demonstrated object-brush controls** with the frozen painter grammar; identify compatible improvements for Lucas to choose; refs/REFS.md (backlog).
- **[unimate] Assess UniMate** — availability, license, rig inputs, hardware, contact quality and baked-animation export requirements; refs/REFS.md (backlog). Check playback timing and facing support.

- **P6 floor/fog spike (`floor-fog-spike`)** 🔲 IN FLOW — evidence spike: floor-as-iso-tiles (merged strips) vs live background regen, measured for fog participation. Plan: `.craft/floor-fog-spike/1-plan.md`. Decision left OPEN for Lucas (☐ co-decide); resolves SCENE-CREATION § Floor/background.
- **P7a — Painter MVP-1 (`painter-mvp-1`)** 🔲 IN FLOW — in-Foundry painter for the FROZEN grammar CORE (walls/floors/openings + slice + live re-assembly + auto WallDefs); MVP-2 (sloped groups / opacity-window / group-ops) deferred to a separate loop. Plan: `.craft/painter-mvp-1/1-plan.md`.
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

## Phase 6 — Painter's Algorithm: Remaining Research

Remaining work:
- [ ] Handle `imageOffset` in cut-point calculation; current assumption is zero offset. Recompute on tile drop, offset or grid-size changes, not per frame.
- [ ] Research cross-tile cyclic occlusion: topological sorting versus `document.sort` bands. Slicing solves within-tile cycles only.
- [ ] Establish when O(n²) cycle detection becomes expensive.
- [ ] If bands are viable, add the sort-band field to `src/ui/tile-config.ts`.

Inspect `src/render/iso-tile-renderer.ts`, `src/render/iso-sprite-layer.ts`, `src/sorter/depth-sorter.ts` and projection parameters in `src/transform/`; the isometric-perspective fork's `assignTileDepths()` / `computeTokenEntries()` remain comparison leads.

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
