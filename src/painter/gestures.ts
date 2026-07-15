// T2 — cell hit-test + gesture geometry (3-arch.md painter-mvp-1). Pure: no PIXI, no Foundry.
import { screenPointToCanvas } from "../core";
import type { Cell } from "./types";

export type WorldMatrix = { a: number; b: number; c: number; d: number; tx: number; ty: number };
export type WallSide = "u0" | "u1" | "v0" | "v1";

// Screen point -> painter cell: screenPointToCanvas(sx,sy,wt) then floor-divide by gs (core/util).
export function cellAt(sx: number, sy: number, wt: WorldMatrix, gs: number): Cell {
  const canvasPt = screenPointToCanvas(sx, sy, wt);
  const u = Math.floor(canvasPt.x / gs);
  const v = Math.floor(canvasPt.y / gs);
  return { u, v };
}

// Bresenham line, inclusive of both endpoints, ordered a -> b (ghost preview draws in order).
export function lineCells(a: Cell, b: Cell): Cell[] {
  const cells: Cell[] = [];
  const du = Math.abs(b.u - a.u);
  const dv = -Math.abs(b.v - a.v);
  const su = a.u < b.u ? 1 : -1;
  const sv = a.v < b.v ? 1 : -1;
  let u = a.u;
  let v = a.v;
  let err = du + dv;
  for (;;) {
    cells.push({ u, v });
    if (u === b.u && v === b.v) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dv) {
      err += dv;
      u += su;
    }
    if (e2 <= du) {
      err += du;
      v += sv;
    }
  }
  return cells;
}

// All cells in the axis-aligned rectangle spanned by a,b, inclusive, drag-direction independent.
export function rectCells(a: Cell, b: Cell): Cell[] {
  const uMin = Math.min(a.u, b.u);
  const uMax = Math.max(a.u, b.u);
  const vMin = Math.min(a.v, b.v);
  const vMax = Math.max(a.v, b.v);
  const cells: Cell[] = [];
  for (let v = vMin; v <= vMax; v++) {
    for (let u = uMin; u <= uMax; u++) {
      cells.push({ u, v });
    }
  }
  return cells;
}

// Nearest side of `cell`'s canvas-space bounding box (size gs) to worldPt — door/window pick.
export function nearestWallSide(
  cell: Cell,
  worldPt: { x: number; y: number },
  gs: number,
): WallSide {
  const left = cell.u * gs;
  const top = cell.v * gs;
  const right = left + gs;
  const bottom = top + gs;
  const distLeft = Math.abs(worldPt.x - left);
  const distRight = Math.abs(worldPt.x - right);
  const distTop = Math.abs(worldPt.y - top);
  const distBottom = Math.abs(worldPt.y - bottom);
  let side: WallSide = "u0";
  let best = distLeft;
  if (distRight < best) {
    side = "u1";
    best = distRight;
  }
  if (distTop < best) {
    side = "v0";
    best = distTop;
  }
  if (distBottom < best) {
    side = "v1";
    best = distBottom;
  }
  return side;
}
