# isoroll — Roadmap
> Pending work only. Completed milestones move to HISTORY.md. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.

<!-- Goal: agent-ready roadmap. Each milestone includes file paths, function names, flag names,
     and technical context sufficient for implementation without prior session context. -->

## Status

Phase 2 complete. Phase 1 is next priority.

## Backlog

<!-- Unscheduled ideas not yet tied to a phase. -->

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

## Phase 3 — Separate Rendering Layer Architecture 🔲 PENDING

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

- [ ] Add Iso Sprite Layer container to `LayerManager` in `src/render/layer-manager.ts` (new key in `LAYER_KEYS`, added to `canvas.stage` directly)
- [ ] Implement `cloneSprite(mesh)` and `syncSprite(clone, mesh)` in new `src/render/iso-sprite-layer.ts`
- [ ] Hook `drawToken`, `refreshToken`, `destroyToken` — create/sync/destroy token clones
- [ ] Hook `drawTile`, `refreshTile`, `destroyTile` — create/sync/destroy tile clones
- [ ] Hook `canvasReady` — rebuild clones for all already-placed transformed objects
- [ ] Wire Iso Sprite Layer sort into `DepthSorter.sort()`
- [ ] Set original mesh `alpha = 0` for counter-transformed objects; restore on destroy
- [ ] Add `IsoSpriteLayer.activate()` to `src/core/module.ts` + add `ISO_SPRITE_LAYER` to `declareOrder`

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

## Phase 4 — Fog-of-War Tile Integration 🔲 PENDING

**Requires Phase 3.**

### Problem

Isoroll tiles function as 3D scene walls/props. Once in the Iso Sprite Layer (Phase 3), they are outside `VisibilityFilter` — they will always render regardless of fog state. Tiles need manual visibility management matching native Foundry fog behavior.

### Solution

Sample each tile's visibility state using `canvas.visibility.testVisibility()` and apply alpha/filter to the clone sprite accordingly.

| State | Behavior |
|---|---|
| Explored + visible | Full alpha |
| Explored + fogged | Dim via `ColorMatrixFilter` |
| Unexplored | Hide clone entirely |

### Checklist

- [ ] Add `flags.isoroll.hideOnFog` (bool, default `false`) to `VolumeFlags` in `src/flags.ts` — when true, tile hides in both fogged and unexplored states
- [ ] Implement per-tile visibility state check using `canvas.visibility.testVisibility({ object, tolerance })` sampling tile center (and optionally corners for large tiles)
- [ ] Apply `ColorMatrixFilter` (darken) to clone sprite for fogged state
- [ ] Hide clone (`alpha = 0`) for unexplored state
- [ ] Trigger re-evaluation on hooks: `sightRefresh`, `updateToken`, `canvasReady`
- [ ] Add `hideOnFog` toggle to Iso tab in `src/ui/tile-config.ts`

### Key Files

- `src/flags.ts` — `VolumeFlags` type
- `src/render/layer-manager.ts` — Iso Sprite Layer (Phase 3 output)
- `src/ui/tile-config.ts` — Iso tab

### References

- isometric-perspective fork `foreground.js`:
  - `updateLayerOpacity()` (lines 185–221) — per-sprite alpha modulation pattern
  - `applyVisibilityCulling()` (lines 500–612) — `testVisibility` sampling pattern

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

The painter's algorithm (z-sort by key) breaks with cyclic occlusion: Tile A in front of B, B in front of C, C in front of A — no linear z-order satisfies all three. Inherent to isometric projection with arbitrarily-sized objects. Current `DepthSorter` has no cycle detection.

### Solution

Research phase only — no full implementation. Evaluate solutions, assess costs at scene scale (20–200 tiles), and produce guidelines/recommendations for SPECS.md.

### Checklist

- [ ] Research topological sort + cycle detection + breaking (DAG of occlusion relationships, DFS cycle detection, break weakest edge by overlap area; cost O(n²))
- [ ] Research tile splitting (subdivide at overlap boundaries; guarantees correct sort but multiplies object count)
- [ ] Research BSP tree (classic technique; expensive to maintain with dynamic objects)
- [ ] Evaluate Foundry's `document.sort` property as a user-facing sort-band control (fork uses `TILE_STRIDE = 10000` bands)
- [ ] Assess cost of O(n²) topological sort at scene scale
- [ ] Write recommendations to SPECS.md: which approach to pursue, or whether sort-band UI is sufficient mitigation
- [ ] If sort-band UI is viable: add sort-band field to Iso tab in `src/ui/tile-config.ts`

### Key Files

- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` (entry point for any changes)

### References

- isometric-perspective fork `foreground.js`:
  - `assignTileDepths()` (lines 316–341) — banded depth model
  - `computeTokenEntries()` (lines 354–406) — second-pass violation correction

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
