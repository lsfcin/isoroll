# isoroll — Specs

> Design decisions, algorithms, conventions, and repo structure.

## Core Principles

1. **Reliability** — no glitches, no flicker, no broken transforms at edge cases
2. **Speed** — optimized render path, no unnecessary recomputation
3. **UX magic** — WYSIWYG editing, gizmo handles, anticipate intent, no bureaucratic menus

---

## Architecture Decisions

### Isometric Projection

- **Dimetric 2:1** (not true isometric 1:1): rotation=-45°, skewX=skewY=18.435°, vertical ratio=2.0
- Applied to `canvas.app.stage` (purely visual — lighting, walls, movement, grid all unaffected)
- Grid is NOT counter-transformed — it aligns naturally with stage rotation+skew
- Counter-transforms on tile/token meshes: tiles get bottom-left anchor (0,1); tokens get center anchor (0.5,0.5)
- Scale includes √2 to compensate for 45° rotation stretching

### Coordinate System

- Stage transform is purely visual. All mechanical systems (Foundry lighting, walls, movement, reach) operate in original grid space.
- Grid remains aligned — do not touch it.

### 3D Volume Geometry

- Tiles: x,y = volume origin (bottom-left front corner of isometric footprint), Option B
- Token: center of bottom face = mid-bottom vertex
- Uniform scale on resize (preserve aspect ratio)
- Volume handles: 4 PIXI handles per axis (X/Y/Z + uniform) in `canvas.controls` (screen-space layer)
- Volume handles hidden in image-edit mode

### Depth Sort (Painter's Algorithm)

- Sort key: `gridCol + gridRow + elevation / gridSize`
- Implemented via `depthSort` hook overriding Foundry's default z-order

### Occlusion

- **Tile fades, NOT token** — tile gets `alpha = occlusionOpacity` when a token is behind it
- Check: tile.sortKey > token.sortKey + XY footprint overlap + Z overlap
- `OcclusionOpacity` setting: 0=invisible, 1=no effect (default 0.3)

### Per-Scene Enablement

- Flag: `scene.flags.isoroll.enabled` (boolean)
- Scene Config checkbox in "Basics" tab

### Asset Naming

- Tokens: `{name}_{stance}_{facing}.{ext}` (e.g. `rogue_idle_SE.png`)
- Tiles: `{name}_{facing}.{ext}` (e.g. `dungeon_floor_N.png`)
- Facings: N, NE, E, SE, S, SW, W, NW, TOP

### Stance System

- Current stance tracked per token (not per scene)
- Fallback chain (if image missing, walk chain):
  ```
  attack → ready → idle
  shoot, cast, dodge, shield, evade, endure, hurt → ready → idle
  prone, dead → idle
  sneak, fly, talk → idle
  idle → (terminal)
  ```
- Stance updates triggered by dnd5e hooks (Phase 6)

### Preset System

- **Storage**: one JSON per image at `Data/isoroll/presets/<mirrored-src-path>.json`; flat `_index.json` for fast cache preload at startup
- **Key**: derived from `texture.src` — strip query/hash, lowercase (e.g. `assets/wall.rembg.png` → `assets/wall.rembg.png.json`)
- **Cache**: in-memory `Map<imageKey, preset>` populated from `_index.json` on `ready`; updated immediately on every write
- **No-blink placement**: `preCreateTile` applies from cache synchronously via `doc.updateSource()` before Foundry persists the tile; `createTile` async fallback fires ONLY on cache miss (skipped on hit to avoid redundant PIXI redraw blink)
- **Auto-upsert**: `updateTile`/`updateToken`/`updateScene` hooks watch for relevant flag or native field changes; debounced 500ms to batch drag events
- **Opt-out**: `flags.isoroll.presetEnabled` (default true) per tile/token for special cases

### IsoRenderer `testPoint` Convention for Elevated Visuals

Any `IsoRenderer.render()` call where `placement.anchor` is an **elevated world position**
(above ground — e.g. a label at the top of an elevation line) MUST also set `testPoint`
to the corresponding **ground position**. Reason: `isoRendererSightRefresh` uses
`testPoint ?? placement.anchor` to query fog state. Fog data is stored at ground-level
canvas coordinates; an elevated anchor tests outside that map and always reads as visible.

