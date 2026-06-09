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
