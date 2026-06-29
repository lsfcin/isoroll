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

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the hud module — HUD patches and DOM helpers |
| [`hud-utils.ts`](hud-utils.ts) | [`hud-utils.d.ts`](hud-utils.d.ts) | `hudButton`, `clearIsorollHud`, `appendHudButtons`, `onHudAction`, `onHudToggle` | Façade to Foundry's HUD DOM. All direct HUD jQuery access lives here. |
| [`tile-hud.ts`](tile-hud.ts) | [`tile-hud.d.ts`](tile-hud.d.ts) | `buildDoorBtn`, `buildHudButtons` | TileHUD wall control buttons. |
| [`token-hud.ts`](token-hud.ts) | [`token-hud.d.ts`](token-hud.d.ts) | — | TokenHUD repositioning is handled by patchTokenHUDProto in ruler-patch.ts, |
<!-- routing:end -->
