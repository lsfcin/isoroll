// Manifest wall[] → per-tile WallDef[] for createWallsFromDefs (C1/C2, T3). Bridges the
// scene-grid-normalized manifest anchor space to the module's per-tile IMAGE-normalized space
// via canvasToAnchor — see 3-arch.md Deferred #1 (defToCanvas ∘ canvasToAnchor = identity).
import { canvasToAnchor, type TileDoc, type WallDef } from "../walls";
import type { ManifestWall } from "./manifest-types";

export function manifestWallsToDefs(
  walls: ManifestWall[],
  frameTile: TileDoc,
  cols: number,
  rows: number,
  gridSize: number,
): WallDef[] {
  return walls.map((w) => {
    const canvas: [number, number, number, number] = [
      w.ax * cols * gridSize,
      w.ay * rows * gridSize,
      w.bx * cols * gridSize,
      w.by * rows * gridSize,
    ];
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
