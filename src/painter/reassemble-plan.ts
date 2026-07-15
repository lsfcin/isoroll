// T5 — pure re-assembly plan builder (3-arch.md painter-mvp-1, the C6 seam). Loop 4b:
// massing(layout) -> mergeFloorStrips (own merged-strip builder — PIN D3: modeled on the algorithm
// in spike-floor/floor-tiles-proto, NOT imported; spike is deleted at Loop 6) + wallBoxesToDefs
// (one WallDef per massing() wall Box — no merge algorithm is described anywhere for walls, unlike
// the explicit floor merge). gs is sourced from CanvasEnv.gridSize() internally (test/unit/setup.ts
// stubs canvas.grid.size=100), not a param — keeps this module fully unit-testable per 3-arch.md.
import type { Box, View } from "../assemble/types";
import type { WallDef } from "../walls";
import type { PainterModel } from "./model";
import { massing } from "../assemble/massing";
import { rotateCw } from "../assemble/layout-parse";
import { CanvasEnv } from "../core";

// v14 Tile embedded-document create-data shape, modeled on spike-floor/floor-tiles-proto's
// buildFloorTileSpecs output (NOT imported — PIN D3, spike is deleted at Loop 6).
export interface FloorTileSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  sort: number;
  "texture.src": string;
}

export interface ReassemblePlan {
  floorTileData: FloorTileSpec[];
  wallDefs: WallDef[];
  slices: number;
}

// Placeholder kit asset path — wiring this to a real kit texture is reassemble-apply.ts's job
// (integration-only, e2e-territory per 3-arch.md; out of this loop's scope).
const FLOOR_TEXTURE = "modules/isoroll/assets/kit/floor.webp";

// SEMANTIC PIN: must equal ../assemble/assemble.ts's private VIEW_TURNS.
const VIEW_TURNS: Record<View, number> = { SW: 0, SE: 1, NE: 2, NW: 3 };

function floorTileFromBox(box: Box, gs: number): FloorTileSpec {
  const widthPx = box.l * gs;
  const heightPx = box.d * gs;
  const x = box.u0 * gs + widthPx / 2;
  const y = box.v0 * gs + heightPx / 2;
  return { x, y, width: widthPx, height: heightPx, sort: 0, "texture.src": FLOOR_TEXTURE };
}

function mergeFloorStrips(floorBoxes: Box[], gs: number): FloorTileSpec[] {
  const tiles: FloorTileSpec[] = [];
  for (const box of floorBoxes) {
    const tile = floorTileFromBox(box, gs);
    tiles.push(tile);
  }
  return tiles;
}

// Wall boxes are always 1x1 cells (massing.ts's cellWallBoxes); axis "u" -> horizontal segment
// (blocks v-movement), axis "v" -> vertical segment (blocks u-movement) — mirrors cellAxis()'s
// own convention in ../assemble/massing.ts.
function wallEndpoint(box: Box, ax: number, ay: number, gs: number): { bx: number; by: number } {
  let bx = ax;
  let by = ay;
  if (box.axis === "v") {
    by = ay + box.d * gs;
  } else {
    bx = ax + box.l * gs;
  }
  return { bx, by };
}

function wallDefFromBox(box: Box, gs: number): WallDef {
  const ax = box.u0 * gs;
  const ay = box.v0 * gs;
  const endpoint = wallEndpoint(box, ax, ay, gs);
  const bottomOffset = box.z0 ?? 0;
  const topOffset = bottomOffset + box.h;
  return {
    ax,
    ay,
    bx: endpoint.bx,
    by: endpoint.by,
    topOffset,
    bottomOffset,
    config: {},
    dir: box.axis,
  };
}

function wallBoxesToDefs(wallBoxes: Box[], gs: number): WallDef[] {
  const defs: WallDef[] = [];
  for (const box of wallBoxes) {
    const def = wallDefFromBox(box, gs);
    defs.push(def);
  }
  return defs;
}

function totalSlices(floorTileData: FloorTileSpec[], gs: number): number {
  let sum = 0;
  for (const tile of floorTileData) {
    sum += tile.width / gs;
  }
  return sum;
}

export function buildReassemblePlan(model: PainterModel, view: View): ReassemblePlan {
  const gs = CanvasEnv.gridSize();
  const layout = model.toLayout();
  const turns = VIEW_TURNS[view];
  // turns=0 (SW, the only view exercised pre-Loop 5) skips rotateCw entirely: rotateCw
  // (../assemble/layout-parse.ts, out of this loop's scope) only round-trips the flat `grid`,
  // dropping `levels`/`groups` even at 0 turns — calling it unconditionally would silently break
  // massing()'s multi-level path. Non-zero turns inherit that pre-existing limitation until a
  // later loop revisits it; C7's only e2e scenario is l-room at SW.
  const rotated = turns === 0 ? layout : rotateCw(layout, turns);
  const boxes = massing(rotated);
  const floorBoxes = boxes.filter((b) => b.kind === "floor");
  const wallBoxes = boxes.filter((b) => b.kind === "wall");
  const floorTileData = mergeFloorStrips(floorBoxes, gs);
  const wallDefs = wallBoxesToDefs(wallBoxes, gs);
  const slices = totalSlices(floorTileData, gs);
  return { floorTileData, wallDefs, slices };
}
