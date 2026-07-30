# IsoRenderer Refactor — Phase 9+
> Phases 0–8 complete on branch `refactor/iso-renderer`.
> This file covers remaining cleanup and architectural gaps found in post-Phase-8 audit (2026-06-19).

---

## Architecture State (established)

Three-layer abstraction enforced across the codebase:

| Layer | File | Role |
|-------|------|------|
| Canvas accessor | `core/canvas-env.ts` | Single typed accessor for all `canvas.*` / `game.*` reads |
| Render entry point | `render/iso-renderer.ts` | Single PIXI rendering facade — all visual output |
| Render decisions | `render/render-lifecycle.ts` | Single file where all show/hide/rebuild calls live |

`render/render-gate.ts` is a thin Foundry hook subscriber that routes to lifecycle functions. After Phase 11 it dissolves into `core/hook-registry.ts`.

### Boundary Files

Only these files may use `canvas.*`, `PIXI.*`, `Hooks.*`, `game.*`, `CONFIG.*` directly.

| File | Permitted |
|------|-----------|
| `core/canvas-env.ts` | `canvas.*`, `game.user`, `game.settings` |
| `core/flags.ts` | `game.settings.get`, `canvas.scene.getFlag` |
| `core/module.ts` | `Hooks.once("init")`, bootstrap only |
| `core/hook-registry.ts` *(Phase 11)* | `Hooks.on*` — the sole Hooks registrar after Phase 11 |
| `render/layer-manager.ts` | `canvas.stage`, `PIXI.Container` |
| `render/iso-renderer.ts` | `PIXI.*` |
| `render/iso-sprite-layer.ts` | `PIXI.Sprite`, own Hooks until Phase 11 |
| `render/mesh-accessor.ts` | `tile.mesh`, `token.mesh` |
| `render/render-gate.ts` | `Hooks.on*` until Phase 11, then renderer registry only |
| `render/fog-helpers.ts` | `canvas.visibility.*`, `canvas.fog.*`, `game.user` |
| `transform/stage-transform.ts` | `canvas.app.stage`, `Hooks.on*` until Phase 11 |
| `transform/bg-transform.ts` | `canvas.environment.primary.background`, `PIXI.*` |
| `transform/tile-transform.ts` | `tile.mesh`, `renderFlags.set` |
| `transform/token-transform.ts` | `token.mesh`, `renderFlags.set` |
| `transform/ruler-patch.ts` | `CONFIG.*`, `canvas.app.stage` |
| `hud/hud-utils.ts` | DOM `.style`, `canvas.app.stage.worldTransform` |
| `ui/*` | `Hooks.on render*Config` form injection |
| `occluder/occluder.ts` | `tile.mesh.alpha`, `canvas.tiles/tokens.placeables` |

### Rules

1. **Boundary rule**: only boundary files use `canvas.*`, `PIXI.*`, `Hooks.*`, `game.*`, `CONFIG.*` directly.
2. **Idempotency**: `IsoRenderer.render({ key })` replaces the prior visual for that key. Call unconditionally.
3. **Single decision point**: all show/hide/update/clear calls happen inside `render-lifecycle.ts` functions.
4. **Strangler Fig**: never two live implementations of the same logic. Wrap → migrate callers → delete old.
5. **Commit rule**: module must load in Foundry with scene functional at every commit.
6. **200 LOC limit**: new source files obey the workspace hard block.

---

## Audit Findings (2026-06-19)

### What works

- `canvas-env.ts` covers all canvas reads in non-boundary files ✓
- IsoRenderer API: rect/circle/polygon/lines/text/sprite, interaction, flat, sight-tracked, key idempotency ✓
- `render-lifecycle.ts` is the single rendering decision point ✓
- `render-gate.ts` is a thin subscriber (~50 lines) ✓
- `module.ts` has explicit renderer registry and layer order declaration ✓

### Smells

**A — Dead PIXI code** (`handle-draw.ts`, `handle-factories.ts`, `draw/shadow.ts`, `draw/shapes.ts`)

