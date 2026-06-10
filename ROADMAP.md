# isoroll — Roadmap

> Pending work only. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.
>
> **Context for agents:** Each phase includes file paths, function names, flags, and key technical terms needed to implement without prior session context.

---

## Phase 4 — Image Edit Mode 🔲 UX PENDING

Handles and contour already work. Only the mode-switching UX is missing.

- [ ] **Double-click enters image-edit mode** — volume handles hidden while active; image handles shown
  - Entry point: `src/tiles/tile-gizmos.ts` (`VolumeGizmos`) and `src/tokens/token-gizmos.ts` (`TokenGizmos`)
  - Need a per-tile/token `imageEditMode` state flag (in-memory, not persisted)
  - On enter: hide volume handles, keep image handles; on exit: restore
- [ ] **Fine-tune numeric text inputs for offset/scale** — `src/ui/tile-config.ts`, `src/ui/token-config.ts`
- [ ] **ESC / click-outside exits image-edit mode** — keydown listener + pointerdown-outside check in gizmo classes

---

## Phase 9 — Token Depth Refinement 🔲 PENDING

**Problem:** `src/sorter/depth-sorter.ts` uses a single-pass sort with key `x/gs + y/gs + elev/gs` on all `canvas.primary.children`. Two tokens at the same grid cell and same elevation get identical keys → render order is arbitrary and may flicker every canvas refresh.

**Solution:** After the main sort, run a pairwise epsilon-offset pass over tokens with close sort keys. If token A's footprint "occludes" token B (A is south/east of B in isometric terms), nudge A's effective sort key by a small epsilon so it consistently renders in front of B.

**Key code:**
- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` (main sort on `canvas.primary`), `DepthSorter.objectSortKey()` (key formula)
- Reference implementation: isometric-perspective fork `foreground.js` `refineTokenOrdering()` (lines 408–428) and `occludes()` (lines 343–352)
- `occludes(a, b)` test from fork: `a.x <= b.x && (a.y + a.height) >= b.y` (tile/token occludes another if south-east in iso space)

**Scope:** Only affects token-to-token ordering. Tile-to-tile and tile-to-token ordering handled by main sort key (elevation-aware, correct for non-overlapping objects).

---

## Phase 10 — Ground Shadow + Unselected Elevation Line 🔲 PENDING

Two new visuals for elevated tokens/tiles. Both drawn in our stage-level overlay layers (not in `canvas.primary`) — unaffected by the vision/fog masking issue in Phase 11.

### Ground shadow
A circle or rounded-rectangle drawn at the token's ground position when elevated, indicating where on the floor the token stands.

- **Where to add:** `src/draw/volume-box.ts` — new function `drawGroundShadow(g, v)` using `v.ground` (already computed by `buildBoxVerts`). Draw before `drawAnchorLine`.
- **Called from:** `src/tokens/token-overlay.ts` `TokenOverlay.show()` and `src/tiles/tile-overlay.ts` `VolumeOverlay.draw()`
- **New flags** (add to `src/flags.ts` `VolumeFlags`):
  - `flags.isoroll.shadowEnabled` (bool, default true)
  - `flags.isoroll.shadowShape` (`"circle"` | `"rect"`, default `"circle"`)
  - `flags.isoroll.shadowRadius` (number, multiplier of `gridSize/2`, default 1.0)
  - `flags.isoroll.shadowOpacity` (number 0–1, default 0.3)
- **Config UI:** add shadow controls to Iso tab in `src/ui/token-config.ts` and `src/ui/tile-config.ts`

### Unselected elevation line
A thin dashed black line from ground to token base, always visible when `elevation > 0` and token is NOT selected. Distinct from the existing orange anchor line (which is selected-only).

- **Where to add:** `src/tokens/token-elev-gizmo.ts` `TokenElevGizmo.show()` — this class already renders when unselected (manages the elevation label). Add the dashed line here, gated by `selected === false && elev > 0`.
- `v.ground` and `v.baseCenter` from `computeTokenVerts()` give start/end points (already used by `drawAnchorLine`)
- Use `PIXI.Graphics` dashed line pattern (manual dash array via repeated `moveTo/lineTo` over the segment)
- Color: black `0x000000`, alpha ~0.35, line width 1px screen-space
- Existing orange anchor line in `drawAnchorLine()` (`src/draw/volume-box.ts`) stays as-is (selected state, orange `ORANGE` constant)

---

## Phase 11 — Separate Rendering Layer Architecture 🔲 PENDING (PREREQUISITE for Phase 12)

**This is a prerequisite for Phase 12 (fog-of-war) and fixes a fundamental display bug.**

### The problem

`canvas.primary` (Foundry's `PrimaryCanvasGroup`) renders all token and tile meshes to an intermediate texture. Foundry then applies a `VisibilityFilter` post-process shader to that texture, which reads the vision polygon from `canvas.visibility` and darkens/hides pixels in unexplored areas.

Our counter-transforms (rotation, skew, scale applied to `token.mesh` / `tile.mesh`) make sprite images visually extend **beyond the token's official grid footprint in world space**. Since the `VisibilityFilter` clips by the vision polygon (which only covers the grid footprint area), the parts of the sprite outside that footprint are hidden in fog — a tall character shows only the grid-sized square.

**Confirmed rendering stack:**
```
canvas.app.stage  ← isoroll applies rotation + skew here
  ├── canvas.primary (PrimaryCanvasGroup) ← VisibilityFilter applied here
  │     ├── canvas.primary.tokens  ← TokenMesh objects live here
  │     └── canvas.primary.tiles   ← TileMesh objects live here
  ├── canvas.effects  (lighting, vision sources)
  └── canvas.visibility  (CanvasVisibility — vision polygon texture)
