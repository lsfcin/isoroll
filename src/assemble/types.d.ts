export type View = "SW" | "SE" | "NE" | "NW";
export declare const WALL = "#";
export declare const FLOOR = ".";
export declare const VOID = " ";
export declare const DOOR = "D";
export declare const WINDOW = "W";
export declare const STAIRS: readonly ["^", ">", "v", "<"];
export declare const SOLID: string[];
export declare const DEFAULT_WALL_H = 3;
export interface Layout {
    name: string;
    grid: string[];
    wallH: number;
    rows: number;
    cols: number;
    errors: string[];
    warnings: string[];
}
export interface Opening {
    kind: "door" | "window";
    offset: number;
}
export interface Box {
    u0: number;
    v0: number;
    l: number;
    d: number;
    h: number;
    kind: "wall" | "floor" | "step";
    openings: Opening[];
    axis: "u" | "v";
}
export interface KitPieceMeta {
    origin: [number, number];
    size: [number, number];
}
export interface KitMeta {
    px_per_unit: number;
    pieces: Record<string, KitPieceMeta>;
}
export interface Placement {
    piece: string;
    left: number;
    top: number;
}
export interface AssemblyPlan {
    placements: Placement[];
    width: number;
    height: number;
    dx: number;
    dy: number;
}
