# IsoRenderer Refactor
> Design document and migration plan for the IsoRenderer refactor (branch: `refactor/iso-renderer`).
> Read at session start before any work on this refactor. Do not derive the design from scratch — it is here.

## Goal

Isolate all direct Foundry/PIXI API calls to a declared set of boundary files.
Every visual rendering decision flows through one entry point (`IsoRenderer`).
Every canvas read flows through one accessor (`canvas-env.ts`).

**Before:** ~37 files touch `canvas.*` directly. ~8 overlay classes each duplicate the same ~25-line
PIXI lifecycle block (ensureLayer → new Container → addChild → bringToTop → Map registry → destroy).

**After:** Foundry/PIXI calls confined to ~12 boundary files. One rendering API. One canvas accessor.
Consumers (overlays, gizmos) declare *what* to draw — they never touch `canvas.*` or `PIXI.*`.

---

## Boundary Files

After the refactor, **only these files** may use `canvas.*`, `PIXI.*`, `Hooks.*`, `game.*`, `CONFIG.*` directly.
Every other file must import from boundary files or isoroll abstractions.

| File | Permitted direct calls | Reason |
|------|----------------------|--------|
| `core/canvas-env.ts` | `canvas.*`, `game.user`, `game.settings` | The one canvas accessor — this is the new entry point for all canvas reads |
| `core/flags.ts` | `game.settings.get`, `canvas.scene.getFlag` | Flag adapter — legit boundary by design |
| `render/layer-manager.ts` | `canvas.stage`, `PIXI.Container` | Layer registry — legit PIXI boundary |
| `render/iso-renderer.ts` | `PIXI.Container`, `PIXI.Graphics`, `PIXI.Sprite` | Rendering façade — this is where PIXI is allowed |
| `render/mesh-accessor.ts` | `tile.mesh`, `token.mesh` | Typed mesh reader — only place reading mesh geometry |
| `render/render-gate.ts` | `Hooks.on*` | Thin hook subscriber only — routes to render-lifecycle.ts |
| `transform/stage-transform.ts` | `canvas.app.stage`, `document.getElementById("hud")` | Isometric stage transform — legit adapter |
| `transform/bg-transform.ts` | `canvas.environment.primary.background`, `PIXI.*` | Background counter-transform — legit adapter |
| `transform/tile-transform.ts` | `tile.mesh`, `renderFlags.set` | Tile mesh mutation — legit adapter |
| `transform/token-transform.ts` | `token.mesh`, `renderFlags.set` | Token mesh mutation — legit adapter |
| `transform/ruler-patch.ts` | `CONFIG.Token/Tile.hudClass`, `canvas.app.stage` | Prototype patches — legit adapter (rename to hud-position-patch.ts: TODO) |
| `hud/hud-utils.ts` | DOM `.style`, `canvas.app.stage.worldTransform` | HUD CSS positioning |
| `ui/*` | `Hooks.on renderSceneConfig/TileConfig/TokenConfig/GridConfig` | AppV2 form injection |
| `occluder/occluder.ts` | `tile.mesh.alpha`, `canvas.tiles/tokens.placeables` | Alpha occlusion — self-contained system, high isolation risk, Phase 6 last |
| `render/fog-helpers.ts` | `canvas.visibility.testVisibility`, `canvas.fog.isPointExplored`, `canvas.tokens.controlled` | Fog visibility logic — called by iso-renderer for sight-tracked visuals |

---

## New Files

