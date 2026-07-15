import type { Cell } from "./types";
export type WorldMatrix = {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
};
export type WallSide = "u0" | "u1" | "v0" | "v1";
export declare function cellAt(sx: number, sy: number, wt: WorldMatrix, gs: number): Cell;
export declare function lineCells(a: Cell, b: Cell): Cell[];
export declare function rectCells(a: Cell, b: Cell): Cell[];
export declare function nearestWallSide(cell: Cell, worldPt: {
    x: number;
    y: number;
}, gs: number): WallSide;