`makeHandle`, `makeCircleHandle`, `makeSquareCounterHandle`, `makeMoveHandle`, `makeSwapHandle`,
`makeFaceHandle`, `makeHandleForType` — **zero callers**. Pre-IsoRenderer pattern. Gizmos now use
ShapeSpec directly via `IsoRenderer.render()`.

`drawGroundShadow()` in `draw/shadow.ts` — **zero callers**. Callers now use `shadowTexture()` +
`IsoRenderer.render({ kind:"sprite" })`.

`makeCounterWrapper()` in `draw/shapes.ts` — **zero callers**. `IsoRenderer`'s `flat:true` absorbed this.

These look like valid patterns to future devs but are inert. Phase 9 deletes them.

**B — IsoRenderer phantom API surface**

- `kind:"3d-box"` in `ShapeSpec` — declared, NOT implemented in `_paint()`. Silent no-op.
- `space: CoordSystem` — declared on `RenderSpec` but `_paint()` ignores it. All callers pass `"WORLD"`.
  `GRID/ISO3D/IMAGE/SCREEN/VIEWPORT` are fiction.
- `placement.offset?: P2` — declared, never read.

Phase 10 cleans these up.

**C — Hook registration scattered**

`Hooks.on` calls exist in ~10 files. Several fire on the same Foundry event independently with undefined
execution order:

- `refreshToken` → object-transform + depth-sorter + render-gate (order: undefined)
- `canvasReady` → stage-transform + bg-gizmos + iso-sprite-layer + wall-manager + render-gate (order: undefined)
- `renderGridConfig` → stage-transform + bg-html + render-gate (order: undefined; bg-html and render-gate both
  handle this event separately, creating overlap)
- `updateTile` → wall-manager + preset-manager + render-gate (order: undefined; preset must complete before render)
- `createTile` → preset-manager must fire BEFORE render-gate's `drawTile` to ensure flags are set on first draw

Phase 11 centralizes all `Hooks.on` into `core/hook-registry.ts` with explicit per-event ordering.

**D — `iso-sprite-layer.ts` not in boundary table**

Creates `PIXI.Sprite` directly, manages own `Map<string, PIXI.Sprite>` registries, registers 4 Hooks.
Architecturally IS a boundary (sprite clones need to live outside Foundry's VisibilityFilter; parallel
rendering track is intentional). Already added to boundary table above.

**E — `game.*` reads outside boundaries (minor)**

- `token-background.ts:20,26`: `game.users.get()`, `game.user` for player color
- `tile-transform.ts:63`: `game.user?.isGM` — use `CanvasEnv.isGM()`
- `hud/tile-hud.ts:19`: `game.i18n?.localize()`

---

## Phase 9 — Dead Code Purge

Low risk. All targets confirmed zero callers in audit. Grep before each delete.

### `gizmos/handle-draw.ts`
Delete: `makeHandle`, `makeCircleHandle`, `makeSquareCounterHandle`, `makeMoveHandle`, `makeSwapHandle`, `makeFaceHandle`.
Keep: `HANDLE_SIZE`, `HALF`.

### `gizmos/handle-factories.ts`
Delete: `makeHandleForType`, `HANDLE_COLOR`, all `make*` imports from `./handle-draw`.
Keep: `createRotateBlocker` (still used by `tile-gizmos.ts` for Foundry controls-layer rotate blocker).

### `gizmos/index.ts` + `gizmos/index.d.ts`
Remove exports of all deleted functions.

### `draw/shadow.ts`
Delete: `drawGroundShadow`.
Keep: `shadowTexture`, `shadowAlpha`.

### `draw/shapes.ts`
Delete: `makeCounterWrapper`.
Keep: `drawDash`, `drawDashedContour`, `suppressMipmap`.

---

## Phase 10 — IsoRenderer API Completeness

### 10a — `kind:"3d-box"` (remove)

`grep -rn '"3d-box"' src/` to confirm zero callers. If zero: remove from `ShapeSpec` union in
`iso-renderer.ts`. No `_paint()` branch to add.