```typescript
// ✓ correct — testPoint at ground; anchor elevated
IsoRenderer.render({
  placement: { anchor: { x: lx, y: ly } },   // elevated position
  testPoint: { x: tx + tw / 2, y: ty + th / 2 }, // ground center
  visibility: "sight-tracked",
  ...
});
```

Shadow is exempt (its anchor IS the ground position). Indicator uses `testPoint` correctly (anchor `{0,0}` → would test world origin without it).

### IsoRenderer Lifecycle Guard for Overlay Modes (GridConfig pattern)

Foundry fires `refreshToken` + `refreshTile` on every animation tick, even when a
dialog like GridConfig is open. If a lifecycle function calls overlay `render()` or
`rebuild()` unconditionally, visuals cleared by `onGridConfigOpen` will reappear within
one tick.

**Pattern:** add a module-level boolean guard; block overlay draws while mode is active;
restore via `onCanvasReady()` when mode exits.

```typescript
// In render-lifecycle.ts
let _gridConfigOpen = false;
export function onGridConfigOpen(...) { _gridConfigOpen = true; clearAll(); }
export function onGridConfigClose()   { _gridConfigOpen = false; onCanvasReady(); }
export function onTokenRefresh(...)   { if (_gridConfigOpen) return; ... }
```

Wire `closeGridConfig` hook in `render-gate.ts` → `onGridConfigClose()`.

### IsoRenderer Drag Handle Conventions

- **Pattern:** `onPointerDown: (e) => { e.stopPropagation(); startPointerDrag(drag, onMove, onUp); }` — `e.stopPropagation()` (PIXI level) only. Never call `nativeEvent.stopImmediatePropagation()` when starting a drag — it blocks `window.pointermove` delivery that `startPointerDrag` depends on.
- **nativeEvent stop is safe only on non-drag handlers** (e.g. wall line single-click that only toggles/dblchecks). Required there to prevent Foundry box selection.
- **`screenPointToCanvas` signature:** `screenPointToCanvas(sx, sy, wt: PIXI.Matrix)` — requires `CanvasEnv.worldTransform()` as third argument. Located in `src/core/util.ts`, exported from `"../core"`.
- **Snap to grid:** use `Math.round(v / step) * step` where `step = CanvasEnv.gridSize() / 4` (5 snap points per grid side). Apply in both `onMove` and `onUp`.
- **SHIFT = free drag:** `if (!ev.shiftKey) { /* snap */ }` — Foundry convention (same as token drag).

---

## Repo Structure

```
isoroll-module/          ← this repo (public, Foundry module)
  src/
    transform/           stage-transform, tile-transform, token-transform, bg-transform,
                         object-transform, constants, coord-types, coord-map, coord-sys-*,
                         coord-debug, ruler-patch
    ui/                  scene-config, tile-config, token-config, tab-helpers
    tiles/               tile-overlay, tile-gizmos, tile-drag
    tokens/              token-overlay, token-gizmos, token-elev-gizmo
    background/          bg-gizmos, bg-drag, bg-html
    gizmos/              handle-draw, handle-factories, img-drag, mesh-corners
    draw/                volume-box, contour, shapes, constants
    hud/                 tile-hud, token-hud, hud-utils
    walls/               wall-manager, wall-coords, wall-crud, wall-overlay,
                         wall-overlay-ops, wall-history, wall-sync, wall-door,
                         wall-flags, wall-types
    preset/              preset-types, preset-storage, preset-ops, preset-apply,
                         preset-diff, preset-upsert, preset-manager
    render/              layer-manager
    sorter/              depth-sorter
    occluder/            occluder
    resolver/            asset-resolver
    flags.ts             module-level flag helpers
    settings.ts          module settings registration
    util.ts              shared utilities
    module.ts            entry point
  styles/                isoroll.scss
  lang/                  en.json, pt-br.json
  assets/                placeholder art
  dist/                  build output (gitignored)

isoroll-content/         ← separate private repo (art pipeline)
  cli/                   iso-cli.py
  pipeline/              blender_iso_rig.py, ComfyUI workflows
  profiles/              generation profiles
  outputs/               generated sprites
```
