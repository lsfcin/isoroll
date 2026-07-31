export type MeshGeometry = {
    x: number;
    y: number;
    width: number;
    height: number;
    anchor: {
        x: number;
        y: number;
    };
    scale: {
        x: number;
        y: number;
    };
    rotation: number;
    skew: {
        x: number;
        y: number;
    };
};
export type Quad = {
    x: number;
    y: number;
}[];
export declare function meshQuad(geo: MeshGeometry | null): Quad | null;
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
/** Axis-aligned bounds of a point cloud — shared by every "where did this land" measurement. */
export declare function boundsOf(xs: number[], ys: number[]): Rect;
export declare function meshBounds(geo: MeshGeometry | null): Rect | null;
export declare const MeshAccessor: {
    geometryOf(placeable: Tile | Token): MeshGeometry | null;
};
