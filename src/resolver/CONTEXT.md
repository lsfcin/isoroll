# src/resolver/
> Asset stance fallback chain for token sprite resolution.

## Files

| File | Responsibility |
|------|---------------|
| `asset-resolver.ts` | `resolveBestTokenAsset()` — stance fallback chain; selects the best available image for a token given its current stance/direction. |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the resolver module — asset stance fallback chain |
| [`asset-resolver.ts`](asset-resolver.ts) | [`asset-resolver.d.ts`](asset-resolver.d.ts) | `stanceFallbackChain`, `resolveTokenAsset`, `resolveBestTokenAsset`, `resolveTileAsset` | ← add first-line comment |
<!-- routing:end -->
