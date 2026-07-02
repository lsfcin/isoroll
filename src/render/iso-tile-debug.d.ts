type Mesh = PIXI.DisplayObject & {
    texture?: PIXI.Texture;
    anchor?: PIXI.ObservablePoint;
    scale?: PIXI.ObservablePoint;
    rotation?: number;
};
export interface SliceDebugParams {
    id: string;
    tile: Tile;
    mesh: Mesh;
    origFrame: PIXI.Rectangle;
    cuts: number[];
    rawCuts: number[];
    faces: import("./iso-tile-depth").SliceFace[];
    frontierWorldPts: import("../transform").P2[];
    Wg: number;
    Hg: number;
    nSlices: number;
    flipped: boolean;
}
export declare function drawSliceDebug(p: SliceDebugParams, layer: PIXI.Container): void;
export declare function clearSliceDebug(id: string): void;
export declare function clearAllSliceDebug(): void;
export declare function drawGridDebug(layer: PIXI.Container): void;
export declare function clearGridDebug(): void;
export {};
