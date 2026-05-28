# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Dev server: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
- Foundry running at `http://localhost:30000/game`

## Source Map

| Path | Responsibility |
|------|---------------|
| `src/module.ts` | Entry point — wires all hooks in `Hooks.once("init")` |
| `src/transform/canvas-transform.ts` | Stage rotation+skew (dimetric 2:1), hooks: canvasReady/updateScene |
| `src/transform/scene-config.ts` | "Enable Isoroll" checkbox injection into Scene Config UI |
| `src/transform/constants.ts` | `DIMETRIC_2_1` projection constants |
| `src/volume/flags.ts` | `MODULE_ID`, `VolumeFlags` registration |
| `src/volume/settings.ts` | DefaultTokenHeight, OcclusionOpacity module settings |
| `src/sorter/depth-sorter.ts` | Painter's algorithm Z-sort (gridCol+gridRow+elevation) |
| `src/occluder/occluder.ts` | Tile alpha fade when token is behind it |
| `src/resolver/asset-resolver.ts` | Stance fallback chain, `resolveBestTokenAsset()` |
| `lang/en.json` | English i18n strings |
| `lang/pt-br.json` | Portuguese (BR) i18n strings |

## Projection Math

Dimetric 2:1 applied to `canvas.app.stage`:
- `rotation = -45°` (π/4 rad)
- `skewX = skewY = 18.435°`
- `ratio = 2.0` (vertical compression factor)

- **Grid**: untouched — aligns naturally with stage transform
- **Sprites**: rendered as-is in transformed stage space (no per-mesh counter-transforms)

## Foundry v14 Gotchas

**AppV2 HTML injection** (applies to SceneConfig, ActorSheet, ItemSheet, etc.):

1. `html` argument in `renderSceneConfig` **IS the `<form>` element** — `find("form")` returns 0
2. `[data-tab="basics"]` matches **both** nav `<a>` AND content `<section>` — always specify element type
3. Safe target: `section[data-tab="basics"]` → `div[data-tab="basics"]` → `section.tab, div.tab` → `$html`
4. jQuery wrap: `html instanceof jQuery ? html : $(html as unknown as HTMLElement)`
5. Checkbox `name="flags.MODULE_ID.key"` — Foundry persists automatically, no `updateDocument()` needed

## Flags

| Flag | Type | Scope | Purpose |
|------|------|-------|---------|
| `flags.isoroll.enabled` | boolean | scene | Enable isometric transform for this scene |
| `flags.isoroll.volume.*` | object | tile/token | 3D bounding volume (x,y,z,width,depth,height) |

## See Also

- [ROADMAP.md](ROADMAP.md) — full phase plan, architecture decisions, known bugs
- `isoroll-content/` repo — AI art pipeline (private)

## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`src/transform/`](src/transform/) | Stage + mesh transforms, scene config UI |
| [`src/volume/`](src/volume/) | 3D volume flags and settings |
| [`src/sorter/`](src/sorter/) | Depth sort |
| [`src/occluder/`](src/occluder/) | Tile occlusion |
| [`src/resolver/`](src/resolver/) | Asset stance fallback |
