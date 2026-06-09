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
