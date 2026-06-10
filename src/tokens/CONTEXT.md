# src/tokens/
> Token volume overlay (3D box + contour) and interactive gizmos (image handles, elevation).

## Files

| File | Responsibility |
|------|---------------|
| `token-overlay.ts` | `TokenOverlay` — image contour + 3D bounding box on selected tokens. Hook: `refreshToken`. |
| `token-gizmos.ts` | `TokenGizmos` — image handles: BL circle (offset), TR square (scale), TC square (Y-scale). Hook: `controlToken` + `refreshToken`. |
| `token-elev-gizmo.ts` | `TokenElevGizmo` — elevation handle (orange circle at SE edge midpoint). Hook: `controlToken` + `refreshToken`. Elevation stored via `token.document.update({ elevation })`. |

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | — | — | **facade** — Public API for the tokens module — token volume overlay and interactive gizmos |
| [`token-elev-drag.ts`](token-elev-drag.ts) | — | `beginElevDrag`, `pushElevHistory`, `commitElevDrag` | Elevation drag logic for TokenElevGizmo — extracted to keep gizmo file under line limit. |
| [`token-elev-gizmo.ts`](token-elev-gizmo.ts) | [`token-elev-gizmo.d.ts`](token-elev-gizmo.d.ts) | — | Elevation handle for token volumes (orange circle, drag up/down changes elevation). |
| [`token-gizmos.ts`](token-gizmos.ts) | [`token-gizmos.d.ts`](token-gizmos.d.ts) | — | Image offset + scale handles for tokens (bottom-left circle, top-right square). |
| [`token-overlay.ts`](token-overlay.ts) | [`token-overlay.d.ts`](token-overlay.d.ts) | — | Image contour and 3D volume box overlay for selected tokens (merged from two classes). |
<!-- routing:end -->
