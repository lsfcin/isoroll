import type { Layout, View } from "../assemble";
export type FloorTileSpec = {
    x: number;
    y: number;
    width: number;
    height: number;
    sort: number;
    "texture.src": string;
};
export declare const FLOOR_TEXTURE = "modules/isoroll/test/e2e/assets/kit/floor.png";
export declare function buildFloorTileSpecs(layout: Layout, view: View, gs: number): FloorTileSpec[];
