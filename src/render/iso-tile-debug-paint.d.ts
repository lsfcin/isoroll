import type { P2 } from "../transform";
import type { SliceDebugParams } from "./iso-tile-debug";
type PixiGfx = {
    eventMode?: string;
    lineStyle?(w: number, c: number, a: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    beginFill?(c: number, a: number): void;
    drawCircle?(x: number, y: number, r: number): void;
    endFill?(): void;
    closePath?(): void;
    circle?(x: number, y: number, r: number): void;
    fill?(opts: {
        color: number;
    }): void;
    rect?(x: number, y: number, w: number, h: number): void;
    drawRect?(x: number, y: number, w: number, h: number): void;
    stroke?(opts: {
        color: number;
        width: number;
        alpha?: number;
    }): void;
};
type PixiTextLike = PIXI.Text & {
    anchor?: {
        set(x: number, y: number): void;
    };
};
export declare const SLICE_COLORS: number[];
export declare function makeText(str: string, fill: number, size: number): PixiTextLike;
export declare function _isV8(g: PixiGfx): boolean;
export declare function drawCutLines(con: PIXI.Container, cuts: number[], fw: number, ax: number, ay: number, fh: number, sx: number, sy: number): void;
export declare function drawCutMarkers(con: PIXI.Container, cuts: number[], rawCuts: number[], fw: number, ax: number, ay: number, fh: number, sx: number, sy: number): void;
export declare function drawFrontierDots(id: string, frontierWorldPts: P2[], layer: PIXI.Container, worldContainers: Map<string, PIXI.Container>): void;
export declare function drawSliceOutlines(con: PIXI.Container, p: SliceDebugParams, fw: number, ax: number, ay: number, fh: number, sx: number, sy: number, tid: string): void;
export declare function drawCellLabels(wc: PIXI.Container, p: SliceDebugParams, snapX: number, snapY: number, gridC0: number, gridR0: number): void;
export {};
