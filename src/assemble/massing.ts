// T4 — TS twin of layout_massing.massing(layout, merge=False) with stairs skipped (C3).
import { DOOR, FLOOR, SOLID, WINDOW } from "./types";
import type { Box, Layout, Opening } from "./types";
import { kind } from "./layout-parse";

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

export function massing(layout: Layout): Box[] {
  const floors = floorBoxes(layout);
  const walls = cellWallBoxes(layout);
  return [...floors, ...walls];
}
