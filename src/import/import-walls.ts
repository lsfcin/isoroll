// Manifest wall[] → per-tile WallDef[] for createWallsFromDefs (C1/C2, T3). Bridges the
// scene-grid-normalized manifest anchor space to the module's per-tile IMAGE-normalized space
// via canvasToAnchor — see 3-arch.md Deferred #1 (defToCanvas ∘ canvasToAnchor = identity).
import { canvasToAnchor, type TileDoc, type WallDef } from "../walls";
import { cellToWorld } from "./bake-frame";
import type { ManifestWall } from "./manifest-types";

type Cells = { u0: number; v0: number; u1: number; v1: number };

/** Manifest anchors are fractions of the whole cols x rows layout; undo that first. */
function inCells(w: ManifestWall, cols: number, rows: number): Cells {
  return { u0: w.ax * cols, v0: w.ay * rows, u1: w.bx * cols, v1: w.by * rows };
}

/**
 * A manifest wall states its RUN's bounding rect — (u0,v0) to (u0+l, v0+d) — not a line, because
 * that is what a massing box is. A Foundry wall is a segment, so it runs down the middle of that
 * box along the run's own axis: a `dir: "u"` run spans u and sits at the box's mid-v, and vice
 * versa. Taking the manifest's two corners as the segment would put every wall on its box's
 * DIAGONAL, which for a 1x1 wall cell is a 45-degree line through a square wall.
 *
 * D10 (thin walls on cell edges) will move this to the edge the wall is actually on; CP-4 is
 * deliberately shallow because of that.
 */
function centreline(w: ManifestWall, cols: number, rows: number): Cells {
  const { u0, v0, u1, v1 } = inCells(w, cols, rows);
  const midU = (u0 + u1) / 2;
  const midV = (v0 + v1) / 2;
  return w.dir === "v" ? { u0: midU, v0, u1: midU, v1 } : { u0, v0: midV, u1, v1: midV };
}

export function manifestWallsToDefs(
  walls: ManifestWall[],
  frameTile: TileDoc,
  cols: number,
  rows: number,
  gridSize: number,
): WallDef[] {
  return walls.map((w) => {
    const line = centreline(w, cols, rows);
    const a = cellToWorld(line.u0, line.v0, rows, gridSize);
    const b = cellToWorld(line.u1, line.v1, rows, gridSize);
    const canvas: [number, number, number, number] = [a.x, a.y, b.x, b.y];
    return {
      ...canvasToAnchor(frameTile, canvas),
      topOffset: w.topOffset,
      bottomOffset: w.bottomOffset,
      config: w.config,
      // v2 (dsl-v2-ts-twin, T7, PIN-4): wall-run axis passthrough, distinct from config.dir
      // (numeric door-swing side). OPTIONAL — omitted entirely when the manifest wall has none.
      ...(w.dir !== undefined ? { dir: w.dir } : {}),
    };
  });
}
