# isoroll — Roadmap
> Pending work only. Completed milestones move to HISTORY.md. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.

<!-- Goal: agent-ready roadmap. Each milestone includes file paths, function names, flag names,
     and technical context sufficient for implementation without prior session context. -->

## Status

Phases 3 and 4 complete. Phase 5 is next priority. Phase 1 (token depth) still pending.

## Backlog

- **Shadow params in presets** — shadow shape, radius, opacity, and enabled state should be included when saving/loading image presets for tiles and tokens. Currently presets only capture image transform fields.

---

## Phase 1 — Token Depth Refinement 🔲 PENDING

### Problem

`DepthSorter` uses a single-pass sort with key `x/gs + y/gs + elev/gs` on all `canvas.primary.children`. Two tokens at the same grid cell and same elevation get identical keys → render order is arbitrary and may flicker every canvas refresh.

### Solution

After the main sort, run a pairwise epsilon-offset pass over tokens with close sort keys. If token A's footprint occludes token B (A is south/east of B in isometric space), nudge A's effective sort key by a small epsilon so it consistently renders in front. Uses `occludes(a, b)` pairwise test: `a.x <= b.x && (a.y + a.height) >= b.y`.

### Checklist

- [ ] Implement `occludes(a, b)` helper in `depth-sorter.ts`
- [ ] Add second-pass epsilon-offset loop in `DepthSorter.sort()` after main sort

### Key Files

- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` (main sort on `canvas.primary`), `DepthSorter.objectSortKey()` (key formula)

### References

- isometric-perspective fork `foreground.js` — `refineTokenOrdering()` (lines 408–428), `occludes()` (lines 343–352)

### Scope

Only token-to-token ordering. Tile-to-tile and tile-to-token ordering handled by main sort key (elevation-aware, correct for non-overlapping objects).

---

## Phase 3 — Separate Rendering Layer Architecture ✅ COMPLETE

**Prerequisite for Phase 4. Fixes a fundamental fog-of-war display bug.**

### Problem

`canvas.primary` (`PrimaryCanvasGroup`) applies a `VisibilityFilter` post-process shader that clips all pixels outside the vision polygon. Isoroll's counter-transforms (rotation, skew, scale on `token.mesh`/`tile.mesh`) make sprites visually extend beyond the token's official grid footprint. The `VisibilityFilter` only covers the footprint area — sprite overflow is hidden in fog, so a tall character shows only a grid-sized square.

```
canvas.app.stage  ← isoroll applies rotation + skew here
  ├── canvas.primary (PrimaryCanvasGroup) ← VisibilityFilter applied here
  │     ├── canvas.primary.tokens  ← TokenMesh objects live here
  │     └── canvas.primary.tiles   ← TileMesh objects live here
  ├── canvas.effects  (lighting, vision sources)
  └── canvas.visibility  (CanvasVisibility — vision polygon texture)
