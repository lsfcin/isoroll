# Gotchas and repo shape
> What bites when implementing against Foundry, and where each thing lives.
> governs: src/, test/

## Implementation Gotchas

- **`tile.x/tile.y` = 0 in v14** — use `tile.document.x/y` (CENTER, not top-left); top-left = `doc.x
  - width/2, doc.y - height/2`
- **`mesh.scale.set()`** (absolute) is safe on every refresh; only `*=` patterns need meshReset guard
- **`addIsorollTab` double-inject**: no guard — if `renderSceneConfig` fires more than once for same
  dialog, Iso tab appears twice. Fix: `if ($html.find(\`a[data-tab="${TAB}"]\`).length) return;` at
  top of `addIsorollTab`.
- **AppV2 `stopPropagation`** on custom tab click leaves `tabGroups[group]` stale; clicking back to
  native tabs requires explicit `addClass("active")` on content section (see `ui/scene-config.ts`)
- **GridConfig `_processSubmitData`** only calls `super._processSubmitData` when one of 7 native
  fields changed. Module-specific fields silently skipped. Workaround: instance-level patch on
  `app._processSubmitData` at `renderGridConfig` time (done in `background/bg-html.ts`).
- **GridConfig `updateTransform` centering**: when overriding bg sprite's `updateTransform`, `scY`
  in position formula must include `bgYScale` — if only `scale.set()` uses it, visual center shifts
  vertically instead of scaling around center.
- **PIXI `worldTransform` cache on `canvasReady`**: after `stage.rotation/skew` are set,
  `worldTransform` is stale (identity) until next PIXI render frame. Foundry only sets `#hud
  style.left/top = wt.tx/ty` inside `canvasPan` — never on initial load. Fix:
  `syncHudAfterStageApply()` in `stage-transform.ts` flushes cache (`updateLocalTransform` +
  `copyFrom`) and syncs `#hud` CSS immediately. Do NOT call `stage.updateTransform()` — crashes when
  `stage.parent` is null (true during `canvasReady`).
- **HUD `_updatePosition` pattern**: both TileHUD and TokenHUD use prototype patches on
  `CONFIG.Tile/Token.hudClass.prototype._updatePosition`. Never use `renderTileHUD`/`renderTokenHUD`
  hooks — they miss document-update re-renders and RAF timing can stomp Foundry's `transform:
  scale(uiScale)`. Only set `pos.left/top/width` — never `pos.scale`.
- **`preCreateTile` + `updateSource`**: calling `doc.updateSource(data)` in `preCreateTile` modifies
  creation data. Calling `doc.update()` again in `createTile` with same data causes PIXI sprite
  blink. Solution: skip `createTile` fallback when `getCachedPreset(key)` confirms `preCreateTile`
  already applied.
- **`FilePicker.upload` 5-param API**: param 4 is `body` (extra FormData entries, pass `{}`), param
  5 is `options` (`notify: false` lives here). Passing `{ notify: false }` as param 4 silently
  ignores it.

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
