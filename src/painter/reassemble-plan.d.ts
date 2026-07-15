import type { View } from "../assemble/types";
import type { WallDef } from "../walls";
import type { PainterModel } from "./model";
export interface FloorTileSpec {
    x: number;
    y: number;
    width: number;
    height: number;
    sort: number;
    "texture.src": string;
}
export interface ReassemblePlan {
    floorTileData: FloorTileSpec[];
    wallDefs: WallDef[];
    slices: number;
}
export declare function buildReassemblePlan(model: PainterModel, view: View): ReassemblePlan;