```

There is **no fix within `canvas.primary`** — the VisibilityFilter clips at geometry level. Moving sprites out is the only architectural option.

### Why This Also Fixes Sorting

With sprites inside `canvas.primary`, `DepthSorter` fights Foundry's own `zIndex` management on the same children. Moving counter-transformed objects to our own `PIXI.Container` gives us 100% sort ownership — no more fighting PCG's internal sort. The fork's `assignTileDepths()` + `computeTokenEntries()` pattern (tile-band → token-insertion model) also directly solves Phase 1's token-to-tile occlusion problem, making Phase 1 redundant after Phase 3.

### Solution

Create a new `PIXI.Container` (the **Iso Sprite Layer**) added directly to `canvas.stage` — outside `VisibilityFilter` scope. For each counter-transformed token/tile:

1. Clone the mesh sprite into the Iso Sprite Layer with matching transforms (`position`, `anchor`, `angle`, `rotation`, `skew`, `scale`, `texture`)
2. Set the original mesh in `canvas.primary` to `alpha = 0` (hidden but Foundry manages it for hit detection/mechanics)
3. Sort the Iso Sprite Layer children by the same key as `DepthSorter`
4. Manage visibility state manually (Phase 4)

### Design Decisions (from assessment session 2026-06-11)

**Incremental update, NOT full rebuild.**
The fork (`foreground.js`) calls `foreground.removeChildren()` and re-clones everything on every hook fire (`refreshToken`, `refreshTile`, `updateToken`, `sightRefresh`, etc.). This allocates and GCs 20–200 `PIXI.Sprite` objects per call. Our approach: keep a `Map<id, PIXI.Sprite>` of live clones; on `refreshToken`/`refreshTile` update transforms in-place; only create/destroy on `drawToken`/`destroyToken`.

Use the `lastState` cache pattern from `src/tokens/token-elev-gizmo.ts` to skip no-op refreshes.

**`sortableChildren = false`, manual sort only.**
Setting `sortableChildren = true` on the container triggers `Array.sort()` every render frame when any zIndex changes. Instead, set `sortableChildren = false`, assign `zIndex` manually, and call `.children.sort(...)` only inside our `DepthSorter.sort()` (triggered by position/elevation hooks, not every frame).

**Do NOT replicate the fork's DB write.**
`computeTokenEntries()` in the fork calls `canvas.scene.updateEmbeddedDocuments('Tile', updates)` inside a sort function — a database write per refresh. Never do this. Our sort is read-only.

**Texture sharing is free.**
`PIXI.Sprite(mesh.texture)` shares the WebGL texture handle — zero extra VRAM. Each clone is a separate draw call (no batching across containers), but at 20–50 objects with mixed textures Foundry is already batching-limited anyway. +50 draw calls at 60fps ≈ 0.8ms GPU, negligible on modern hardware.

**Only counter-transformed objects go into the layer.**
Check `flags.isoroll.transformToken` / `flags.isoroll.transformTile`. Non-transformed objects stay in `canvas.primary` with full VisibilityFilter coverage — correct behavior.

**Hit detection stays in `canvas.primary`.**
Original mesh remains at `alpha=0` but fully interactive. Our clone in the Iso Sprite Layer has `eventMode = "passive"` — no events.

### Implementation Steps (one step = one test cycle)

1. **Container bootstrap** — add `ISO_SPRITE_LAYER` to `LAYER_KEYS`, create `IsoSpriteLayer` class with `activate()` that creates the container on `canvasInit` and tears it down on `changeScene`. Test: verify container exists on `canvas.stage` in Foundry console.

2. **Clone functions** — implement `cloneSprite(mesh)` pure function (shared by tile + token), `syncSprite(clone, mesh)` for transform updates. No hooks yet. Test: call manually from console.

3. **Token lifecycle hooks** — `drawToken` → create clone + set mesh alpha=0; `refreshToken` → `syncSprite` (with lastState cache); `destroyToken` → remove clone + restore mesh alpha. Test: place/move/delete a token with `transformToken=true`.

4. **Tile lifecycle hooks** — same pattern for `drawTile`/`refreshTile`/`destroyTile`. Test: place/move/delete a tile with `transformTile=true`.

5. **Rebuild on canvas reload** — `canvasReady` → iterate existing placeables and create clones for any already-transformed objects. Test: reload scene, verify clones appear.

6. **Sort wiring** — wire `IsoSpriteLayer.sort()` into `DepthSorter.sort()` using tile-band + token-insertion model from fork. Test: place tiles at different depths, verify z-order correct.

### Checklist

- [x] Add Iso Sprite Layer container to `LayerManager` in `src/render/layer-manager.ts` (new key in `LAYER_KEYS`, added to `canvas.stage` directly)
- [x] Implement `cloneSprite(mesh)` and `syncSprite(clone, mesh)` in new `src/render/iso-sprite-layer.ts`
- [x] Hook `drawToken`, `refreshToken`, `destroyToken` — create/sync/destroy token clones
- [x] Hook `drawTile`, `refreshTile`, `destroyTile` — create/sync/destroy tile clones
- [x] Hook `canvasReady` — rebuild clones for all already-placed transformed objects
- [x] Wire Iso Sprite Layer sort into `DepthSorter.sort()`
- [x] Set original mesh `alpha = 0` for counter-transformed objects; restore on destroy
- [x] Add `IsoSpriteLayer.activate()` to `src/core/module.ts` + add `ISO_SPRITE_LAYER` to `declareOrder`

### Key Files

- `src/render/layer-manager.ts` — `LayerManager`, `LAYER_KEYS`
- `src/render/iso-sprite-layer.ts` — new file, all clone/sync/hook logic
- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` (entry point for dual-layer sort)
- `src/tokens/token-elev-gizmo.ts` — `lastState` map (doc-state cache pattern to reference)
- `src/core/module.ts` — activate + declareOrder

### References

- isometric-perspective fork `foreground.js`:
  - `setupContainers()` — adds container directly to `canvas.stage`
  - `cloneTileSprite()` (lines 223–241)
  - `cloneTokenSprite()` (lines 243–271)
  - `assignTileDepths()` (lines 316–341) — tile-band depth model (use, but read-only)
  - `computeTokenEntries()` (lines 354–406) — token insertion between tile bands (use, but read-only — NO DB writes)
  - `updateAlwaysVisibleElements()` (lines 485–496) — full-rebuild pattern (DO NOT replicate — use incremental instead)

### Scope

Only counter-transformed objects (tiles/tokens with isoroll flags set) go into the Iso Sprite Layer. Non-transformed objects stay native. Hit detection stays in `canvas.primary` (original mesh, `alpha=0` but still interactive). Iso Sprite Layer sits above `canvas.primary`, below HUD layers. Fog visibility management is Phase 4.

