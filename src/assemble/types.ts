// T2 — pure types for the deterministic per-cell scene assembler (TS twin of scene_assemble.py).
// No logic here; see layout-parse.ts / massing.ts / assemble.ts for behavior.

export type View = "SW" | "SE" | "NE" | "NW";

export const WALL = "#";
export const FLOOR = ".";
export const VOID = " ";
export const DOOR = "D";
export const WINDOW = "W";
export const STAIRS = ["^", ">", "v", "<"] as const;
export const SOLID: string[] = [WALL, DOOR, WINDOW];
export const DEFAULT_WALL_H = 3;

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
