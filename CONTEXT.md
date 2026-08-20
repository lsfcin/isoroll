# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.
> goal: [rpg-isoroll](../../brain/goals/rpg-isoroll.md)

> **Foundry v14 patterns, gotchas, and coordinate math → `/foundry` skill**
> (`core/skills/foundry.md` — run `/foundry` at session start)

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Build: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
- Start server `node /home/lucas/FoundryVTT/resources/app/main.js --dataPath=/home/lucas/foundrydata-v14 > /tmp/foundry.log 2>&1 &`
- Foundry running at `http://localhost:30000/game`
- Source code: `src/` — see [`src/CONTEXT.md`](src/CONTEXT.md) for full source map

---

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
| `flags.isoroll.imageOffset` | {x,y} | tile+token | {0,0} | WORLD-space displacement from natural center, normalized by gridSize |
| `flags.isoroll.imageScale` | number | tile+token | 1 | Image uniform scale multiplier |
| `flags.isoroll.imageYScale` | number | tile+token | 1 | Image Y-axis scale multiplier (for projection adaptation) |
| `flags.isoroll.backgroundYScale` | number | scene | 1 | Background image Y-scale multiplier (set via GridConfig Vertical Scale field) |
| `flags.isoroll.tileFlipped` | boolean | tile | false | Swap tile width↔height (mirror) |
| `flags.isoroll.showImageManipulation` | boolean | tile+token | true | Show image contour + imgOffset/imgScale/swapSide handles on select |
| `flags.isoroll.showVolumeManipulation` | boolean | tile+token | true | Show 3D box + elevation handle on select (tiles also: width/height/boundH/scale/move) |
| `flags.isoroll.presetEnabled` | boolean | tile+token | true | Opt-out of image preset auto-apply/upsert for this specific object |
| `flags.isoroll.sprite` | `{originPx:{x,y}, pxPerVoxel}` | tile | — | Baked-sprite geometry from an imported manifest: texel of the piece's world (0,0,0), and texture px per voxel. Present ⇒ the mesh is scaled by density and anchored on that texel instead of fitted to the volume box (`transform/tile-sprite-anchor.ts`) |
| `flags.isoroll.cell` | `{u,v}` | tile | — | The bake-frame cell an imported tile came from. Needed because the manifest grid sits a quarter turn off the module's (`import/import-tiles.ts`), so the document position no longer spells it out |

## Verification

- `npm run verify:fast` — lint + 17 unit/property tests (runs at every commit, gate-enforced)
- `npm run verify:full` — fast + build + headless e2e vs live Foundry (`test/e2e/run.mjs`: B-spec regressions, golden diffs). Needs server at `localhost:30000`.
- In-page oracle: `isoroll.dumpZOrderJSON()` — per-slice cell/depth/zIndex/visibility/bounds.
- Rules + layout: [`test/CONTEXT.md`](test/CONTEXT.md); pattern: `core/tools/verify/CONTEXT.md`.

## Known Limitations

- Token rotation: v14 auto-facing suppressed for undistorted tokens; 8-directional sprite selection not yet implemented (placeholder in `object-transform.ts`)
- Depth sort: `DepthSorter` class exists but is not activated — see ROADMAP
- `setFlag` not triggering `refreshTile` → [ISSUES B25](ISSUES.md)

> Implementation gotchas (hidden invariants, Foundry quirks) → [SPECS-practice.md](SPECS-practice.md)

## See Also

- [ROADMAP.md](ROADMAP.md) — full phase plan, architecture decisions
- [ISSUES.md](ISSUES.md) — confirmed bugs with root-cause analysis
- `isoroll-content/` repo — AI art pipeline (private)
- `/foundry` skill — Foundry v14 gotchas, coordinate systems, hooks, component hierarchy

<!-- routing:start -->
## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`refs/`](refs/CONTEXT.md) | Captured references for isoroll-module — tier-1 links in `refs/REFS.md`; promote to `refs/<slug>.yaml` for deep study (schema: `academy/papers/*/refs/CONTEXT.md`). |
| [`src/`](src/CONTEXT.md) | All TypeScript source for isoroll-module. Entry point: module.ts. |
| [`test/`](test/CONTEXT.md) | Verification suites: unit/ (vitest+fast-check, T1 pure math) and e2e/ (Playwright headless Foundry, T2 regression specs). See workspace VERIFY.md. |

| File | Description |
|------|-------------|
| [`ISSUES.md`](ISSUES.md) | isoroll-module — Issues |
| [`ROADMAP.md`](ROADMAP.md) | Pending work only — a finished item is cut, not ticked; done work is deleted and git is the history. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup. |
| [`SETUP.md`](SETUP.md) | isoroll — Development Setup |
| [`SPECS-decisions.md`](SPECS-decisions.md) | Every decision the module is built on, and what each one rules out. |
| [`SPECS-practice.md`](SPECS-practice.md) | What bites when implementing against Foundry, and where each thing lives. |
| [`SPECS.md`](SPECS.md) | isoroll — Specs |
| [`eslint.config.js`](eslint.config.js) | ESLint flat config — TypeScript rules for isoroll-module; extends workspace shared rules (R1-R6). |
| [`styles/isoroll.scss`](styles/isoroll.scss) | Global SCSS styles for isoroll-module — settings form, HUD, scene config tab |
| [`vite.config.ts`](vite.config.ts) | Vite build config — bundles isoroll-module to FoundryVTT-compatible IIFE |
| [`vitest.config.ts`](vitest.config.ts) | Vitest config — T1 unit tests for pure math modules (see workspace VERIFY.md). |
| [`vitest.scenario.config.ts`](vitest.scenario.config.ts) | Loop 5 (.craft/dsl-v2-ts-twin) — scratch config to run the DSL v2 twin user-scenario script, |
<!-- routing:end -->