If 3d-box rendering is ever needed: implement as 6-face volume using `PIXI.Graphics.drawPolygon` per face
with z-sorted painter's algorithm. That's a separate design session.

### 10b — `placement.offset` (implement or remove)

Check callers. If zero: remove `offset?: P2` from `Placement` interface.
If used: `c.position.set(a.x + (spec.placement.offset?.x ?? 0), a.y + (spec.placement.offset?.y ?? 0))` in `render()`.

### 10c — `space: CoordSystem` (document)

Do not implement the 5 coord transforms — no concrete need yet. Add comment on the field:
`// "WORLD" only — other values reserved, coord transform not yet implemented`
Keeps the future door open without lying to callers.

### 10d — `game.*` boundary (minor)

- `tile-transform.ts:63`: `game.user?.isGM` → `CanvasEnv.isGM()`
- `token-background.ts`: `game.users.get(uid)` / `game.user` for player color → add
  `CanvasEnv.userColor(userId: string): number` accessor, or accept as-is if `game.users` is
  considered a data boundary (not a canvas boundary).

---

## Phase 11 — Hook Centralization

### Goal

Every `Hooks.on(...)` call lives in `core/hook-registry.ts`. Each subsystem exports named handler
functions. No `activate()` registers its own hooks. Order explicit and controlled per event.

