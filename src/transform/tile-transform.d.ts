export { onPreUpdateScene, onUpdateSceneGridRescale } from "./tile-transform-rescale";
export type MutMeshLike = {
    x: number;
    y: number;
    rotation: number;
    skew?: {
        x: number;
        y: number;
        set(x: number, y: number): void;
    };
    scale: {
        x: number;
        y: number;
        set(x: number, y: number): void;
    };
    anchor?: {
        x: number;
        y: number;
        set(x: number, y: number): void;
    };
    texture?: {
        width: number;
        height: number;
    };
};
export declare const EPS = 0.000001;
export declare function onUpdateTileFlags(doc: unknown, changes: Record<string, unknown>): void;
export declare function onPreUpdateTileFlip(doc: unknown, changes: Record<string, unknown>): void;
export declare function onRefreshTile(tile: Tile, _flags?: Record<string, boolean>): void;
