// T2 — pure types for the deterministic per-cell scene assembler (TS twin of scene_assemble.py).
// No logic here; see layout-parse.ts / massing.ts / assemble.ts for behavior.
//
// v2 (dsl-v2-ts-twin, T2): MARKERS/COMPASS_TO_ARROW/KNOWN_V2 import value SIDE_NAME/DIAG from
// ./layout-groups — a real runtime edge types->groups. layout-groups only `import type { Group }`
// from here (type-only, erased by esbuild), so no runtime cycle (3-arch.md module graph).
import { DIAG, SIDE_NAME } from "./layout-groups";

export type View = "SW" | "SE" | "NE" | "NW";

export const WALL = "#";
export const FLOOR = ".";
export const VOID = " ";
export const DOOR = "D";
export const WINDOW = "W";
export const STAIRS = ["^", ">", "v", "<"] as const;
export const SOLID: string[] = [WALL, DOOR, WINDOW];
export const DEFAULT_WALL_H = 3;

// v2 (dsl-v2-ts-twin, T2): R/S are group-surface voxel markers, not real grid content (Group below).
export const MARKERS = new Set(["R", "S"]);

const compassToArrow: Record<string, string> = {};
for (const arrow of Object.keys(SIDE_NAME)) {
  const compass = SIDE_NAME[arrow];
  compassToArrow[compass] = arrow;
}
export const COMPASS_TO_ARROW = compassToArrow;

export const KNOWN_V2 = new Set<string>([...SOLID, ...STAIRS, ...DIAG, ...MARKERS, FLOOR, VOID]);

export interface Layout {
  name: string;
  grid: string[];
  wallH: number;
  rows: number;
  cols: number;
  errors: string[];
  warnings: string[];
  // v2 (dsl-v2-ts-twin, T2): levels[N] = one "level N:" block; groups = roof/stair Group list.
  // OPTIONAL — v1 (flat-grid) layouts never set these; .grid/.rows/.cols stay authoritative then.
  levels?: Record<number, Level>;
  groups?: Group[];
}

// v2 (dsl-v2-ts-twin, T2) — one "level N:" block: grid + per-cell attr grids (rig.frag
// lay.side/type/wmat/fh maps). Sparse attr grids are keyed "r,c" -> value.
export interface Level {
  g: string[];
  side?: Record<string, string | number>;
  type?: Record<string, string | number>;
  wmat?: Record<string, string | number>;
  fh?: Record<string, string | number>;
}

// v2 (dsl-v2-ts-twin, T2) — one roof/stair sloped-surface group (rig.frag `grps` entries).
// cells reconstructed from R/S markers per DECISION D3 (3-arch.md). form: index into
// ROOF_FORMS or STAIR_TYPES (layout-groups.ts). dir: arrow char ("^"|">"|"v"|"<"). incl:
// ft/cell (2.5 or 5 for stairs). z: base height, voxels. enclose: index into ENCLOSE,
// roof-only (null for stairs).
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
  // v2 (dsl-v2-ts-twin, T5): voxel z-offset for GRP boxes. OPTIONAL — the v1 path never sets
  // this (PIN-1: assemble-parse.test.ts asserts byte-identical v1 boxes with no z0 key).
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
