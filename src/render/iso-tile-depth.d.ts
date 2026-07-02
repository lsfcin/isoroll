import type { P2 } from "../transform";
export declare const DEPTH_SCALE = 10000;
export declare const TOKEN_BAND: number;
export declare const depthZIndex: (row: number, col: number, elev: number, band?: number) => number;
export interface SliceFace {
    row: number;
    col: number;
    x0: number;
    x1: number;
}
export interface WorldFace {
    row: number;
    col: number;
    a: P2;
    b: P2;
}
export declare function frontierFaces(Wg: number, Hg: number, c0: number, r0: number, gs: number): WorldFace[];
export declare function sliceDepthCell(i: number, nSlices: number, cuts: number[], fw: number, faces: SliceFace[]): SliceFace;
export declare function tileSortBand(tileId: string, peers: Array<{
    id: string;
    sort: number;
}>): number;
