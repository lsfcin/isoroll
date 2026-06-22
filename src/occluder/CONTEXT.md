# src/occluder/
> Tile alpha fade when a token moves behind it.

## Files

| File | Responsibility |
|------|---------------|
| `occluder.ts` | `Occluder.activate()` — hooks `refreshToken`, `updateToken`, `updateTile`, `createToken`, `deleteToken`. Fades tile alpha based on token/tile overlap. |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the occluder module — tile alpha fade when a token moves behind it |
| [`occluder.ts`](occluder.ts) | [`occluder.d.ts`](occluder.d.ts) | `evaluateAll`, `_evaluateTile`, `_hasTokenBehind` | Alpha occlusion — fades tiles when a token is behind them. |
<!-- routing:end -->
