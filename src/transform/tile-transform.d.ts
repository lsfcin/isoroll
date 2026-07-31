export { onPreUpdateScene, onUpdateSceneGridRescale } from "./tile-transform-rescale";
export { EPS } from "./tile-mesh-place";
export type { MutMeshLike } from "./tile-mesh-place";
export declare function onUpdateTileFlags(doc: unknown, changes: Record<string, unknown>): void;
export declare function onPreUpdateTileFlip(doc: unknown, changes: Record<string, unknown>): void;
export declare function onRefreshTile(tile: Tile, _flags?: Record<string, boolean>): void;
