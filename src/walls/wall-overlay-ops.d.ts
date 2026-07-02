import { type WallDoc } from "./wall-coords";
import type { DrawAPI, ShapeSpec } from "../render";
export declare const WALL_COLORS: {
    normal: number;
    terrain: number;
    invisible: number;
    ethereal: number;
    sound: number;
    door: number;
    secret: number;
    window: number;
};
export declare function wallColor(doc: WallDoc): number;
export declare function drawEpDot(g: DrawAPI, col: number, alpha: number, x: number, y: number, outer?: number, inner?: number): void;
export declare function drawWallLine(g: DrawAPI, c: number[], col: number, alpha: number): void;
export declare function lineVis(c: number[], col: number): ShapeSpec;
export declare function toCanvas(ev: PointerEvent): {
    x: number;
    y: number;
};
export declare function wallHitArea(c: number[], nw: number, ew: number): {
    x: number;
    y: number;
}[];
export declare function drawWallDisplay(tile: Tile, tileId: string, keys: Set<string>): void;
