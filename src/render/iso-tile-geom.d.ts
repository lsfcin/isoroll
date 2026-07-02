import type { P2 } from "../transform";
import { PlaceableDoc } from "./fog-helpers";
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
export declare function sliceCellOverlaps(cuts: number[], fw: number, Wg: number, Hg: number, snapX: number, snapY: number, gs: number, ax: number, flipped: boolean, mesh: Mesh): Map<number, Array<{
    dc: number;
    dr: number;
}>>;
export declare function cloneSliceTexture(src: PIXI.Texture, x: number, y: number, w: number, h: number): PIXI.Texture;
export declare function syncSlicePos(s: PIXI.Sprite, m: Mesh): void;
export declare function initSliceAnchor(s: PIXI.Sprite, m: Mesh, fw: number, cutLeft: number, sliceW: number): void;
export interface SliceGeom {
    elev: number;
    band: number;
}
export declare function buildSlice(mesh: Mesh, origFrame: PIXI.Rectangle, i: number, state: SliceState, nSlices: number, g: SliceGeom, doc: PlaceableDoc, layer: PIXI.Container): PIXI.Sprite;