| File | Absorbs from | Responsibility |
|------|-------------|----------------|
| `core/canvas-env.ts` | ~37 files: `canvas.grid?.size ?? 100`, `canvas.app.stage.worldTransform`, `canvas.scene.getFlag`, `game.user.isGM`, `canvas.dimensions`, `canvas.tokens/tiles.placeables`, `canvas.scene.tokenVision`, `canvas.colors.fogExplored`, etc. | Single typed accessor. All canvas reads in non-boundary files route here. |
| `render/iso-renderer.ts` | 8 overlay classes (the repeated ensureLayer → new PIXI.Container → addChild → bringToTop → Map → destroy block) | Single rendering entry point. Owns PIXI Container lifecycle, key registry, z-order, sight-tracked state machine. |
| `render/iso-geometry.ts` | `draw/volume-box.ts`: `computeVerts`, `computeTokenVerts`, `tokenFootprint` | Footprint math. The **one** place reading `canvas-env.gridSize()` + `currentProjection()` to compute world-space geometry. After migration, `volume-box.ts` becomes pure (receives geometry in, draws it). |
| `render/mesh-accessor.ts` | 11 `as unknown as MeshLike` casts across overlays/gizmos/contour/mesh-corners | `geometryOf(placeable): MeshGeometry \| null`. One typed, null-safe reader of tile/token mesh geometry. |
| `render/render-lifecycle.ts` | `render/render-gate.ts` dispatch logic (moves here). Scattered hook handlers in overlays/gizmos. | Named lifecycle functions. ALL rendering decisions live here. See section below. |
| `core/history.ts` | 4 inconsistent `canvas.X.history.push(...)` sites in tile-drag, token-gizmos, token-elev-drag, wall-manager | Canonical pre-drag history push with one options policy. See undo note below. |

Existing `render/render-gate.ts` and `draw/volume-box.ts` slim down but remain.

---

## IsoRenderer API

```typescript
const IsoRenderer = {
  render(spec: RenderSpec): RenderHandle,
  clear(key: string): void,
  clearOwner(ownerId: string): void,
  clearLayer(layer: LayerKey): void,
  clearAll(): void,
};

interface RenderSpec {
  // What component this belongs to — drives default layer + lighting policy
  owner: { kind: "tile" | "token" | "background"; id: string };

  // What to draw — shape and interactivity are orthogonal
  visual:       ShapeSpec;
  interaction?: Interaction;   // any shape becomes a gizmo when this is present

  // Coordinate system for placement.anchor; IsoRenderer transforms to WORLD via coord-map
  space:    CoordSystem;       // "WORLD" | "ISO3D" | "GRID" | "IMAGE" | "SCREEN" | "VIEWPORT"
  placement: Placement;

  // Which layer (default derived from owner.kind if omitted)
  layer?: LayerKey;

  // Z-ordering within the layer
  z?: number | "top";

  // Visibility: follows fog/sight system or always draws
  visibility?: "always-visible" | "sight-tracked";  // default: "always-visible"

  // Apply inverse stage transform — visual appears screen-upright / undistorted
  // [NAME TBD — candidates: billboard, upright, screenAligned, flat, screenUp]
  screenUp?: boolean;

  // Idempotency key — render() with same key REPLACES the prior visual for that key
  key: string;   // e.g. "tile-abc123:box", "token-xyz:shadow"
}

// --- Shape types (discriminated union) ---

type ShapeSpec =
  | { kind: "rect";    w: number; h: number;  fill?: Color; stroke?: Stroke }
  | { kind: "circle";  radius: number;        fill?: Color; stroke?: Stroke }
  | { kind: "polygon"; points: P2[];          fill?: Color; stroke?: Stroke }
  | { kind: "3d-box";  verts: BoxVerts;       fill?: Color; stroke?: Stroke }
  | { kind: "lines";   build: (g: DrawAPI) => void }   // freeform — DrawAPI wraps PIXI.Graphics, no raw PIXI in consumer
  | { kind: "text";    content: string;       style: TextStyleSpec }
  | { kind: "sprite";  texture: TextureRef;   anchor?: P2; scale?: P2 };

// Optional: attached to any shape to make it interactive
interface Interaction {
  cursor?:        CSSCursor;
  onPointerDown?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerMove?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerUp?:   (e: PIXI.FederatedPointerEvent) => void;
}

interface Placement {
  anchor:  P2 | P3;   // point expressed in `space`
  offset?: P2;         // additional world-px nudge after coord transform
}

// Returned by IsoRenderer.render() — per-object control without re-specifying
interface RenderHandle {
  readonly key: string;
  show(): void;
  hide(): void;
  update(partial: Partial<RenderSpec>): void;
  remove(): void;
}
```

