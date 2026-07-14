import type { Group } from "./types";
export declare const NLVL = 10;
export declare const WALLISH: Set<string>;
export declare const DIAG: Set<string>;
export declare const STAIRS: Set<string>;
export declare const ARROW_CW: Record<string, string>;
export declare const DIAG_CW: Record<string, string>;
export declare const ASCENT: Record<string, [number, number]>;
export declare const SIDE_NAME: Record<string, string>;
export declare const ROOF_FORMS: readonly ["flat", "shed1", "shed2"];
export declare const STAIR_TYPES: readonly ["solid", "thin"];
export declare const ENCLOSE: readonly ["none", "edge", "inset"];
export declare const TYPES: Record<string, string[]>;
export interface GrpBaseData {
    aOf: (r: number, c: number) => number;
    aLow: number;
    aHigh: number;
    rise: number;
    form: string;
    hAt: (r: number, c: number) => number;
}
export declare function diagSolid(grid: string[], r: number, c: number, ch: string): string | null;
export declare function grpBaseData(group: Group): GrpBaseData;
export declare function grpCellVoxels(base: GrpBaseData, _group: Group, r: number, c: number): [number, number];
