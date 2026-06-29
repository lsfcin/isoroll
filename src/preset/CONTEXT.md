# src/preset/
> Image preset system: auto-save and auto-apply per-tile/token/background image settings.

## Files

| File | Responsibility |
|------|---------------|
| `preset-types.ts` | `TilePreset`, `TokenPreset`, `BackgroundPreset`, `IsorollPreset` interfaces |
| `preset-storage.ts` | File I/O: `readPreset()`, `writePreset()`, in-memory cache, `_index.json` management |
| `preset-diff.ts` | Change detection: `changedFlagKeys()`, key lists, `bgNativeChanged()`, `tileNativeChanged()` |
| `preset-upsert.ts` | `upsertTile()`, `upsertToken()`, `upsertBackground()` — debounced preset saves |
| `preset-apply.ts` | `applyTile()`, `applyToken()`, `applyBackground()`, `applyPresetToSource()` (sync, for `preCreateTile`) |
| `preset-ops.ts` | Thin coordinator shims; `autoApply*` entry points |
| `preset-manager.ts` | `PresetManager.activate()`: hooks (`preCreateTile`, `create/updateTile/Token/Scene`); console API (`window.ISOROLL_PRESETS`) |

## Key Gotchas

- **`preCreateTile` + blink**: calling `doc.updateSource(data)` in `preCreateTile` correctly modifies creation data. But calling `doc.update()` again in `createTile` with the same data causes a PIXI sprite blink. Skip the `createTile` fallback when `getCachedPreset(key)` confirms `preCreateTile` already applied.
- **`presetEnabled` flag**: per-object opt-out. When `false`, auto-apply and auto-upsert are skipped for that specific tile/token.
- **`FilePicker.upload` 5-param API**: param 4 is `body` (extra FormData, pass `{}`), param 5 is `options` (`notify: false` lives here). Passing `{ notify: false }` as param 4 silently ignores it.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the preset module — image preset system |
| [`preset-apply.ts`](preset-apply.ts) | [`preset-apply.d.ts`](preset-apply.d.ts) | `tilePresetData`, `applyTile`, `applyToken`, `applyBackground`, `autoApplyTile` | Preset apply: compute update data, apply to doc, auto-apply from file/cache. |
| [`preset-diff.ts`](preset-diff.ts) | [`preset-diff.d.ts`](preset-diff.d.ts) | `changedFlagKeys`, `intersects`, `bgNativeChanged`, `TILE_PRESET_KEYS`, `TOKEN_PRESET_KEYS` | Change-detection helpers: flag-key sets and changed-field predicates. |
| [`preset-manager.ts`](preset-manager.ts) | [`preset-manager.d.ts`](preset-manager.d.ts) | — | ← add first-line comment |
| [`preset-ops.ts`](preset-ops.ts) | [`preset-ops.d.ts`](preset-ops.d.ts) | `asTD`, `asUD`, `toScene`, `asFD`, `asTDp` | Shared type shims and helpers used across preset-apply, preset-upsert, preset-diff. |
| [`preset-storage.ts`](preset-storage.ts) | [`preset-storage.d.ts`](preset-storage.d.ts) | `deriveKey`, `getCachedPreset`, `preloadCache`, `readPreset`, `writePreset` | ← add first-line comment |
| [`preset-types.ts`](preset-types.ts) | [`preset-types.d.ts`](preset-types.d.ts) | — | ← add first-line comment |
| [`preset-upsert.ts`](preset-upsert.ts) | [`preset-upsert.d.ts`](preset-upsert.d.ts) | `debounced`, `upsertTile`, `upsertToken`, `upsertBackground`, `tileUpsertTimers` | Preset upsert: debounce + extract + write for tile, token, and background presets. |
<!-- routing:end -->
