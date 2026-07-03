import type { P2 } from "../transform";
import type { SliceFace } from "./iso-tile-depth";
export type Mesh = PIXI.DisplayObject & {
    texture?: PIXI.Texture;
    anchor?: PIXI.ObservablePoint;
    scale?: PIXI.ObservablePoint;
    alpha?: number;
    rotation?: number;
};
export interface SliceState {
    cuts: number[];
    rawCuts: number[];
    faces: SliceFace[];
    fw: number;
    frontierWorldPts: P2[];
    meshRot: number;
    meshScX: number;
    meshFlipped: boolean;
}
export declare function gridMetrics(tile: Tile): {
    gs: number;
    nwX: number;
    nwY: number;
    Wg: number;
    Hg: number;
};
export declare function tileSliceCount(tile: Tile): number;
export declare function computeSliceCuts(tile: Tile, mesh: Mesh, origFrame: PIXI.Rectangle): SliceState;
export declare function sliceStateChanged(prev: SliceState, fresh: SliceState, sliceCount: number): boolean;
