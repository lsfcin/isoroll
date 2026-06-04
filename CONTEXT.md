# isoroll-module
> Foundry VTT v14 isometric projection module — TypeScript + Vite + SCSS.

> **Foundry v14 patterns, gotchas, and coordinate math → `/foundry` skill**
> (`Core/skills/foundry.md` — run `/foundry` at session start)

## Quick Start

- Enable per scene: Scene Config → Basics → "Enable Isoroll" checkbox
- Build: `npm run build` → symlink at `/home/lucas/foundrydata-v14/Data/modules/isoroll`
- Foundry running at `http://localhost:30000/game`

## Source Map

### Entry point
| Path | Responsibility |
|------|---------------|
| `src/module.ts` | Wires all hooks in `Hooks.once("init")` |
| `src/flags.ts` | `MODULE_ID`, `VolumeFlags` flag accessors (boundHeight, imageOffset, imageScale, showImageManipulation, showVolumeManipulation, tileFlipped, …) |
| `src/settings.ts` | `registerVolumeSettings()` — DefaultTokenHeight + OcclusionOpacity module settings |
| `src/util.ts` | Shared math + drag: `canvasZoom`, `gridDistance`, `elevToCanvas`, `screenToCanvas`, `screenPointToCanvas`, `scheduleWrap`, `startPointerDrag<T>` |

### `src/transform/` — coordinate math only
| Path | Responsibility |
|------|---------------|
| `transform/constants.ts` | `PROJECTION_TYPES` (8 presets), `getProjection(scene)`, `currentProjection()`, `IsoProjection` interface |
| `transform/stage-transform.ts` | `CanvasTransform` — stage rotation+skew, `previewOverride`, hooks: canvasReady/updateScene |
| `transform/bg-transform.ts` | Background sprite counter-transform: `getBgYScale()`, `setBgYScaleOverride()`, `applyBgTransform()` |
| `transform/object-transform.ts` | Per-token/tile counter-transform, hooks: refreshToken/refreshTile |
| `transform/tile-transform.ts` | Tile-specific transform math |
| `transform/token-transform.ts` | Token-specific transform math |
| `transform/ruler-patch.ts` | Ruler coordinate patch for iso space |

### `src/ui/` — all config form tab injection
| Path | Responsibility |
|------|---------------|
| `ui/tab-helpers.ts` | `addIsorollTab()`, `flagCheckbox()` — shared AppV2 tab injection helpers |
| `ui/scene-config.ts` | Isoroll tab for SceneConfig: projection dropdown, enable/transformBg checkboxes, custom params |
| `ui/tile-config.ts` | Isoroll tab for TileConfig: volume flags + wall management buttons |
| `ui/token-config.ts` | Isoroll tab for TokenConfig: transformToken, imageOffset/scale fields |

### `src/hud/` — HUD patches
| Path | Responsibility |
|------|---------------|
| `hud/hud-utils.ts` | DOM helpers: `hudButton()`, `clearIsorollHud()`, `appendHudButtons()`, `onHudAction/Toggle()`, `updateHudButton()`, `isIsoActive()`, `isoHudPosition()` |
| `hud/tile-hud.ts` | `TileHud` — wall control buttons in TileHUD (generate/select/unlink/delete walls, door mode) |
| `hud/token-hud.ts` | `TokenHud` — TokenHUD repositioning under iso stage transform |

### `src/render/`
| Path | Responsibility |
|------|---------------|
| `render/layer-manager.ts` | Central PIXI layer registry: `ensureLayer`, `bringToTop`, `clearLayer`, `declareOrder` |

### `src/draw/` — PIXI drawing utilities
| Path | Responsibility |
|------|---------------|
| `draw/constants.ts` | Visual constants: `ORANGE`, `BLACK`, `DASH_LEN`, `GAP_LEN`, alpha values |
| `draw/shapes.ts` | `drawDash()`, `drawDashedContour()` |
| `draw/contour.ts` | `drawMeshContour()`, `MeshLike` interface — shared image contour for tiles and tokens |
| `draw/volume-box.ts` | 3D box geometry: `BoxVerts`, `P`, `computeVerts()` (tile), `computeTokenVerts()` (token), `drawBox()`, `drawAnchorLine()` |

