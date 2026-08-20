// T3 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — pure geometry helpers for sloped-surface
// GROUPS (roofs/stairs), TS twin of layout_groups.py (ported from design/feel-rig/rig.frag
// L184-199 vocab, L365-372 diagSolid, L423-443 grpBaseData/grpCellVoxels). Leaf runtime: imports
// ONLY `import type { Group }` from ./types (type-only, erased -> no runtime edge).
//
// Loop 4a (tests-first): data tables are ported verbatim (pure literals, nothing to get wrong at
// this stage); diagSolid/grpBaseData/grpCellVoxels are signature-only stubs so test/unit/dsl-v2-*
// seams import cleanly and fail on missing BEHAVIOR (Loop 4b), not on missing modules.
import type { Group } from "./types";

export const NLVL = 10;

export const WALLISH = new Set(["#", "D", "W"]);
export const DIAG = new Set(["/", "\\"]);
export const STAIRS = new Set(["^", ">", "v", "<"]);
export const ARROW_CW: Record<string, string> = { "^": ">", ">": "v", v: "<", "<": "^" };
export const DIAG_CW: Record<string, string> = { "/": "\\", "\\": "/" };
export const ASCENT: Record<string, [number, number]> = {
  "^": [0, -1],
  ">": [1, 0],
  v: [0, 1],
  "<": [-1, 0],
};
export const SIDE_NAME: Record<string, string> = { "^": "N", ">": "E", v: "S", "<": "W" };
export const ROOF_FORMS = ["flat", "shed1", "shed2"] as const;
export const STAIR_TYPES = ["solid", "thin"] as const;
export const ENCLOSE = ["none", "edge", "inset"] as const;
export const TYPES: Record<string, string[]> = {
  "#": ["stone", "wood"],
  ".": ["stone", "grass", "road"],
  D: ["wood", "iron"],
  W: ["bars", "glass"],
};

export interface GrpBaseData {
  aOf: (r: number, c: number) => number;
  aLow: number;
  aHigh: number;
  rise: number;
  form: string;
  hAt: (r: number, c: number) => number;
}

// rig.frag L365-372 — which triangle (NE/NW/SE/SW) a derived diagonal at (r,c) fills, or null.
export function diagSolid(grid: string[], r: number, c: number, ch: string): string | null {
  const rows = grid.length;
  const cols = grid.length > 0 ? grid[0].length : 0;
  const solid = (rr: number, cc: number): boolean =>
    rr >= 0 && rr < rows && cc >= 0 && cc < cols && WALLISH.has(grid[rr][cc]);
  const n = solid(r - 1, c);
  const s = solid(r + 1, c);
  const w = solid(r, c - 1);
  const e = solid(r, c + 1);
  let result: string | null = null;
  if (ch === "\\") {
    if (n && e && !solid(r - 1, c + 1)) {
      result = "NE";
    } else if (s && w && !solid(r + 1, c - 1)) {
      result = "SW";
    }
  } else {
    if (n && w && !solid(r - 1, c - 1)) {
      result = "NW";
    } else if (s && e && !solid(r + 1, c + 1)) {
      result = "SE";
    }
  }
  return result;
}

// aOf(r,c) per rig.frag grpBaseData L425 — projection onto the group's ascent axis.
function ascentProjector(direction: string): (r: number, c: number) => number {
  let projector: (r: number, c: number) => number;
  if (direction === ">") {
    projector = (_r: number, c: number): number => c;
  } else if (direction === "<") {
    projector = (_r: number, c: number): number => -c;
  } else if (direction === "v") {
    projector = (r: number, _c: number): number => r;
  } else {
    projector = (r: number, _c: number): number => -r; // "^"
  }
  return projector;
}

// rig.frag L423-435 — base-frame geometry for one Group (aOf/aLow/aHigh/rise/form/hAt).
export function grpBaseData(group: Group): GrpBaseData {
  const aOf = ascentProjector(group.dir);
  let aLow = Number.POSITIVE_INFINITY;
  let aHigh = Number.NEGATIVE_INFINITY;
  const alongUv = group.dir === ">" || group.dir === "<";
  for (const [r, c] of group.cells) {
    for (const d of [0, 1]) {
      let a: number;
      if (alongUv) {
        a = aOf(0, c + d);
      } else {
        a = aOf(r + d, 0);
      }
      aLow = Math.min(aLow, a);
      aHigh = Math.max(aHigh, a);
    }
  }
  // stairs always use "shed1" for hAt regardless of STAIR_TYPES[group.form] (that only affects
  // rendering/name).
  const form = group.kind === "stair" ? "shed1" : ROOF_FORMS[group.form];
  const hAt = (r: number, c: number): number => {
    let result: number;
    if (form === "flat") {
      result = group.z;
    } else {
      const a = aOf(r, c);
      if (form === "shed1") {
        result = group.z + ((a - aLow) * group.incl) / 5;
      } else {
        const distToEdge = Math.min(a - aLow, aHigh - a);
        result = group.z + (distToEdge * group.incl) / 5;
      }
    }
    return result;
  };
  return { aOf, aLow, aHigh, rise: group.incl / 5, form, hAt };
}

// rig.frag L437-443 — [voxLo, voxHi) the surface passes through over cell (r,c).
export function grpCellVoxels(
  base: GrpBaseData,
  _group: Group,
  r: number,
  c: number,
): [number, number] {
  const eps = 1e-9;
  const h00 = base.hAt(r, c);
  const h10 = base.hAt(r + 1, c);
  const h01 = base.hAt(r, c + 1);
  const h11 = base.hAt(r + 1, c + 1);
  const hs = [h00, h10, h01, h11];
  const lo = Math.min(...hs);
  const hi = Math.max(...hs);
  const loFloor = Math.floor(lo + eps);
  const voxLo = Math.max(0, loFloor);
  const hiCeil = Math.ceil(hi - eps);
  const voxHiMax = Math.max(voxLo + 1, hiCeil);
  const voxHi = Math.min(NLVL, voxHiMax);
  return [voxLo, voxHi];
}
