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