---

## Phase 4 — Fog-of-War Visibility Management ✅ COMPLETE

**Requires Phase 3.**

### Problem

Clones in the Iso Sprite Layer are outside `canvas.primary`'s `VisibilityFilter` (that's intentional — fixes the hard-clip bug). However, `canvas.visibility` is a **separate global compositing pass** that darkens/hides pixels EVERYWHERE on the stage based on the vision polygon — including our Iso Sprite Layer. Result: the parts of a token/tile sprite that extend beyond the grid footprint are darkened by fog even though the footprint itself is in vision.

Observed: token footprint cell = bright; overflow pixels outside footprint = darkened by `canvas.visibility`. During Foundry drag preview, fog is temporarily bypassed → sprite appears fully lit → fog returns on drop. This is the expected Phase 4 problem, not a Phase 3 bug.

**Scope: both tokens AND tiles.** Tiles need it because they are 3D props. Tokens need it because their counter-transformed sprite overflows the footprint.

### Approach

**Do NOT use `token.visible` / `tile.visible`** — these are transient PIXI properties that return `false` during drag mid-states and layer switches (learned in Phase 3; caused clone to disappear). Instead:

- `document.hidden` → controls game-level visibility (GM hide)
- `canvas.visibility.testVisibility()` → determines fog/vision state

For tokens and tiles: sample `testVisibility()` at the footprint center (and perimeter for large objects). Apply result uniformly to the entire clone — the whole sprite is either in-vision or fogged, never per-pixel.

### Visibility State Table

| `document.hidden` | `testVisibility` result | Clone behavior |
|---|---|---|
| `true` | any | `visible = false` (GM hidden) |
| `false` | fully visible | Full `document.alpha` |
| `false` | explored + fogged | `ColorMatrixFilter` darken (tiles) / hide (tokens, unless setting allows) |
| `false` | unexplored | `visible = false` |

### `testVisibility()` call pattern (from fork `foreground.js` lines 511–518)

```js
// viewers = controlled tokens (or all player-owned visible tokens as fallback)
for (const viewer of viewers) {
  if (canvas.visibility?.testVisibility({ x, y }, { object: viewer })) return true;
}
```

Sample the footprint center; for tiles larger than 1 grid cell also sample corners and perimeter edges at grid-step intervals (fork `applyVisibilityCulling` lines 520–532 for the perimeter loop pattern).

### Phase 3 current state (baseline for Phase 4)

`clone.visible = !document.hidden` — only GM-hidden is respected. Fog state is ignored entirely. Phase 4 replaces this with the full visibility table above.

### Checklist

**Tokens:**
- [x] On `refreshToken` and `sightRefresh`: run visibility check for all token clones; apply result to clone
- [x] Token clone: visible if in-vision; hidden if unexplored or `document.hidden`; fogged explored = hide by default (token shouldn't be revealed in explored fog)

**Tiles:**
- [x] Add `flags.isoroll.hideOnFog` (bool, default `false`) to `VolumeFlags` in `src/flags.ts` — when true, tile hides in both fogged and unexplored states
- [x] On `refreshTile` and `sightRefresh`: run visibility check for all tile clones
- [x] Explored + visible → full alpha; explored + fogged → tint 0x808080 darken; unexplored → hide
- [x] Add `hideOnFog` toggle to Iso tab in `src/ui/tile-config.ts`

**Shared:**
- [x] Trigger full visibility re-evaluation on: `sightRefresh`, `canvasReady`, `updateToken`
- [x] Determine viewer tokens: controlled tokens → fallback to player-owned visible tokens
- [x] For GM (no fog): skip testVisibility, show everything

### Key Files

- `src/render/iso-sprite-layer.ts` — clone registries, hook into `sightRefresh`
- `src/flags.ts` — `VolumeFlags` type (add `hideOnFog`)
- `src/ui/tile-config.ts` — Iso tab (add `hideOnFog` toggle)

### References

- isometric-perspective fork `foreground.js`:
  - `updateLayerOpacity()` (lines 185–221) — per-sprite alpha modulation pattern
  - `applyVisibilityCulling()` (lines 500–612) — `testVisibility` sampling, viewer resolution, perimeter loop, seenBy persistence
  - `registerFogOfWarHooks()` (lines 84–101) — fog reset hook pattern (`resetFogOfWar`)

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

- [ ] Verify iso projection → image-space x mapping formula (check against actual isoroll stage transform params in `src/transform/`)
- [ ] Implement `createTileSlices(tile)` using `PIXI.Texture` frame sub-rects
- [ ] Implement `syncSlices(slices, mesh)` — position all slices, keep them clipped to the corresponding image band
- [ ] Implement token depth insertion between tile slices
- [ ] Handle `imageOffset` shift in cut point calculation
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
