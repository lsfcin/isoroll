// T1 — spike prototype (a): pure builder turning merged floor massing runs (NOT per-cell, NOT
// wall boxes) into Foundry v14 Tile create-data placed in the fog-driven iso-tile stack.
// Loop 4b body: massing(rotateCw(layout, TURNS[view])) from "../assemble", keep b.kind==="floor".
// SEMANTIC PIN: TURNS ({SW:0,SE:1,NE:2,NW:3}) must equal ../assemble/assemble.ts's private VIEW_TURNS.
import { massing, rotateCw } from "../assemble";
import type { Layout, View } from "../assemble";

export type FloorTileSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  sort: number;
  "texture.src": string;
};

export const FLOOR_TEXTURE = "modules/isoroll/test/e2e/assets/kit/floor.png";

// SEMANTIC PIN: must equal ../assemble/assemble.ts's private VIEW_TURNS.
const TURNS: Record<View, number> = { SW: 0, SE: 1, NE: 2, NW: 3 };

// v14 Tile document x/y = tile CENTER (per test/e2e/helpers.mjs createTiles convention), NOT top-left.
export function buildFloorTileSpecs(layout: Layout, view: View, gs: number): FloorTileSpec[] {
  const turned = rotateCw(layout, TURNS[view]);
  const allBoxes = massing(turned);
  const boxes = allBoxes.filter((b) => b.kind === "floor");
  return boxes.map((b) => ({
    x: b.u0 * gs + (b.l * gs) / 2,
    y: b.v0 * gs + (b.d * gs) / 2,
    width: b.l * gs,
    height: b.d * gs,
    sort: 0,
    "texture.src": FLOOR_TEXTURE,
  }));
}