---

## Visibility Taxonomy

Named to match Foundry's own terminology (`fog.colors.explored/unexplored`, `fog.isPointExplored`,
`canvas.visibility.testVisibility`). Foundry's `CONST.LIGHTING_LEVELS` (DARKNESS/DIM/BRIGHT etc.) is
for light-source intensity on the scene — **we do not use it**.

```
visibility: "always-visible"   →  draw regardless of fog/vision state
                                   use for: GM overlays, gizmos, volume boxes, debug

            "sight-tracked"    →  follow token sight system (three states)
                                   use for: sprite clones, shadows, objects that should fog-match

When "sight-tracked", IsoRenderer internally manages tint on sightRefresh via fog-helpers.ts:
  visible    →  tint 0xffffff (full brightness)
  explored   →  tint canvas.colors.fogExplored  (Foundry's configured explored color)
  unexplored →  visible = false
```

Consumers declare intent. IsoRenderer owns the state machine.

---

## Lifecycle Entry Points (render-lifecycle.ts)

Single file. ALL rendering decisions (show/hide/update/clear) happen inside one of these functions.
`render-gate.ts` becomes a thin Foundry-hook subscriber that routes into here.
UI hooks (`renderSceneConfig/TileConfig/TokenConfig`) stay in `ui/` — form injection, not rendering.

```typescript
// Scene
export function onCanvasReady(): void
export function onCanvasTeardown(): void
export function onSceneChange(scene: Scene, changes: object): void

// Tile
export function onTileRefresh(tile: Tile): void
export function onTileFlagsChange(tile: Tile): void
export function onTileSelect(tile: Tile): void
export function onTileDeselect(tile: Tile): void
export function onTileMove(tile: Tile): void         // during drag

// Token
export function onTokenRefresh(token: Token): void
export function onTokenFlagsChange(token: Token): void
export function onTokenSelect(token: Token): void
export function onTokenDeselect(token: Token): void
export function onTokenMove(token: Token): void      // during drag

// Vision / fog
export function onSightRefresh(): void               // re-evaluate all sight-tracked visuals

// Background / GridConfig
export function onGridConfigOpen(app: Application): void
export function onGridConfigPreview(params: object): void
```

---

## Migration Strategy: Strangler Fig

Never two live versions of the same logic simultaneously.

1. New file created with full interface, initially calls old code inside.
2. Callers of the old code are updated to call the new file instead.
3. Old code inside new file replaced with real implementation.
4. Old file/class deleted only when fully replaced.

At every step: one source of truth, builds cleanly, loads in Foundry.

Example — `VolumeOverlay`:
- Step A: `IsoRenderer.render(...)` internally delegates to `VolumeOverlay.show()` → behavior unchanged
- Step B: `VolumeOverlay.show()` replaced to call `IsoRenderer.render(...)` → still one truth
- Step C: `VolumeOverlay` becomes a thin caller → delete class, inline call into lifecycle function

---

## Phase Plan

### Phase 0 — Pre-flight (no logic change, zero risk)
- [ ] Verify `sorter/depth-sorter.ts` `_sort()` reference: does `IsoSpriteLayer._sort()` exist?
      Per analysis: method name may be `_onTick` or similar — confirm and fix dead reference.
      (ROADMAP Phase 6 calls this "a stub" — reconcile with actual code before Phase 6 wiring.)
- [ ] Confirm branch `refactor/iso-renderer` created off `develop` ✓ (done)

### Phase 1 — Stub new files (zero runtime impact)
All new files: full TypeScript interfaces, `throw new Error("not implemented")` bodies or empty.
Build must pass. Nothing calls them yet.
- [ ] `core/canvas-env.ts`
- [ ] `render/iso-renderer.ts`
- [ ] `render/iso-geometry.ts`
- [ ] `render/mesh-accessor.ts`
- [ ] `render/render-lifecycle.ts`
- [ ] `core/history.ts`
- [ ] Add new files to their module's `index.ts` facades (facade-gate requirement)
- [ ] Build: `npm run build` passes

