# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Build: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
- Foundry running at `http://localhost:30000/game`

## Source Map

| Path | Responsibility |
|------|---------------|
| `src/module.ts` | Entry point — wires all hooks in `Hooks.once("init")` |
| `src/transform/canvas-transform.ts` | Stage rotation+skew, background counter-transform, hooks: canvasReady/updateScene |
| `src/transform/scene-config.ts` | Isometric fieldset injection into Scene Config UI |
| `src/transform/constants.ts` | `DIMETRIC_2_1` projection constants |
| `src/volume/flags.ts` | `MODULE_ID`, `VolumeFlags` registration |
| `src/volume/settings.ts` | DefaultTokenHeight, OcclusionOpacity module settings |
| `src/sorter/depth-sorter.ts` | Depth sort (dormant — not activated, see ROADMAP) |
| `src/occluder/occluder.ts` | Tile alpha fade when token is behind it |
| `src/resolver/asset-resolver.ts` | Stance fallback chain, `resolveBestTokenAsset()` |
| `lang/en.json` | English i18n strings |
| `lang/pt-br.json` | Portuguese (BR) i18n strings |

## Projection Math

Dimetric 2:1 applied to `canvas.app.stage`:
- `rotation = -45°`, `skewX = skewY = 18.435°`, `ratio = 2.0`
- Grid: untouched — aligns naturally with stage transform
- Sprites: rendered as-is in transformed stage space (no per-mesh counter-transforms)

## Flags

| Flag | Type | Scope | Purpose |
|------|------|-------|---------|
| `flags.isoroll.enabled` | boolean | scene | Enable isometric stage transform |
| `flags.isoroll.transformBackground` | boolean | scene | Also apply isometric to background image (default false) |
| `flags.isoroll.volume.*` | object | tile/token | 3D bounding volume (x,y,z,width,depth,height) |

## Foundry v14 Gotchas

### AppV2 HTML injection

1. `html` in `renderSceneConfig` **IS the `<form>`** — `find("form")` returns 0
2. `[data-tab="basics"]` matches **both** nav `<a>` AND content `<section>` — always specify element type
3. Safe selector chain: `section[data-tab="basics"]` → `div[data-tab="basics"]` → `section.tab, div.tab` → `$html`
4. jQuery wrap: `html instanceof jQuery ? html : $(html as unknown as HTMLElement)`
5. Checkbox `name="flags.MODULE_ID.key"` — Foundry persists automatically via form submit

### Background sprite path

`canvas.environment.primary.background` — the **rendered** sprite; transforming this has visual effect.  
`canvas.primary.background` exists but is a different object — transforming it does nothing visible.

### Background counter-transform (dimetric 2:1)

To make the background appear undistorted while the stage is rotated:

```typescript
// reverseSkew = 0, NOT -18.435° — applying -18.435° inside a +18.435° parent doubles distortion
bg.rotation = rad(45);
bg.skew.set(0, 0);
bg.anchor.set(0.5, 0.5);

// world_scaleX = local_scaleX × 4/√10  (exact, from stage×counter-rotation matrix composition)
// Invert to match original visual size: local_scaleX = origScaleX × √10/4
const factor = Math.sqrt(10) / 4;  // ≈ 0.7906
bg.scale.set(origScaleX * factor, origScaleX * ratio * factor);

// Full-canvas center in Foundry scene coordinates (origin = scene top-left)
bg.position.set(scene.width / 2 + scene.width * padding, scene.height / 2 + scene.height * padding);
```

**Foundry pre-scales the background** — `PrimarySpriteMesh` scale ≠ (1,1). Capture at `canvasReady` before touching; use as base. Hardcoding `scale(1, ratio)` makes background appear ~1/4 size.

### Depth sort

`canvas.primary.children.sort()` corrupts Foundry's internal z-order. Proper approach requires `PrimaryCanvasGroup` API (custom foreground container + `zIndex`). DepthSorter is in tree but not activated — see ROADMAP phase 3.

## See Also

- [ROADMAP.md](ROADMAP.md) — full phase plan, architecture decisions
- `isoroll-content/` repo — AI art pipeline (private)

## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`src/transform/`](src/transform/) | Stage + background transforms, scene config UI |
| [`src/volume/`](src/volume/) | 3D volume flags and settings |
| [`src/sorter/`](src/sorter/) | Depth sort (dormant) |
| [`src/occluder/`](src/occluder/) | Tile occlusion |
| [`src/resolver/`](src/resolver/) | Asset stance fallback |
