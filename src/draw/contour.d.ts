import type { MeshGeometry, DrawAPI } from '../render';
export interface MeshLike {
    x: number;
    y: number;
    rotation: number;
    scale: {
        x: number;
        y: number;
    };
    texture?: {
        width: number;
        height: number;
    };
    anchor?: {
        x: number;
        y: number;
    };
}
export declare function drawMeshContour(g: DrawAPI, geo: MeshGeometry | null, wt: PIXI.Matrix): void;
