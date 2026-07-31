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
export declare function dumpTileRects(): TileRect[];