`core/hook-registry.ts` becomes a boundary file — the sole `Hooks.on` registrar (except
`module.ts`'s `Hooks.once("init")`).

### Pattern

Before:
```typescript
// wall-manager.ts
static activate(): void {
  Hooks.on("preUpdateTile", WallManager.onPreUpdateTile);
  Hooks.on("updateTile",    WallManager.onUpdateTile);
}
```

After:
```typescript
// wall-manager.ts — export named handlers, no Hooks.on
export function onPreUpdateTile(doc: unknown, ...): void { ... }
export function onUpdateTile(doc: unknown, changes: Record<string, unknown>): void { ... }

// hook-registry.ts — explicit order per event
Hooks.on("updateTile", (doc, changes) => {
  WallManager.onUpdateTile(doc, changes);      // data sync first
  PresetManager.onUpdateTile(doc, changes);    // preset upsert
  RenderGate.onUpdateTile(doc, changes);       // render last, sees updated data
});
```

### Proposed execution order per hook

```
canvasInit       → IsoSpriteLayer.onCanvasInit

canvasReady      → StageTransform.onCanvasReady      // iso transform applied first
                 → WallHistory.clear                 // data reset
                 → IsoSpriteLayer.onCanvasReady      // ticker wired
                 → RenderGate.onCanvasReady          // overlays built last

refreshToken     → ObjectTransform.onRefreshToken    // mesh mutation first
                 → DepthSorter.onRefreshToken        // sort after mesh settles
                 → RenderGate.onRefreshToken         // render last

refreshTile      → ObjectTransform.onRefreshTile
                 → DepthSorter.onRefreshTile
                 → RenderGate.onRefreshTile

updateTile       → WallManager.onUpdateTile          // wall sync
                 → PresetManager.onUpdateTile        // preset upsert
                 → RenderGate.onUpdateTile           // render last

preUpdateTile    → WallManager.onPreUpdateTile

updateToken      → PresetManager.onUpdateToken
                 → RenderGate.onUpdateToken

updateScene      → StageTransform.onUpdateScene
                 → RenderGate.onSceneChange

preUpdateScene   → ObjectTransform.onPreUpdateScene

renderGridConfig → StageTransform.onRenderGridConfig  // stage transform first
                 → BgHtml.onRenderGridConfig          // background preview HTML
                 → RenderGate.onGridConfigOpen        // clears overlays last

closeGridConfig  → BgHtml.onCloseGridConfig
                 → StageTransform.onCloseGridConfig
                 → RenderGate.onGridConfigClose

closeSceneConfig → StageTransform.onCloseSceneConfig

sightRefresh     → RenderGate.onSightRefresh
canvasTeardown   → RenderGate.onCanvasTeardown
renderTileHUD    → TileHud.onRenderTileHUD

drawToken        → RenderGate.onDrawToken
drawTile         → RenderGate.onDrawTile
destroyToken     → RenderGate.onDestroyToken         // guard: !isPreviewClone
destroyTile      → RenderGate.onDestroyTile          // guard: !isPreviewClone
controlToken     → RenderGate.onControlToken
controlTile      → RenderGate.onControlTile
deleteToken      → RenderGate.onDeleteToken
deleteTile       → WallManager.onDeleteTile
                 → RenderGate.onDeleteTile
deleteWall       → WallManager.onDeleteWall
updateWall       → WallManager.onUpdateWall
changeScene      → IsoSpriteLayer.onChangeScene
resetFogOfWar    → IsoSpriteLayer.onResetFogOfWar

preCreateTile    → PresetManager.onPreCreateTile
createTile       → PresetManager.onCreateTile        // preset flags applied BEFORE render fires drawTile
createToken      → PresetManager.onCreateToken
createScene      → PresetManager.onCreateScene

ready            → PresetManager.onReady
init             → module.ts (Hooks.once — stays there)
```

### Files with `activate()` to dissolve

| File | Change |
|------|--------|
| `render/render-gate.ts` | Remove `activate()`. Keep renderer registry (`registerToken/Tile`). |
| `transform/stage-transform.ts` | Remove `activate()`. Export named handlers. |
| `transform/object-transform.ts` | Remove `activate()`. Export named handlers. |
| `background/bg-html.ts` | Remove `Hooks.on` from `activate()`. Export named handlers. |
| `background/bg-gizmos.ts` | Remove `canvasReady` hook (lifecycle already handles this via render-gate). |
| `hud/tile-hud.ts` | Remove `activate()`. Export `onRenderTileHUD`. |
| `sorter/depth-sorter.ts` | Remove `activate()`. Export `onRefreshToken`, `onRefreshTile`. |
| `render/iso-sprite-layer.ts` | Remove `activate()`. Export named handlers. |
| `preset/preset-manager.ts` | Remove `activate()`. Export named handlers. |
| `walls/wall-manager.ts` | Remove `activate()`. Export named handlers. |

### `module.ts` after Phase 11

```typescript
Hooks.once("init", () => {
  registerVolumeSettings();
  registerSceneConfigHook();
  registerTokenConfigHook();
  registerTileConfigHook();
  registerRulerPatch();
  registerRenderers();   // was gate.registerToken/Tile chain
  registerAllHooks();    // core/hook-registry.ts — wires everything
  LayerManager.declareOrder([...]);
  console.log("isoroll | initialized");
});
```

---

## Open Items (pre-merge decision)

### B29 — Undo of linked-wall displacement lost

Wall drag commit does not produce an undoable Tile-layer history entry.

Bisect against `3403e6e` to confirm onset. Check:
- `wall-overlay-ops.ts` drag `onUp` path → does it call `WallHistory.push({ k:"move", ... })`?
- `wall-history.ts` `undo()` case `k === "move"` — does it reconstruct the displacement correctly?

See BUGS.md B29 for full symptom description.

### Occluder new path (`isorollNewOccluder=true`)

New path untested in Foundry. Enable via `game.settings.set("isoroll","isorollNewOccluder",true)` then
reload. Confirm tile alpha fades when token walks behind a tile. Only after confirmed: remove flag +
`activateLegacy()` from `occluder.ts` and remove the conditional in `module.ts`.

---

## Merge Decision

Phases 9–11 are cleanup, not features. Branch `refactor/iso-renderer` is safe to merge → `develop`
now with B29 documented and occluder flag still off.

**Option A (recommended):** Merge now. Continue Phase 9–11 on new branch `refactor/cleanup`.

**Option B:** Do Phase 9 (dead code, trivially safe, no logic change) before merging. Push 10–11 post-merge.
