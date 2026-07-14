// T4 (dsl-v2-ts-twin, .loop/dsl-v2-ts-twin/3-arch.md) — DSL v2 grid + group validation, split
// out of layout-dsl-v2.ts to stay under the project's per-file line cap (3-arch.md T4 note).
// TS twin of layout_dsl_v2.py's _validate_level/_validate_groups/_touches_wall. Imports from
// ./types + ./layout-groups only (never from ./layout-dsl-v2 -> no cycle, one-directional).
import { DOOR, KNOWN_V2, MARKERS, SOLID, VOID, WINDOW } from "./types";
import type { Layout, Level } from "./types";
import { grpBaseData, grpCellVoxels } from "./layout-groups";

// v2 opening rule: >=1 solid orthogonal neighbor (looser than v1's straight-run check — v2 doors
// may sit at a level's floor/interior boundary, e.g. a hatch between levels).
function touchesWall(rows: string[], r: number, c: number): boolean {
  const cell = (rr: number, cc: number): string => {
    let result = VOID;
    if (rr >= 0 && rr < rows.length && cc >= 0 && cc < rows[rr].length) {
      result = rows[rr][cc];
    }
    return result;
  };
  const neighbors: [number, number][] = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  return neighbors.some(([rr, cc]) => SOLID.includes(cell(rr, cc)));
}

export function validateLevel(layout: Layout, lvl: number, level: Level): void {
  for (let r = 0; r < level.g.length; r++) {
    const row = level.g[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (!KNOWN_V2.has(ch)) {
        layout.errors.push(`level ${lvl} (${c},${r}) unknown cell '${ch}'`);
      } else if ((ch === DOOR || ch === WINDOW) && !touchesWall(level.g, r, c)) {
        layout.errors.push(`level ${lvl} (${c},${r}) '${ch}' not adjacent to any wall`);
      }
    }
  }
}

// First half of D3: walk every group's cells, accumulate the voxel spans each authored marker
// claims (keyed "lvl,r,c" -> [marker,...]) — errors on out-of-range incl along the way.
function collectGroupVoxels(layout: Layout): Map<string, string[]> {
  const gvox = new Map<string, string[]>();
  for (const group of layout.groups ?? []) {
    if (group.incl !== 2.5 && group.incl !== 5) {
      layout.errors.push(`group incl must be 2.5 or 5 (ft/cell): ${group.incl}`);
      continue;
    }
    const base = grpBaseData(group);
    const marker = group.kind === "stair" ? "S" : "R";
    for (const [r, c] of group.cells) {
      const [lo, hi] = grpCellVoxels(base, group, r, c);
      for (let lvl = lo; lvl < hi; lvl++) {
        const key = `${lvl},${r},${c}`;
        const arr = gvox.get(key) ?? [];
        arr.push(marker);
        gvox.set(key, arr);
      }
    }
  }
  return gvox;
}

function reportDoubleBooked(layout: Layout, gvox: Map<string, string[]>): void {
  for (const [key, markers] of gvox) {
    if (markers.length > 1) {
      const keyParts = key.split(",");
      const [lvl, r, c] = keyParts.map(Number);
      layout.errors.push(`level ${lvl} (${c},${r}) double-booked by ${markers.length} groups`);
    }
  }
}

// Second half of D3: every authored R/S marker in the level grids must be covered by exactly
// one group's computed voxel span (misplaced marker / wrong type).
function reportUncoveredMarkers(layout: Layout, gvox: Map<string, string[]>): void {
  const levels = layout.levels ?? {};
  const levelKeyStrings = Object.keys(levels);
  const levelKeys = levelKeyStrings.map(Number);
  levelKeys.sort((a, b) => a - b);
  for (const lvl of levelKeys) {
    const level = levels[lvl];
    for (let r = 0; r < level.g.length; r++) {
      const row = level.g[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (!MARKERS.has(ch)) {
          continue;
        }
        const markers = gvox.get(`${lvl},${r},${c}`);
        if (!markers) {
          layout.errors.push(`level ${lvl} (${c},${r}) marker '${ch}' not covered by any group`);
        } else if (markers.length === 1 && markers[0] !== ch) {
          layout.errors.push(
            `level ${lvl} (${c},${r}) marker '${ch}' != group type '${markers[0]}'`,
          );
        }
      }
    }
  }
}

// D3 union check: every authored R/S marker must be covered by exactly one group's computed
// voxel span (misplaced marker / wrong type), and no voxel may be claimed twice (double-book).
export function validateGroups(layout: Layout): void {
  const gvox = collectGroupVoxels(layout);
  reportDoubleBooked(layout, gvox);
  reportUncoveredMarkers(layout, gvox);
}
