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
export declare const MeshAccessor: {
    geometryOf(placeable: Tile | Token): MeshGeometry | null;
};
