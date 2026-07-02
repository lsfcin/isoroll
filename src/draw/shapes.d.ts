import type { DrawAPI } from '../render';
export declare function suppressMipmap(texture: unknown): void;
export declare function drawDash(g: DrawAPI, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number): void;
export declare function drawDashedContour(g: DrawAPI, pts: {
    x: number;
    y: number;
}[], dash: number, gap: number, dashAlt?: number, gapAlt?: number): void;
