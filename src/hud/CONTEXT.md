# src/hud/
> HUD patches and DOM helpers for TileHUD and TokenHUD iso-correct positioning.

## Files

| File | Responsibility |
|------|---------------|
| `hud-utils.ts` | DOM helpers: `hudButton()`, `clearIsorollHud()`, `appendHudButtons()`, `onHudAction/Toggle()`, `updateHudButton()`, `isIsoActive()`, `isoHudCenter()`, `isoVisualCssWidth()` |
| `tile-hud.ts` | `TileHud` — wall control buttons in TileHUD (generate/select/unlink/delete walls, door mode) |
| `token-hud.ts` | `TokenHud` — no-op shell; HUD repositioning handled by `patchTokenHUDProto` in `transform/ruler-patch.ts` |

## Key Gotchas

- **`_updatePosition` is patched on prototypes** in `transform/ruler-patch.ts`, not via hooks. Never use `renderTileHUD`/`renderTokenHUD` for positioning — they miss document-update re-renders and RAF timing can stomp `transform: scale(uiScale)`. Only set `pos.left/top/width` — never `pos.scale`.
- **AppV2 `transform-origin: top-left`**: `CSS left = tile visual left edge = center.left - visualCssW/2`. Height set to 0 (auto) to avoid `docH` dependency across tile dimension swaps.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |
