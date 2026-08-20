import type { FloorTileSpec } from "./floor-tiles-proto";
export type FogClass = "unseen" | "explored" | "visible";
export type FogRow = {
    tileId: string;
    slice: number;
    visible: boolean;
    alpha: number;
    tint: number;
};
export type FogCoverage = {
    unseen: number;
    explored: number;
    visible: number;
    total: number;
    darkenedFraction: number;
};
export declare function classifyFog(r: {
    visible: boolean;
    tint: number;
}): FogClass;
export declare function fogCoverage(rows: FogRow[]): FogCoverage;
export declare function countFloorTiles(specs: FloorTileSpec[]): number;
export declare function countSlices(dump: unknown[]): number;
export declare function dumpFogSlices(): FogRow[];
export declare function buildComparisonTable(protoA: Record<string, unknown>, protoB: Record<string, unknown>): Record<string, unknown>[];
