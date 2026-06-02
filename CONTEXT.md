# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.

> **Foundry v14 patterns, gotchas, and coordinate math → `/foundry` skill**
> (`Core/skills/foundry.md` — run `/foundry` at session start)

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Build: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
- Foundry running at `http://localhost:30000/game`

## Source Map

| Path | Responsibility |
|------|---------------|
| `src/module.ts` | Entry point — wires all hooks in `Hooks.once("init")` |
| `src/transform/canvas-transform.ts` | Stage rotation+skew, background counter-transform, hooks: canvasReady/updateScene/renderGridConfig |
| `src/transform/object-transform.ts` | Per-token/tile counter-transform + HUD repositioning, hooks: refreshToken/refreshTile/renderTokenHUD |
| `src/transform/scene-config.ts` | Isoroll tab injection for SceneConfig, TokenConfig, TileConfig; projection dropdown |
| `src/transform/constants.ts` | `PROJECTION_TYPES` (8 presets), `getProjection(scene)`, `IsoProjection` interface |
| `src/volume/flags.ts` | `MODULE_ID`, `VolumeFlags` flag accessors (boundHeight, imageOffset, imageScale, showImageManipulation, showVolumeManipulation, …) |
| `src/volume/settings.ts` | DefaultTokenHeight (default 2 grid units ≈ 10 ft), OcclusionOpacity module settings |
| `src/volume/overlay-geometry.ts` | 3D box geometry: `computeVerts()` (tile), `computeTokenVerts()` (token), `drawBox()`, `drawAnchorLine()`, `drawDash()`, `BoxVerts` |
| `src/volume/overlay.ts` | `VolumeOverlay` — 3D box + image contour on selected tiles; gated by showVolumeManipulation / showImageManipulation |
| `src/volume/token-volume-overlay.ts` | `TokenVolumeOverlay` — 3D bounding box on selected tokens; doc-state cached to skip 60fps rebuilds during animation |
| `src/volume/gizmos-drag.ts` | Pure drag math: `projectDrag()`, `handlePositions()`, `commitDrag()`, snap helpers, `imageTCCorner()` |
| `src/volume/gizmos-handles.ts` | PIXI factory functions for all handle shapes + `createRotateBlocker()` + `bgCorner()` + `drawDashedContour()` |
| `src/volume/gizmos.ts` | `VolumeGizmos` — volume handles (width/height/boundH/elevation/scale/move) gated by showVolumeManipulation; image handles (imgOffset/imgScale/imgYScale/swapSide) gated by showImageManipulation |
| `src/volume/token-gizmos.ts` | `TokenGizmos` — image handles (BL circle: offset, TR square: scale, TC square: Y-scale) for tokens; gated by showImageManipulation |
| `src/volume/background-gizmos.ts` | `BackgroundGizmos` — Y-scale/scale/translate handles + dashed contour on background image in GridConfig; injects Vertical Scale field; CTRL+Wheel/Arrow shortcuts |
| `src/volume/background-gizmos-drag.ts` | `BgDrag` type + `commitBgDrag()` — drag math for all three background handle types |
| `src/volume/token-overlay.ts` | `TokenOverlay` — dashed image contour on selected tokens; gated by showImageManipulation |
| `src/volume/token-volume-gizmos.ts` | `TokenVolumeGizmos` — elevation handle (orange circle, SE edge midpoint) for tokens; doc-state cached |
| `src/sorter/depth-sorter.ts` | Depth sort (dormant — not activated, see ROADMAP) |
| `src/occluder/occluder.ts` | Tile alpha fade when token is behind it |
| `src/resolver/asset-resolver.ts` | Stance fallback chain, `resolveBestTokenAsset()` |
| `lang/en.json` | English i18n strings |
| `lang/pt-br.json` | Portuguese (BR) i18n strings |

## Projection Math

Dimetric 2:1 applied to `canvas.app.stage`:
- `rotation = -45°`, `skewX = skewY = 18.435°`, `ratio = 2.0`, `counterFactor = √10/4 ≈ 0.7906`
- Grid: untouched — aligns naturally with stage transform
- Objects with `transformToken/Tile = false`: counter-transformed to appear undistorted
- Objects with `transformToken/Tile = true`: rendered as-is in the isometric stage space

## Flags