```

The `VisibilityFilter` uniforms: `visionTexture`, `primaryTexture`, `exploredColor`, `unexploredColor`. It's a screen-space post-process — clips ALL pixels in canvas.primary that fall outside the vision polygon, including sprite overflow from our counter-transforms.

### The solution

Create a new `PIXI.Container` added directly to `canvas.stage` (NOT a child of `canvas.primary`) — call it the **Iso Sprite Layer**. This container is outside the `VisibilityFilter` scope. For each counter-transformed token/tile:

1. Clone the mesh sprite into the Iso Sprite Layer with matching transforms (position, rotation, skew, scale, anchor, texture)
2. Set the original mesh in `canvas.primary` to `alpha = 0` (hidden but Foundry still manages it for hit detection / mechanics)
3. Manage depth ordering in the Iso Sprite Layer using the same sort key as `DepthSorter` (`x/gs + y/gs + elev/gs`)
4. Manage visibility state manually (see Phase 12)

**Reference:** isometric-perspective fork `foreground.js`:
- `setupContainers()` — adds container to `canvas.stage` directly
- `cloneTileSprite()` (lines 223–241) — copies `position`, `anchor`, `angle`, `rotation`, `skew`, `scale`, `texture` from mesh
- `cloneTokenSprite()` (lines 243–271) — same for tokens, also copies `alpha` from `baseAlpha` flag

**Hooks needed:** `drawToken`, `refreshToken`, `destroyToken`, `drawTile`, `refreshTile`, `destroyTile`, `canvasReady`, `updateScene`

**Sync on refresh:** On every `refreshToken`/`refreshTile`, update the clone's transform to match the current mesh (position shifts during movement animation). Use the doc-state cache pattern already in `TokenElevGizmo` (see `lastState` map) to skip no-op refreshes.

**Our `LayerManager`** (`src/render/layer-manager.ts`) already manages stage-level containers — extend it or add the Iso Sprite Layer alongside existing keys in `LAYER_KEYS`.

**Depth ordering in new layer:** After cloning, sort the Iso Sprite Layer children by the same key. Wire into `DepthSorter.sort()` — run on both `canvas.primary.children` (for Foundry mechanics) and the new layer (for visual output).

### Scope decisions to make during implementation
- Counter-transformed objects only (tiles/tokens with isoroll flags set) go into the Iso Sprite Layer; non-transformed objects stay native
- Hit detection stays in `canvas.primary` (original mesh, alpha=0 but still interactive)
- The Iso Sprite Layer sits above `canvas.primary` but below HUD layers

---

## Phase 12 — Fog-of-War Tile Integration 🔲 PENDING (requires Phase 11)

**Context:** isoroll tiles are 3D wall/prop objects. When a tile is not in the player's explored area it should behave like the background does — dimmed if explored-but-fogged, hidden if unexplored. This is especially important because tiles function as scene walls.

### Behaviors
- **Explored + visible:** full alpha (clone in Iso Sprite Layer renders normally)
- **Explored + fogged (not currently visible):** dim with `ColorMatrixFilter` (darken), same effect as native Foundry background fog
- **Unexplored:** hide clone entirely

### Per-tile opt-out
- New flag: `flags.isoroll.hideOnFog` (bool, default `false`) — when true, tile hides in both fogged and unexplored states (useful for secret-room walls that should vanish when explored but not in LOS)

### Implementation approach
- Use `canvas.visibility.testVisibility({ object, tolerance })` to test each tile's visibility state per refresh — same API used by isometric-perspective fork `applyVisibilityCulling()` (`foreground.js` lines 500–612)
- Sample the tile's center point (and optionally corner points for large tiles) against the vision polygon
- `ColorMatrixFilter` for the fog-dim state: apply to clone sprite, not original mesh
- Trigger re-evaluation on `sightRefresh` hook (fires when vision polygon updates), `updateToken` (token moves = sight changes), `canvasReady`

### Reference
- isometric-perspective fork `updateLayerOpacity()` (lines 185–221) for per-sprite alpha modulation pattern
- `applyVisibilityCulling()` (lines 500–612) for the testVisibility sampling pattern

---

## Phase 13 — Door Secondary Image 🔲 PENDING

**Context:** Tiles with linked door walls already support `hide`, `fade`, and `none` behavior when the door opens/closes (`src/walls/wall-door.ts` `applyDoorBehavior()`). This phase adds a fourth mode: swap to a secondary texture.

**Use case:** A tile showing a closed door → when opened, show a tile with an open doorway (or doorframe, or nothing).

### New flag
- `flags.isoroll.doorOpenTexture` (string URL) on `TileDocument`
- Add to `DoorBehavior` type in `src/walls/wall-types.ts`: new mode `"image"` alongside `"hide"`, `"fade"`, `"none"`

### Implementation
- `src/walls/wall-door.ts` `applyDoorBehavior()` — add `mode === "image"` branch:
  - On open (`isOpen = true`): swap `tile.mesh.texture` to texture loaded from `doorOpenTexture` flag
  - On close (`isOpen = false`): restore original texture from `tile.document.texture.src`
- Texture loading: use `loadTexture(url)` (Foundry's async texture loader) — cache the loaded texture
- `cycleDoorBehavior()` in same file: add `"image"` to cycle sequence after `"fade"`

### Config UI
- `src/ui/tile-config.ts` Iso tab: add texture picker field for `doorOpenTexture` (shown only when door behavior = image)
- Show/hide the texture field dynamically based on current behavior mode in the config form

---

## Phase 14 — Painter's Algorithm: Research + Design Guidelines 🔲 PENDING

**This is a research and documentation phase, not a full implementation.**

### The problem
The painter's algorithm (z-sort by key) breaks when objects have **cyclic occlusion relationships**: Tile A should render in front of B, B in front of C, C in front of A. No linear z-order satisfies all three. This is inherent to isometric projection with arbitrarily-sized objects.

Our current `DepthSorter` (`src/sorter/depth-sorter.ts`) uses a single key and has no cycle detection. The isometric-perspective fork also does not solve this — it uses a foreground/background split as a blunt workaround (foreground tiles always above tokens, eliminating tile-tile cycles).

### Known solutions to research

1. **Topological sort + cycle detection + breaking**
   - Build a directed acyclic graph (DAG) of occlusion relationships between objects
   - Detect cycles via DFS; break each cycle by removing the weakest edge (heuristic: shortest overlap area)
   - Sort by topological order
   - Cost: O(n²) edge testing per frame for n objects

2. **Tile splitting**
   - Subdivide tiles at overlap boundaries so each sub-tile fits within a single "depth band"
   - Guarantees correct sort but creates many more objects
   - User-facing: at placement time, auto-split large tiles that would create cycles

3. **BSP tree**
   - Classic game technique; partition scene recursively
   - Expensive to maintain with dynamic objects (tiles can move/resize)

4. **User design guidelines** (pragmatic mitigation)
   - Avoid overlapping foreground tiles that are larger than one grid cell
   - Use the z-sort `document.sort` property to assign coarse depth bands for intentional layering
   - Document which layouts will cause unsolvable cycles

### What to study
- Foundry's `document.sort` property on tiles (integer, used as coarse z-band — the fork uses `TILE_STRIDE = 10000` bands of 10000 depth units each)
- Whether exposing a sort-band UI in isoroll (Iso tab on TileConfig) gives users enough manual control to work around cycles without an algorithmic fix
- Cost of O(n²) topological sort at scene scale (typical scenes: 20–200 tiles)

### Key code reference
- `src/sorter/depth-sorter.ts` — `DepthSorter.sort()` is the entry point for any changes
- isometric-perspective fork `foreground.js` `assignTileDepths()` (lines 316–341) for the banded model
- isometric-perspective fork `computeTokenEntries()` (lines 354–406) for the second-pass violation correction

---

## Phase 6 — Stance State Machine 🔲 PENDING

- [ ] dnd5e hook integration (attack, skill, condition changes)
- [ ] Keyboard shortcut for manual stance override
- [ ] Fallback chain resolution at display time

---

## Phase 7 — Template Scene 🔲 PENDING

- [ ] Pre-built scene: ISO enabled, sample tiles placed
- [ ] Demonstrates volume gizmos + occlusion

---

## Phase 8 — Right-Click Context Menus 🔲 PENDING

- [ ] Redundant access to all controls (volume edit, image edit, presets)

---

## Future — Multiview 🔲 DEFERRED

- 8 directional facings + TOP
- Auto-detect from token movement direction

## Future — Animations 🔲 DEFERRED

- Single-frame impact → fluid frame sequences
- Frame naming: `{name}_{stance}_{facing}_{frame:04d}.{ext}`
