import type { Layout, Level } from "../assemble/types";
export type PaintTool = "wall" | "floor" | "door" | "window" | "erase";
export interface Cell {
    u: number;
    v: number;
}
export interface Stroke {
    tool: PaintTool;
    cells: Cell[];
    slice: number;
    h: number;
    fh: number;
}
export interface Snapshot {
    slice: number;
    level: Level;
}
export interface PaintModel {
    layout: Layout;
    undoStack: Snapshot[];
}
