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

- [x] `refreshToken` / `refreshTile` hooks with scale-guard flags
- [x] Token counter-transform: `anchor(0.5,0.5)`, rotation locked to `reverseRotation` (auto-facing suppressed)
- [x] Tile counter-transform: uniform scale `max(docW,docH)/max(texW,texH)` — preserves aspect ratio
- [x] TokenHUD repositioned via `renderTokenHUD` hook with correct HUD-container-space math
- [x] TileHUD repositioned via `_updatePosition` prototype patch on `CONFIG.Tile.hudClass`; spans tile visual isometric footprint width `cosA*(docW+docH)`; swap-stable vertical `T - visualCssW/4`
- [x] Movement ruler labels (Ruler + TokenRuler `_getWaypointLabelContext`) patched to apply worldTransform correction — same HUD displacement bug as TokenHUD
- [x] `DIMETRIC_2_1` constants shared via `constants.ts`
- ⏳ Token 8-directional sprite selection (TODO placeholder in `object-transform.ts`) → Phase Future/Multiview

### Phase 2.5 — Config UI ✅ DONE

- [x] "Enable Isoroll" + "Transform Background" in Scene Config (Isoroll tab)
- [x] "Transform Token" in Token Config (Isoroll tab)
- [x] "Transform Tile" in Tile Config (Isoroll tab)
- [x] pt-BR language support
- [x] Foundry AppV2 tab injection (see `/foundry` skill)
- [x] Grid Configuration Tool (grid wrench): counter-transforms preview bg sprite when `transformBackground=false`; grid mesh stays isometric; camera position unchanged. Pattern: `updateTransform` override with save→apply→origUpdate→restore on `renderGridConfig` hook.
- [x] Grid Config scene offset: bg position uses `canvas.dimensions.sceneX/Y` (not static scene flags) so Scene Offset changes are reflected live
- [x] AppV2 stale `tabGroups` bug: clicking native tab after custom tab was activated left content hidden; fixed by explicit `addClass("active")` in other-tab handler
- [x] `imageOffset` stored in grid-relative units (divide on save, multiply by `gs` on apply/drag-start) — preserves offset across gridSize changes
- [x] `foregroundTile` flag (default true): foreground tiles rescale `x/y/width/height` canvas px when scene gridSize changes (via `preUpdateScene`/`updateScene` hooks), preserving grid-unit footprint like tokens. Checkbox in TileConfig Iso tab.
- [x] Background image handles in GridConfig Tool (when `transformBackground=false`):
  - TC white square → `backgroundYScale` scene flag (Y-scale only); CTRL+Wheel/Arrow shortcuts (step 0.01)
  - TR white square → `scale` native form field (uniform scale)
  - BL white circle → `shiftX`/`shiftY` native form fields (translate)
  - Dashed contour (white, screen-density-normalised via worldTransform scale factors); live update during Y-scale drag
  - "Vertical Scale" numeric field injected into GridConfig form (step=0.001, min=0.05, max=5)
  - `backgroundYScale` persisted via instance-level `_processSubmitData` patch (GridConfig native submit skips non-native fields)

### Phase 3 — Volume Handles (Gizmos) ✅ DONE (v2 — full redesign)

**3D Box Overlay** (`src/volume/overlay.ts`):
- [x] 8-vertex, 12-edge 3D bounding box drawn with dashed PIXI.Graphics
- [x] Front edges: full alpha orange + dark outline; back/hidden edges: 40% alpha
- [x] Height direction: canvas (+1,−1) per grid unit — produces pure screen-vertical for all presets
- [x] Elevation offset: tile.document.elevation × gridSize / gridDistance
- [x] Height offset: boundHeight flag × gridSize
- [x] Anchor dashed line from ground center to box base (elevated) or top (below ground)
- [x] Redraws on controlTile/refreshTile, clears on canvasReady/updateScene

**Gizmo Handles — Tiles** (`src/volume/gizmos.ts`, `gizmos-handles.ts`, `gizmos-drag.ts`):
- [x] Volume handles (orange `#ff9829`), live-drag on pointermove — gated by `showVolumeManipulation`:
  - Width (diamond) — left-edge midpoint of base → tile.document.width
  - Height (diamond) — bottom-edge midpoint of base → tile.document.height
  - BoundH (face parallelogram) — top back-face of box → boundHeight flag
  - Elevation (counter-transformed circle) — SE vertical edge midpoint → tile.document.elevation
  - Scale (diamond) — SE_base corner → proportional width+height
  - Move (circle) — base face center → tile.document.x/y
