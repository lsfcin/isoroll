export type View = "SW" | "SE" | "NE" | "NW";
export declare const WALL = "#";
export declare const FLOOR = ".";
export declare const VOID = " ";
export declare const DOOR = "D";
export declare const WINDOW = "W";
export declare const STAIRS: readonly ["^", ">", "v", "<"];
export declare const SOLID: string[];
export declare const DEFAULT_WALL_H = 3;
export declare const MARKERS: Set<string>;
export declare const COMPASS_TO_ARROW: Record<string, string>;
export declare const KNOWN_V2: Set<string>;
export interface Layout {
    name: string;
    grid: string[];
    wallH: number;
    rows: number;
    cols: number;
    errors: string[];
    warnings: string[];
    levels?: Record<number, Level>;
    groups?: Group[];
}
export interface Level {
    g: string[];
    side?: Record<string, string | number>;
    type?: Record<string, string | number>;
    wmat?: Record<string, string | number>;
    fh?: Record<string, string | number>;
}
export interface Group {
    kind: "roof" | "stair";
    cells: [number, number][];
    form: number;
    dir: string;
    incl: number;
    z: number;
    enclose: number | null;
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
    kind: "wall" | "floor" | "step" | "GRP";
    openings: Opening[];
    axis: "u" | "v";
    z0?: number;
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
