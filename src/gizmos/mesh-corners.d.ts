export type MeshHolder = {
    mesh: unknown;
};
export declare function imageBottomLeft(h: MeshHolder): {
    x: number;
    y: number;
};
export declare function imageTopRight(h: MeshHolder): {
    x: number;
    y: number;
};
export declare function imageBottomCenter(h: MeshHolder): {
    x: number;
    y: number;
};
export declare function imageTopCenter(h: MeshHolder): {
    x: number;
    y: number;
};
export declare function snapQuarterPx(canvasPx: number, gridSize: number): number;
export declare function snapQuarterUnits(units: number): number;
export declare function clientToGlobal(clientX: number, clientY: number): {
    x: number;
    y: number;
};
