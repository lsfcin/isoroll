# src/walls/
> Linked wall system: generate, sync, door, undo, overlay, and lifecycle management.

## Files

| File | Responsibility |
|------|---------------|
| `wall-types.ts` | `DoorBehavior` enum and wall type definitions |
| `wall-flags.ts` | Flag accessors: `getLinkedWallIds()`, `setLinkedWallIds()`, `hasLinkedDoor()`, `getDoorBehavior()`, `setDoorBehavior()` |
| `wall-coords.ts` | Coordinate helpers: `canvasToAnchor()`, `anchorToCanvas()`, `wallsLayer()`, `scene()`, `TileDoc` type. `imageOffset` and elevation factored in here — `heightDir.x = +1, heightDir.y = -1` hardcoded for all isoroll projections. |
| `wall-types.ts` | `DoorBehavior` and other wall type definitions |
| `wall-crud.ts` | `generateBaseWalls()`, `deleteLinkedWalls()`, `unlinkAllWalls()`, `generateBaseWallDefs()` |
| `wall-sync.ts` | `updateLinkedWallPositions()`, `flipLinkedWallAnchorsX()` |
| `wall-door.ts` | `applyDoorBehavior()`, `cycleDoorBehavior()` |
| `wall-history.ts` | `WallHistory` — undo stack for wall operations |
| `wall-manager.ts` | `WallManager.activate()` — lifecycle hooks: `updateTile` / `deleteTile` / `updateWall` / `deleteWall`. Public static façade for tile-config and tile-hud actions. |
| `wall-overlay.ts` | `WallOverlay` — PIXI wall line + endpoint rendering; select mode |
| `wall-overlay-ops.ts` | Interactive helpers: `addEndpointHandles()`, `addLineHover()`, `addWallDblClick()`, `addSelectInteraction()` |

## Coordinate Conventions

Wall anchor points are stored in **IMAGE [0,1]² space** (same as `imageOffset` UV). `canvasToAnchor` / `anchorToCanvas` convert between IMAGE and WORLD, accounting for tile position, elevation (`heightDir.x = +1, heightDir.y = -1`), and `imageOffset`.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the walls module — linked wall system |
| [`wall-coords.ts`](wall-coords.ts) | [`wall-coords.d.ts`](wall-coords.d.ts) | `wallsLayer`, `scene`, `tileRect`, `imageRect`, `imageRectAt` | Canvas coordinate helpers and Foundry shims for the walls system. |
| [`wall-crud.ts`](wall-crud.ts) | [`wall-crud.d.ts`](wall-crud.d.ts) | `generateBaseWallDefs`, `createWallsFromDefs`, `deleteLinkedWalls`, `linkSelectedWalls`, `unlinkAllWalls` | Create, delete, link, and extract linked wall documents for a tile. |
| [`wall-door.ts`](wall-door.ts) | [`wall-door.d.ts`](wall-door.d.ts) | `applyDoorBehavior`, `cycleDoorBehavior` | Door-behavior application and cycling for linked-wall tiles. |
| [`wall-flags.ts`](wall-flags.ts) | [`wall-flags.d.ts`](wall-flags.d.ts) | `getLinkedWallIds`, `setLinkedWallIds`, `pruneLinkedWalls`, `getDoorBehavior`, `setDoorBehavior` | Linked-wall and door-behavior flag accessors for tile documents. |
| [`wall-history.ts`](wall-history.ts) | [`wall-history.d.ts`](wall-history.d.ts) | `WallHistory`, `tileHistLen`, `recreateWalls`, `refreshTile` | Undo stack for isoroll wall operations on the Tiles layer. |
| [`wall-manager.ts`](wall-manager.ts) | [`wall-manager.d.ts`](wall-manager.d.ts) | — | ← add first-line comment |
| [`wall-overlay-ops.ts`](wall-overlay-ops.ts) | [`wall-overlay-ops.d.ts`](wall-overlay-ops.d.ts) | `wallColor`, `drawWallDisplay`, `drawWallSelect`, `WALL_COLORS`, `drawEpDot` | Per-wall IsoRenderer drawing + endpoint drag logic. |
| [`wall-overlay.ts`](wall-overlay.ts) | [`wall-overlay.d.ts`](wall-overlay.d.ts) | — | PIXI overlay: shows linked walls when tile is selected, with select-mode picking. |
| [`wall-sync.ts`](wall-sync.ts) | [`wall-sync.d.ts`](wall-sync.d.ts) | `updateLinkedWallPositions`, `flipLinkedWallAnchorsX` | Linked-wall position synchronization when a tile moves or flips. |
| [`wall-types.ts`](wall-types.ts) | [`wall-types.d.ts`](wall-types.d.ts) | — | ← add first-line comment |
<!-- routing:end -->
