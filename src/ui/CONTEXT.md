# src/ui/
> Config form tab injection for SceneConfig, TileConfig, and TokenConfig (AppV2).

## Files

| File | Responsibility |
|------|---------------|
| `tab-helpers.ts` | `addIsorollTab()`, `flagCheckbox()` — shared AppV2 tab injection helpers |
| `scene-config.ts` | Isoroll tab for SceneConfig: projection dropdown, enable/transformBg checkboxes, custom params |
| `tile-config.ts` | Isoroll tab for TileConfig: volume flags + wall management buttons |
| `token-config.ts` | Isoroll tab for TokenConfig: transformToken, imageOffset/scale fields |

## Key Gotchas

- **No double-inject guard in `addIsorollTab`**: if `renderSceneConfig` fires more than once for the same dialog, the Iso tab appears twice. Add `if ($html.find(\`a[data-tab="${TAB}"]\`).length) return;` at top if needed.
- **AppV2 `stopPropagation` stale `tabGroups`**: clicking a custom tab stops propagation, leaving `tabGroups[group]` stale. Clicking back to native tabs requires explicit `addClass("active")` on the content section.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |
