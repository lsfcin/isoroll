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

- World-scoped setting (not scene-scoped)
- Filename-keyed: preset name = asset filename without extension
- Silent auto-apply on tile place + discrete toast (e.g. "dungeon wall tile's volume updated")

---

## Phase Status

### Phase 1 — Canvas Transform ✅ DONE

- [x] Stage rotation + skew (dimetric 2:1)
- [x] `canvasReady` + `updateScene` hooks
- [x] Enable/disable per scene via flag

### Phase 2 — Object Counter-Transform ✅ DONE

- [x] Tile mesh: scale(uniform, uniform*ratio), anchor(0, 1)
- [x] Token mesh: width/height via √2*ratio, anchor(0.5, 0.5)
- [x] `refreshTile` + `refreshToken` hooks

### Phase 2.5 — Scene Config UI ✅ DONE

- [x] "Enable Isoroll" checkbox in Scene Config → Basics tab
- [x] pt-BR language support
- [x] Foundry AppV2 injection (see CONTEXT.md §Gotchas)

### Phase 3 — Volume Handles (Gizmos) 🔲 PENDING

- [ ] 4 PIXI handles per tile (X/Y/Z axis + uniform)
- [ ] Handles live in `canvas.controls` (screen-space, not world-space)
- [ ] Bottom-face drag = XY position
- [ ] 0.5 grid-unit snap
- [ ] Right-click tile → "Edit Volume" shortcut

### Phase 4 — Image Edit Mode 🔲 PENDING

- [ ] Double-click tile enters image-edit mode
- [ ] Corner handles for scale, drag for move
- [ ] Fine-tune text inputs (numeric fields)
- [ ] Volume handles hidden while in this mode

### Phase 5 — Preset System 🔲 PENDING

- [ ] World-scoped setting for preset library
- [ ] Filename-keyed auto-apply on tile placement
- [ ] Toast notification (discrete, not modal)

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

## Known Issues / Active Bugs

- **Character distortion** (noticed 2026-05-27): tiles/tokens may appear squished/stretched — counter-transform scale values need calibration against actual art dimensions. Diagnose next.

---

## Repo Structure

```
isoroll-module/          ← this repo (public, Foundry module)
  src/
    transform/           canvas-transform, object-transform, scene-config, constants
    volume/              flags, settings
    sorter/              depth-sorter
    occluder/            occluder
    resolver/            asset-resolver
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
