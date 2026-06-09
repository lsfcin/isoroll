# isoroll — Module Roadmap

> Living doc: architecture decisions, phase status, pending work.

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

---

## Phase Status

### Phase 4 — Image Edit Mode 🔲 UX PENDING

- [ ] Double-click enters image-edit mode (volume handles hidden while active)
- [ ] Fine-tune numeric text inputs for offset/scale
- [ ] ESC / click-outside exits image-edit mode

### Phase 6 — Stance State Machine 🔲 PENDING

- [ ] dnd5e hook integration (attack, skill, condition changes)
- [ ] Keyboard shortcut for manual stance override
- [ ] Fallback chain resolution at display time

### Phase 7 — Template Scene 🔲 PENDING

- [ ] Pre-built scene: ISO enabled, sample tiles placed
- [ ] Demonstrates volume gizmos + occlusion

### Phase 8 — Right-Click Context Menus 🔲 PENDING

- [ ] Redundant access to all controls (volume edit, image edit, presets)

### Future — Multiview 🔲 DEFERRED

- 8 directional facings + TOP
- Auto-detect from token movement direction

### Future — Animations 🔲 DEFERRED

- Single-frame impact → fluid frame sequences
- Frame naming: `{name}_{stance}_{facing}_{frame:04d}.{ext}`

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

---

## Development Setup

```bash
# Symlink for live dev (already done)
ln -s /mnt/workspace/Code/isoroll-module /home/lucas/foundrydata-v14/Data/modules/isoroll

# Build
npm run build      # dist/module.js + dist/styles.css

# Release
git tag v0.x.x && git push --tags   # triggers GitHub Actions → zip → Release
```
