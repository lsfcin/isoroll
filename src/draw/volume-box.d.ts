import type { WorldBoxVerts, DrawAPI } from '../render';
export type BoxVerts = WorldBoxVerts;
export type P = {
    x: number;
    y: number;
};
export declare function drawAnchorLine(g: DrawAPI, v: BoxVerts): void;
export declare function drawBox(g: DrawAPI, v: BoxVerts): void;
