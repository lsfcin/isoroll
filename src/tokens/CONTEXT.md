# src/tokens/
> Token selection overlay (box, contour, handles, shadow) and always-visible indicators (elevation line).

## Files

| File | Responsibility |
|------|---------------|
| `token-gizmos.ts` | `TokenGizmos` — ALL selection-based content: image handles (circle/squares), volume box, image contour, elevation handle/label, test sprite, ground shadow. Hook: `controlToken` + `refreshToken`. |
| `token-background.ts` | `TokenBackground` — always-visible indicators: elevation line + unselected label. Hook: `controlToken` + `refreshToken`. |
| `token-elev-drag.ts` | Elevation drag logic (used by TokenGizmos). |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | — | — | **facade** — Public API for the tokens module |
| [`token-background.ts`](token-background.ts) | — | — | Always-visible indicators: elevation line and unselected label. |
| [`token-elev-drag.ts`](token-elev-drag.ts) | — | `beginElevDrag`, `pushElevHistory`, `commitElevDrag` | Elevation drag logic used by TokenGizmos. |
| [`token-gizmos.ts`](token-gizmos.ts) | — | — | Selection overlay: image handles, volume box, contour, elevation handle/label, test sprite, ground shadow. |
<!-- routing:end -->