### `src/gizmos/` — handle factories and drag math
| Path | Responsibility |
|------|---------------|
| `gizmos/handle-draw.ts` | Low-level PIXI handle drawing: `makeCircleHandle()`, `makeSquareCounterHandle()` |
| `gizmos/handle-factories.ts` | `makeHandleForType()`, `createRotateBlocker()` — typed handle construction |
| `gizmos/mesh-corners.ts` | Corner/center helpers: `imageBottomLeft/TopRight/BottomCenter/TopCenter()`, `clientToGlobal()`, snap helpers |
| `gizmos/img-drag.ts` | Image drag math: `projectImgOffset()`, `projectImgScale()`, `projectImgYScale()` |

### `src/tiles/` — tile volume overlays + gizmos
| Path | Responsibility |
|------|---------------|
| `tiles/tile-overlay.ts` | `VolumeOverlay` — 3D box + image contour on selected tiles |
| `tiles/tile-gizmos.ts` | `VolumeGizmos` — volume handles (width/height/boundH/elevation/scale/move) + image handles (imgOffset/imgScale/imgYScale/swapSide) |
| `tiles/tile-drag.ts` | `DragState`, `HandleType`, `handlePositions()`, `commitDrag()` — tile handle drag math |

### `src/tokens/` — token volume overlays + gizmos
| Path | Responsibility |
|------|---------------|
| `tokens/token-overlay.ts` | `TokenOverlay` — image contour + 3D box on selected tokens |
| `tokens/token-gizmos.ts` | `TokenGizmos` — image handles (BL circle: offset, TR square: scale, TC square: Y-scale) |
| `tokens/token-elev-gizmo.ts` | `TokenElevGizmo` — elevation handle (orange circle, SE edge midpoint) |

### `src/background/` — background image gizmos (GridConfig only)
| Path | Responsibility |
|------|---------------|
| `background/bg-html.ts` | `BgHtml` — GridConfig HTML injection: Vertical Scale field, key/wheel handlers, `_processSubmitData` patch, preview-bg caching |
| `background/bg-gizmos.ts` | `BackgroundGizmos` — PIXI handles + dashed contour on background image; scale/translate/yScale drag |
| `background/bg-drag.ts` | `BgDrag` type + `commitBgDrag()` — drag math for all three background handle types |

### `src/walls/` — linked wall system
| Path | Responsibility |
|------|---------------|
| `walls/wall-coords.ts` | Coordinate helpers: `canvasToAnchor()`, `anchorToCanvas()`, `wallsLayer()`, `scene()`, `TileDoc` type |
| `walls/wall-flags.ts` | Flag accessors: `getLinkedWallIds()`, `setLinkedWallIds()`, `hasLinkedDoor()`, `getDoorBehavior()`, `setDoorBehavior()` |
| `walls/wall-types.ts` | `DoorBehavior` and other wall type definitions |
| `walls/wall-crud.ts` | `generateBaseWalls()`, `deleteLinkedWalls()`, `unlinkAllWalls()`, `generateBaseWallDefs()` |
| `walls/wall-sync.ts` | `updateLinkedWallPositions()`, `flipLinkedWallAnchorsX()` |
| `walls/wall-door.ts` | `applyDoorBehavior()`, `cycleDoorBehavior()` |
| `walls/wall-history.ts` | `WallHistory` — undo stack for wall operations |
| `walls/wall-manager.ts` | `WallManager` — lifecycle hooks (updateTile/deleteTile/updateWall/deleteWall) + public static façade for tile-config and tile-hud |
| `walls/wall-overlay.ts` | `WallOverlay` — PIXI wall line + endpoint rendering; select mode |
| `walls/wall-overlay-ops.ts` | Interactive helpers: `addEndpointHandles()`, `addLineHover()`, `addWallDblClick()`, `addSelectInteraction()` |