### Phase 2 — canvas-env goes live (mechanical, compiler-verified)
Implement all `canvas-env.ts` accessors. Mechanical find-replace in non-boundary files — no logic change.
- [ ] Implement accessors: `gridSize()`, `gridDistance()`, `gridUnits()`, `scene()`, `sceneFlag(key)`,
      `tokens()`, `tiles()`, `dimensions()`, `worldTransform()`, `stage()`, `isGM()`,
      `tokenVision()`, `fogColors()`
- [ ] Replace all scattered reads in non-boundary files:
      `canvas.grid?.size ?? 100` → `CanvasEnv.gridSize()`
      `canvas.app.stage.worldTransform` → `CanvasEnv.worldTransform()`
      `canvas.scene.getFlag(MODULE_ID, k)` → `CanvasEnv.sceneFlag(k)`
      `game.user.isGM` → `CanvasEnv.isGM()`
      `canvas.dimensions` → `CanvasEnv.dimensions()`
      (grep for each pattern, fix all non-boundary sites)
- [ ] Build; smoke test: load scene, enable isoroll, verify tiles/tokens render

### Phase 3 — iso-geometry + mesh-accessor go live
- [ ] Implement `iso-geometry.ts`: `tileVerts(tile)`, `tokenVerts(token)`, `footprint(placeable)`
      These read via `CanvasEnv.gridSize()` + `currentProjection()` — no raw `canvas.*`
- [ ] Implement `mesh-accessor.ts`: `geometryOf(placeable): MeshGeometry | null`
      Replaces all `as unknown as MeshLike` casts
- [ ] Refactor `draw/volume-box.ts`: remove canvas reads, receive geometry as param — purely functional
- [ ] Refactor `draw/contour.ts`: remove `canvas.app.stage.worldTransform` read, receive `wt` as param
- [ ] Update overlays/gizmos to call iso-geometry + mesh-accessor instead of reading directly
- [ ] Build; visual test: 3D box outline, shadow, contour on tile and token

### Phase 4 — render-lifecycle.ts goes live
- [ ] Implement lifecycle functions — empty bodies initially (no rendering yet, just the function shells)
- [ ] In `render-gate.ts`: move all `Hooks.on(...)` registrations to call lifecycle functions
- [ ] Move RenderGate's current dispatch/classification logic into the lifecycle functions
- [ ] Verify all hook paths still fire correctly:
      canvasReady, refreshTile, refreshToken, sightRefresh, updateScene, updateToken, drawToken, drawTile
- [ ] Build; smoke test: all interactions work (select, move, fog)

### Phase 5 — IsoRenderer proof: VolumeOverlay tile (one consumer end-to-end)
Gate on Phase 4. Validate the full API before committing the pattern to all other overlays.
- [ ] Implement `IsoRenderer` core:
      render/clear/clearOwner, RenderHandle, key→Container registry,
      LayerKey routing via LayerManager, z-order (zIndex + bringToTop),
      sight-tracked state machine via fog-helpers on sightRefresh
- [ ] Wire `VolumeOverlay` (tile only): replace ensureLayer/new PIXI/addChild/bringToTop/Map
      with `IsoRenderer.render({ key: "tile-{id}:box", visual: { kind:"3d-box", ... }, ... })`
- [ ] Wire shadow: same pattern with `kind:"sprite"` or `kind:"texture"`
- [ ] Visual test checklist:
      - [ ] Box appears on tile selection
      - [ ] Box disappears on deselect
      - [ ] Shadow renders correctly
      - [ ] Fog state transitions: visible → explored → unexplored
      - [ ] Re-enable scene: box re-renders
      - [ ] Delete tile: no orphan PIXI objects
- [ ] If visual test passes: proceed to Phase 6. If not: fix IsoRenderer, do not proceed.

