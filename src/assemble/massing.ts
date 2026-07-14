// T4 — TS twin of layout_massing.massing(layout, merge=False) with stairs skipped (C3).
// v2 (dsl-v2-ts-twin, T5): when `layout` came from a "level N:" DSL, stack every level's boxes
// (z0 = level_index * wallH; DECISION D1: single-level v1 layouts keep z0 unset — PIN-1), then
// append one "GRP" box per group cell (roofs/stairs), independent of level stacking.
import { DOOR, FLOOR, SOLID, WINDOW } from "./types";
import type { Box, Layout, Level, Opening } from "./types";
import { kind } from "./layout-parse";
import { grpBaseData, grpCellVoxels } from "./layout-groups";

function floorBoxes(layout: Layout): Box[] {
  const boxes: Box[] = [];
  for (let v = 0; v < layout.rows; v++) {
    let u = 0;
    while (u < layout.cols) {
      let run = 0;
      while (kind(layout, u + run, v) === FLOOR) {
        run++;
      }
      if (run > 0) {
        boxes.push({ u0: u, v0: v, l: run, d: 1, h: 0, kind: "floor", openings: [], axis: "u" });
      }
      u += Math.max(run, 1);
    }
  }
  return boxes;
}

function runOpenings(ch: string): Opening[] {
  let openings: Opening[] = [];
  if (ch === DOOR) {
    openings = [{ kind: "door", offset: 0 }];
  } else if (ch === WINDOW) {
    openings = [{ kind: "window", offset: 0 }];
  }
  return openings;
}

function cellAxis(layout: Layout, u: number, v: number): "u" | "v" {
  const left = kind(layout, u - 1, v);
  const right = kind(layout, u + 1, v);
  const up = kind(layout, u, v - 1);
  const down = kind(layout, u, v + 1);
  const leftSolid = SOLID.includes(left);
  const rightSolid = SOLID.includes(right);
  const upSolid = SOLID.includes(up);
  const downSolid = SOLID.includes(down);
  const horizontal = leftSolid || rightSolid;
  const vertical = upSolid || downSolid;
  let axis: "u" | "v" = "u";
  if (!horizontal && vertical) {
    axis = "v";
  }
  return axis;
}

function cellWallBoxes(layout: Layout): Box[] {
  const boxes: Box[] = [];
  for (let v = 0; v < layout.rows; v++) {
    for (let u = 0; u < layout.cols; u++) {
      const ch = kind(layout, u, v);
      if (SOLID.includes(ch)) {
        const openings = runOpenings(ch);
        const axis = cellAxis(layout, u, v);
        const box: Box = {
          u0: u,
          v0: v,
          l: 1,
          d: 1,
          h: layout.wallH,
          kind: "wall",
          openings,
          axis,
        };
        boxes.push(box);
      }
    }
  }
  return boxes;
}

// 3-arch.md Amendment (C3-seam+): one "GRP" box per group cell (D3), z0/h == that cell's
// grp_cell_voxels span (D0: per-cell Z-run — groups have no run-merge concept). Box position:
// v0==r, u0==c (kind(layout,u,v) convention: grid[v][u]).
function groupBoxes(layout: Layout): Box[] {
  const boxes: Box[] = [];
  for (const group of layout.groups ?? []) {
    const base = grpBaseData(group);
    for (const [r, c] of group.cells) {
      const [voxLo, voxHi] = grpCellVoxels(base, group, r, c);
      boxes.push({
        u0: c,
        v0: r,
        l: 1,
        d: 1,
        h: voxHi - voxLo,
        kind: "GRP",
        openings: [],
        axis: "u",
        z0: voxLo,
      });
    }
  }
  return boxes;
}

function massingOneLevel(layout: Layout): Box[] {
  const floors = floorBoxes(layout);
  const walls = cellWallBoxes(layout);
  return [...floors, ...walls];
}

function massingLeveled(layout: Layout, levels: Record<number, Level>): Box[] {
  const levelKeyStrings = Object.keys(levels);
  const levelKeys = levelKeyStrings.map(Number);
  levelKeys.sort((a, b) => a - b);
  const boxes: Box[] = [];
  for (const lvl of levelKeys) {
    const level = levels[lvl];
    const firstRow = level.g[0];
    const cols = level.g.length > 0 ? firstRow.length : 0;
    const sub: Layout = {
      name: layout.name,
      grid: level.g,
      wallH: layout.wallH,
      rows: level.g.length,
      cols,
      errors: [],
      warnings: [],
    };
    const oneLevelBoxes = massingOneLevel(sub);
    for (const box of oneLevelBoxes) {
      box.z0 = lvl * layout.wallH;
      boxes.push(box);
    }
  }
  const grpBoxes = groupBoxes(layout);
  boxes.push(...grpBoxes);
  return boxes;
}

export function massing(layout: Layout): Box[] {
  const levels = layout.levels;
  let boxes: Box[];
  if (levels && Object.keys(levels).length > 0) {
    boxes = massingLeveled(layout, levels);
  } else {
    boxes = massingOneLevel(layout);
  }
  return boxes;
}