### `src/preset/` — image preset system
| Path | Responsibility |
|------|---------------|
| `preset/preset-types.ts` | `TilePreset`, `TokenPreset`, `BackgroundPreset`, `IsorollPreset` interfaces |
| `preset/preset-storage.ts` | File I/O: `readPreset()`, `writePreset()`, cache, `_index.json` |
| `preset/preset-diff.ts` | Change detection: `changedFlagKeys()`, key lists, `bgNativeChanged()`, `tileNativeChanged()` |
| `preset/preset-upsert.ts` | `upsertTile()`, `upsertToken()`, `upsertBackground()` — debounced preset saves |
| `preset/preset-apply.ts` | `applyTile()`, `applyToken()`, `applyBackground()`, `applyPresetToSource()` (sync, for preCreateTile) |
| `preset/preset-ops.ts` | Thin coordinator shims; `autoApply*` entry points |
| `preset/preset-manager.ts` | `PresetManager.activate()`: hooks (preCreateTile, create/updateTile/Token/Scene); console API (`window.ISOROLL_PRESETS`) |

### Other
| Path | Responsibility |
|------|---------------|
| `src/occluder/occluder.ts` | Tile alpha fade when token is behind it |
| `src/sorter/depth-sorter.ts` | Depth sort (dormant — not activated, see ROADMAP) |
| `src/resolver/asset-resolver.ts` | Stance fallback chain, `resolveBestTokenAsset()` |
| `lang/en.json` | English i18n strings |
| `lang/pt-br.json` | Portuguese (BR) i18n strings |

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
| `flags.isoroll.imageOffset` | {x,y} | tile+token | {0,0} | Canvas-pixel offset of image from natural center |
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
- `setFlag` fires `refreshTile` with `{refreshPosition, refreshPerception}` only — `isMeshReset` returns false; scale guarded by meshReset won't run for flag-only changes
- `mesh.scale.set()` (absolute) is safe on every refresh; only `*=` patterns need meshReset guard
- `addIsorollTab` has no double-inject guard — if `renderSceneConfig` fires more than once for the same dialog (edge case), the Iso tab will appear twice; add `if ($html.find(\`a[data-tab="${TAB}"]\`).length) return;` at the top of `addIsorollTab` if this becomes a problem
- AppV2 `stopPropagation` on custom tab click leaves `tabGroups[group]` stale; clicking back to native tabs requires explicit `addClass("active")` on the content section (see `ui/scene-config.ts`)
- **GridConfig `_processSubmitData`** only calls `super._processSubmitData` when one of 7 native fields changed. Module-specific fields silently skipped. Workaround: instance-level patch on `app._processSubmitData` at `renderGridConfig` time (done in `background/bg-html.ts`).
- **GridConfig `updateTransform` centering**: when overriding the bg sprite's `updateTransform`, `scY` in the position formula must include `bgYScale` — if only `scale.set()` uses it, the visual center shifts vertically instead of scaling around center.
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
| [`src/transform/`](src/transform/) | Stage transform, bg transform, per-object counter-transform (math only — no UI) |
| [`src/ui/`](src/ui/) | All config form tab injection (SceneConfig, TileConfig, TokenConfig) |
| [`src/hud/`](src/hud/) | HUD patches (TileHUD wall buttons, TokenHUD repositioning) |
| [`src/draw/`](src/draw/) | PIXI drawing utilities (constants, shapes, contour, volume-box geometry) |
| [`src/gizmos/`](src/gizmos/) | Handle factories, mesh corner helpers, image drag math |
| [`src/tiles/`](src/tiles/) | Tile volume overlay + gizmos + drag math |
| [`src/tokens/`](src/tokens/) | Token volume overlay + image gizmos + elevation gizmo |
| [`src/background/`](src/background/) | Background image gizmos (GridConfig only): HTML injection + PIXI drawing + drag math |
| [`src/walls/`](src/walls/) | Linked wall system: coords, flags, CRUD, sync, door, history, manager, overlay |
| [`src/preset/`](src/preset/) | Image preset system: types, storage, diff, upsert, apply, manager |
| [`src/render/`](src/render/) | LayerManager (central PIXI layer registry) |
| [`src/occluder/`](src/occluder/) | Tile occlusion |
| [`src/sorter/`](src/sorter/) | Depth sort (dormant) |
| [`src/resolver/`](src/resolver/) | Asset stance fallback |
