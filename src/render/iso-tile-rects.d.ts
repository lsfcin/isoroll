import type { Rect } from "./mesh-accessor";
export type TileRect = {
    tileId: string;
    asset: string;
    u: number;
    v: number;
    docX: number;
    docY: number;
    docWidth: number;
    docHeight: number;
    elevation: number;
    baseElevation: number;
    boundHeight: number;
    rect: Rect | null;
    worldRect: Rect | null;
};
export type StageMetrics = {
    gridSize: number;
    /**
     * Stage px one grid unit spends on the screen horizontal — the live stage matrix's `a`, zoom
     * divided out. The offline plan is in image px at `pxPerVoxel` px per voxel and a voxel is a
     * grid unit, so `pxPerGridUnit / pxPerVoxel` converts any plan length into a stage length.
     * Reported rather than recomputed test-side so the ruler is the projection Foundry is actually
     * running, not a constant copied out of the module and free to drift from it.
     */
    pxPerGridUnit: number;
    zoom: number;
};
export declare function dumpStageMetrics(): StageMetrics;
export declare function dumpTileRects(): TileRect[];