| Flag | Type | Scope | Default | Purpose |
|------|------|-------|---------|---------|
| `flags.isoroll.enabled` | boolean | scene | false | Enable isometric stage transform |
| `flags.isoroll.transformBackground` | boolean | scene | false | Apply isometric to background image |
| `flags.isoroll.projection` | string | scene | `"dimetric_2_1"` | Projection preset key; `"custom"` enables 4 extra flags |
| `flags.isoroll.customRotation` | number | scene | -45 | Custom projection rotation (degrees) |
| `flags.isoroll.customSkewX` | number | scene | 18.435 | Custom projection skewX (degrees) |
| `flags.isoroll.customSkewY` | number | scene | 18.435 | Custom projection skewY (degrees) |
| `flags.isoroll.customRatio` | number | scene | 2.0 | Custom projection vertical ratio |
| `flags.isoroll.transformToken` | boolean | token | false | Apply isometric stage to token sprite |
| `flags.isoroll.transformTile` | boolean | tile | false | Apply isometric stage to tile sprite |
| `flags.isoroll.boundHeight` | number | tile+token | tile:1 / token:2 | 3D volume height in grid units (token default from `defaultTokenHeight` setting) |
| `flags.isoroll.imageOffset` | {x,y} | tile+token | {0,0} | Canvas-pixel offset of image from natural center |
| `flags.isoroll.imageScale` | number | tile+token | 1 | Image uniform scale multiplier |
| `flags.isoroll.imageYScale` | number | tile+token | 1 | Image Y-axis scale multiplier (for projection adaptation) |
| `flags.isoroll.backgroundYScale` | number | scene | 1 | Background image Y-scale multiplier (set via GridConfig Vertical Scale field) |
| `flags.isoroll.tileFlipped` | boolean | tile | false | Swap tile width↔height (mirror) |
| `flags.isoroll.showImageManipulation` | boolean | tile+token | true | Show image contour + imgOffset/imgScale/swapSide handles on select |
| `flags.isoroll.showVolumeManipulation` | boolean | tile+token | true | Show 3D box + elevation handle on select (tiles also: width/height/boundH/scale/move) |

## Known Limitations / Gotchas

- Token rotation: v14 auto-facing suppressed for undistorted tokens; 8-directional sprite selection not yet implemented (placeholder in `object-transform.ts`)
- Depth sort: `DepthSorter` class exists but is not activated — see ROADMAP
- `tile.x/tile.y` = 0 in v14 — use `tile.document.x/y` (CENTER, not top-left); top-left = `doc.x - width/2, doc.y - height/2`
- `setFlag` fires `refreshTile` with `{refreshPosition, refreshPerception}` only — `isMeshReset` returns false; scale guarded by meshReset won't run for flag-only changes
- `mesh.scale.set()` (absolute) is safe on every refresh; only `*=` patterns need meshReset guard
- `addIsorollTab` has no double-inject guard — if `renderSceneConfig` fires more than once for the same dialog (edge case), the Iso tab will appear twice; add `if ($html.find(\`a[data-tab="${TAB}"]\`).length) return;` at the top of `addIsorollTab` if this becomes a problem
- AppV2 `stopPropagation` on custom tab click leaves `tabGroups[group]` stale; clicking back to native tabs requires explicit `addClass("active")` on the content section (see `scene-config.ts`)
- **GridConfig `_processSubmitData`** only calls `super._processSubmitData` when one of 7 native fields changed (`width/height/padding/shiftX/shiftY/grid.size/grid.type`). Module-specific form fields are silently skipped. Workaround: instance-level patch on `app._processSubmitData` at `renderGridConfig` time.
- **GridConfig `updateTransform` centering**: when overriding the bg sprite's `updateTransform`, `scY` in the position formula (the `R·S·(-tw/2,-th/2)` center offset) must include `bgYScale` — if only `scale.set()` uses it, the visual center shifts vertically instead of scaling around center.

## See Also

- [ROADMAP.md](ROADMAP.md) — full phase plan, architecture decisions
- `isoroll-content/` repo — AI art pipeline (private)
- `/foundry` skill — Foundry v14 gotchas, coordinate systems, hooks, component hierarchy

## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`src/transform/`](src/transform/) | Stage, background, and per-object transforms; config UI tab injection |
| [`src/volume/`](src/volume/) | 3D volume flags and settings |
| [`src/sorter/`](src/sorter/) | Depth sort (dormant) |
| [`src/occluder/`](src/occluder/) | Tile occlusion |
| [`src/resolver/`](src/resolver/) | Asset stance fallback |
