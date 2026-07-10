# src/import/
> Programmatic scene manifest import — validate, map, and create tiles/walls (module-walls-import).

## Files

| File | Responsibility |
|------|---------------|
| `manifest-types.ts` | `SceneManifest`, `ManifestTile`, `ManifestWall`, `ImportOptions`, `ImportResult` |
| `manifest-validate.ts` | `validateManifest()` — pure structural validation, mirrors `isoroll-content/src/cli/wall_schema.py` |
| `import-tiles.ts` | `manifestTileToData()` — pure manifest-tile → Foundry Tile creation-data mapping |
| `import-walls.ts` | `manifestWallsToDefs()` — scene-grid-normalized manifest walls → per-tile `WallDef[]` |
| `import-scene-manifest.ts` | `importSceneManifest()` — validate-before-write orchestrator, registered on `globalThis.isoroll` |

## Coordinate Conventions

Manifest wall anchors are **scene-grid-normalized** (over the full cols×rows layout), distinct
from the module's per-tile IMAGE-normalized `WallDef` space. `import-walls.ts` bridges the two via
`wall-coords.canvasToAnchor` — see `.loop/module-walls-import/3-arch.md` Deferred #1.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the import module — programmatic scene manifest import. |
| [`import-scene-manifest.ts`](import-scene-manifest.ts) | [`import-scene-manifest.d.ts`](import-scene-manifest.d.ts) | `importSceneManifest`, `toV14WallConfig` | Orchestrates a scene-manifest import: validate-before-write atomic guard (C3), then creates |
| [`import-tiles.ts`](import-tiles.ts) | [`import-tiles.d.ts`](import-tiles.d.ts) | `manifestTileToData` | Pure manifest-tile → Foundry Tile creation-data mapping (C1, T2). v14 center convention. |
| [`import-walls.ts`](import-walls.ts) | [`import-walls.d.ts`](import-walls.d.ts) | `manifestWallsToDefs` | Manifest wall[] → per-tile WallDef[] for createWallsFromDefs (C1/C2, T3). Bridges the |
| [`manifest-types.ts`](manifest-types.ts) | [`manifest-types.d.ts`](manifest-types.d.ts) | — | Scene manifest shapes for programmatic import — mirrors isoroll-content's scene_manifest.py output. |
| [`manifest-validate.ts`](manifest-validate.ts) | [`manifest-validate.d.ts`](manifest-validate.d.ts) | `validateManifest`, `inUnit`, `validateWall`, `validateTile` | Pure structural validator for scene manifests (C3) — mirrors isoroll-content's |
<!-- routing:end -->