- [x] Image handles (white), gated by `showImageManipulation`:
  - imgOffset (circle, BL corner) → imageOffset flag
  - imgScale (square, TR corner) → imageScale flag
  - imgYScale (square, TC top-center) → imageYScale flag; Y-axis only; 12px screen-space snap to 1.0
  - swapSide (triangle button, BC edge) — swaps width↔height + tileFlipped in single `document.update()` (avoids mid-swap refreshTile with inconsistent state)
- [x] 1/4 grid-unit snap; elevation snaps to integer feet
- [x] Tile mesh displaced by elevation: `mesh.x/y = doc.x/y + hdx/hdy * E`
- [x] Image scale includes boundHeight: `Math.max(docW, docH, docBoundH)`
- [x] Rotation handle suppressed: invisible event-absorber over Foundry's triangle
- [x] Anchor line: orange line from ground center to elevated base
- [x] Auto-show on tile select, auto-hide on deselect, rebuild on refreshTile

**Gizmo Handles — Tokens** (`src/volume/token-gizmos.ts`, `token-volume-gizmos.ts`):
- [x] Image handles (white), gated by `showImageManipulation`:
  - imgOffset (circle, BL corner) → imageOffset flag
  - imgScale (square, TR corner) → imageScale flag
  - imgYScale (square, TC top-center) → imageYScale flag; Y-axis only; 12px screen-space snap to 1.0
- [x] Volume handle (orange), gated by `showVolumeManipulation`:
  - Elevation (counter-transformed circle) — SE edge midpoint → token.document.elevation (with `{ animate: false }`)
- [x] Doc-state cache (x, y, elevation, boundH) prevents 60fps PIXI rebuild during movement animation

**Token Volume Overlay** (`src/volume/token-volume-overlay.ts`):
- [x] Same 12-edge 3D wireframe box as tiles; uses `computeTokenVerts()` (token coords: x/y = top-left, width/height × gridSize)
- [x] Anchor line from ground to elevated base
- [x] Token mesh displaced by elevation: `mesh.x/y = base + hdx/hdy * E + imgOff`; tokenBase captures natural center on `refreshPosition` only; elevation fresh-read every frame so drag updates immediately
- [x] Doc-state cache avoids redundant redraws when document unchanged

**Config UI — Manipulation flags** (`src/transform/scene-config.ts`):
- [x] `showImageManipulation` checkbox in TokenConfig + TileConfig Iso tab (default true)
- [x] `showVolumeManipulation` checkbox in TokenConfig + TileConfig Iso tab (default true)
- [x] `defaultTokenHeight` setting default raised to 2 grid units (≈ 10 ft at standard 5 ft/sq grid)

**Projection System** (`src/transform/constants.ts`):
- [x] PROJECTION_TYPES map: dimetric_2_1, true_iso, overhead, proj_3_2, diablo, torment, hades (approx.), custom
- [x] getProjection(scene) — reads flags.isoroll.projection, handles custom numeric inputs
- [x] heightDir field on IsoProjection for 3D box math
- [x] canvas-transform.ts + object-transform.ts use getProjection() per hook call

**Scene Config** (`src/transform/scene-config.ts`):
- [x] Projection dropdown added to Iso tab (after Transform Background)
- [x] Custom projection: 4 numeric fields (rotation°, skewX°, skewY°, ratio) shown when "custom" selected
- [x] Tab renamed: "Isoroll" → "Iso" (all sheets: scene/tile/token)

### Phase 4 — Image Edit Mode ✅ HANDLES DONE / 🔲 UX PENDING

**Tokens + Tiles (done):**
- [x] BL circle handle → drag to translate image (`flags.isoroll.imageOffset`)
- [x] TR square handle → drag to scale image (`flags.isoroll.imageScale`)
- [x] Dashed image contour shown on select (white dash, screen-pixel-adapted length)
- [x] Handles shown on select via `controlToken`/`controlTile`; rebuilt on refresh
- [x] Drag math: screen-space delta inverted through worldTransform for offset; radial distance ratio for scale
- [x] Image offset correctly tracks movement (tokenBase pattern, captured on `refreshPosition` only)
- [x] Hide/show animation safe (refreshMesh-only frames skipped)
- [x] `showImageManipulation` flag (default true) gates handles + contour per object

**UX polish (pending):**
- [ ] Double-click enters image-edit mode (volume handles hidden while active)
- [ ] Fine-tune numeric text inputs for offset/scale
- [ ] ESC / click-outside exits image-edit mode

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