### Phase 6 — Migrate remaining overlays (one PR per overlay)
- [ ] `VolumeOverlay` (token) → IsoRenderer
- [ ] `TokenBackground` (indicator, label, shadow) → IsoRenderer
- [ ] `VolumeGizmos` (tile gizmos) → IsoRenderer
- [ ] `TokenGizmos` → IsoRenderer
- [ ] `BackgroundGizmos` → IsoRenderer
- [ ] `WallOverlay` → IsoRenderer
- [ ] `Occluder` → IsoRenderer
      Risk: high (alpha-occlusion logic). Gate behind `settings.isorollNewOccluder` (default off).
      Remove flag only after extended visual verification.

### Phase 7 — UI + Background (plan separately before starting)
AppV2 + GridConfig + DOM have their own complexity. Do not start without an analysis session.
- [ ] Audit `ui/` files: what reads canvas beyond form injection?
- [ ] Audit `background/bg-gizmos.ts`, `bg-html.ts`: which calls are legit vs should use canvas-env?
      (`bg-transform.ts` is a legit boundary — do not change it)
- [ ] Refactor non-boundary calls in bg-gizmos + bg-html to use canvas-env + IsoRenderer
- [ ] Verify GridConfig preview flow end-to-end (live-preview + submit + cancel)
- [ ] Verify SceneConfig iso tab survives multiple opens (double-inject guard)

### Phase 8 — Cleanup + enforcement
- [ ] Implement `core/history.ts`: canonical `pushPreDrag(layer, entry)` with options `{isUndo: true}`
      WARNING: verify linked-wall + tile history interleaving safe before touching (undo currently working;
      options inconsistency is `{isoroll:"gizmoDrag"}` / `{isUndo:true}` / `{}` across 4 files)
- [ ] Delete dead PIXI/Map plumbing removed by Phase 6 (old overlay bodies)
- [ ] Verify boundary enforcement: grep / ESLint rule confirming no `canvas.` / `PIXI.` in non-boundary files
- [ ] Update KNOWN-BUGS.md + ROADMAP.md

### Out of Scope
- DepthSorter activation (ROADMAP Phase 6 — separate design, non-trivial algorithm)
- Skills rewrite (validate architecture in code first; rewrite after Phase 5+6 proven)
- VisionMode integration beyond 3-state tint

---

## Rules

1. **Boundary rule**: only the files listed in the Boundary Files table may use `canvas.*`, `PIXI.*`,
   `Hooks.*`, `game.*`, `CONFIG.*` directly. Enforce with ESLint or grep in Phase 8.

2. **Idempotency**: `IsoRenderer.render({ key, ... })` replaces the prior visual for that key.
   Callers must not track whether they have called render — call unconditionally, IsoRenderer deduplicates.

3. **Single decision point**: all show/hide/update/clear calls happen inside a `render-lifecycle.ts`
   function. If code outside render-lifecycle.ts calls `IsoRenderer.clear()`, it is wrong.
   Exception: gizmo show/hide driven by selection events may call `RenderHandle.show/hide()` directly,
   triggered from the relevant `onTileSelect/onTokenSelect` lifecycle function.

4. **Strangler Fig**: never have two live implementations of the same logic. New file starts as wrapper,
   caller migrates, old path deleted. No file copies.

5. **Commit rule**: module must load in Foundry with the scene functional at every commit.
   No broken intermediate states on the branch.

6. **200 LOC limit**: new source files (not docs) obey the workspace hard block.
   Split large files proactively before the hook blocks the edit.

---

## Open / Pending

- `screenUp` property name is a working name — **user to choose from**:
  `billboard`, `upright`, `screenAligned`, `flat`, `screenUp`, `unprojected`,
  `facingScreen`, `orthoFixed`, `deproject`, `screenStable`

- Phase 7 (UI + background) needs a dedicated analysis session before implementation.

- `render/render-lifecycle.ts` vs expanding `render/render-gate.ts`:
  **Decision: new file** (`render-lifecycle.ts`), `render-gate.ts` becomes thin subscriber only.
  Prefix convention: `render-` prefix maintained for the render/ folder files.
