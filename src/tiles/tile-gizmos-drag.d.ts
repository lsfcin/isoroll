import { HandleType } from "./tile-drag";
type Pt2 = {
    x: number;
    y: number;
};
export type HandleCtx = {
    tile: Tile;
    type: HandleType;
    pos: {
        cx: number;
        cy: number;
    };
    heightDir: Pt2;
    keys: Set<string>;
    tx: number;
    ty: number;
    tw: number;
    th: number;
    boundH: number;
    elev: number;
    gridSize: number;
    imgOff: Pt2;
    imgScale: number;
    imgYScale: number;
    imgHalfH: number;
};
export declare function swapSide(tile: Tile): void;
export declare function beginDrag(type: HandleType, tile: Tile, gx: number, gy: number, tx: number, ty: number, tw: number, th: number, boundH: number, elev: number, docX: number, docY: number, imgOffX?: number, imgOffY?: number, imgScale?: number, imgYScale?: number, imgHalfH?: number): void;
export declare function handlePointerDown(ctx: HandleCtx, e: {
    stopPropagation(): void;
    global: Pt2;
}): void;
export {};
