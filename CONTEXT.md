# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.

> **Foundry v14 patterns, gotchas, and coordinate math → `/foundry` skill**
> (`Core/skills/foundry.md` — run `/foundry` at session start)

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Build: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
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

## Known Limitations / Gotchas

- Token rotation: v14 auto-facing suppressed for undistorted tokens; 8-directional sprite selection not yet implemented (placeholder in `object-transform.ts`)
- Depth sort: `DepthSorter` class exists but is not activated — see ROADMAP
- `tile.x/tile.y` = 0 in v14 — use `tile.document.x/y` (CENTER, not top-left); top-left = `doc.x - width/2, doc.y - height/2`
- **`setFlag` does NOT trigger `refreshTile`**: flag-only updates (`changes` contains only `flags.*`) set no Tile render flags in `_onUpdate`. Use the `updateTile` hook → `onUpdateTileFlags` which manually calls `tile.renderFlags.set({ refreshMesh: true })`.
- `mesh.scale.set()` (absolute) is safe on every refresh; only `*=` patterns need meshReset guard
- `addIsorollTab` has no double-inject guard — if `renderSceneConfig` fires more than once for the same dialog (edge case), the Iso tab will appear twice; add `if ($html.find(\`a[data-tab="${TAB}"]\`).length) return;` at the top of `addIsorollTab` if this becomes a problem
- AppV2 `stopPropagation` on custom tab click leaves `tabGroups[group]` stale; clicking back to native tabs requires explicit `addClass("active")` on the content section (see `ui/scene-config.ts`)
- **GridConfig `_processSubmitData`** only calls `super._processSubmitData` when one of 7 native fields changed. Module-specific fields silently skipped. Workaround: instance-level patch on `app._processSubmitData` at `renderGridConfig` time (done in `background/bg-html.ts`).
- **GridConfig `updateTransform` centering**: when overriding the bg sprite's `updateTransform`, `scY` in the position formula must include `bgYScale` — if only `scale.set()` uses it, the visual center shifts vertically instead of scaling around center.
- **PIXI `worldTransform` cache on `canvasReady`**: after `stage.rotation/skew` are set, `worldTransform` is stale (identity) until the next PIXI render frame. Also, Foundry only sets `#hud style.left/top = wt.tx/ty` inside `canvasPan` — never on initial load. Fix: `syncHudAfterStageApply()` in `stage-transform.ts` flushes the cache (`updateLocalTransform` + `copyFrom`) and syncs `#hud` CSS immediately. Do NOT call `stage.updateTransform()` — crashes when `stage.parent` is null (true during `canvasReady`).
- **HUD `_updatePosition` pattern**: both TileHUD and TokenHUD use prototype patches on `CONFIG.Tile/Token.hudClass.prototype._updatePosition`. Never use `renderTileHUD`/`renderTokenHUD` hooks — they miss document-update re-renders and RAF timing can stomp Foundry's `transform: scale(uiScale)`. Only set `pos.left/top/width` — never `pos.scale`.
- **`preCreateTile` + `updateSource`**: calling `doc.updateSource(data)` in `preCreateTile` does modify the creation data. But calling `doc.update()` again in `createTile` with the same data causes a PIXI sprite blink. Solution: skip the `createTile` fallback when `getCachedPreset(key)` confirms `preCreateTile` already applied.
- **`FilePicker.upload` 5-param API**: param 4 is `body` (extra FormData entries, pass `{}`), param 5 is `options` (`notify: false` lives here). Passing `{ notify: false }` as param 4 silently ignores it.

## See Also

- [ROADMAP.md](ROADMAP.md) — full phase plan, architecture decisions
- [KNOWN-BUGS.md](KNOWN-BUGS.md) — confirmed bugs with root-cause analysis
- `isoroll-content/` repo — AI art pipeline (private)
- `/foundry` skill — Foundry v14 gotchas, coordinate systems, hooks, component hierarchy

## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`src/`](src/CONTEXT.md) | All TypeScript source — entry point, flags, settings, util, all subsystems |

<!-- routing:start -->
## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`src/`](src/CONTEXT.md) | All TypeScript source for isoroll-module. Entry point: module.ts. |

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`KNOWN-BUGS.md`](KNOWN-BUGS.md) | — | — | isoroll-module — Known Bugs |
| [`ROADMAP.md`](ROADMAP.md) | — | — | isoroll — Roadmap |
| [`SETUP.md`](SETUP.md) | — | — | isoroll — Development Setup |
| [`SPECS.md`](SPECS.md) | — | — | isoroll — Specs |
| [`eslint.config.js`](eslint.config.js) | — | — | ← add first-line comment |
| [`vite.config.ts`](vite.config.ts) | — | — | ← add first-line comment |
| [`styles/isoroll.scss`](styles/isoroll.scss) | — | — | ← add first-line comment |
<!-- routing:end -->
