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
export declare function applyMeshTransform(tile: Tile, mesh: MutMeshLike): void;
