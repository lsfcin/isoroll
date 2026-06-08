export type { P2, P3, AffineMatrix, TileMeshCoord } from "./coord-types";
export {
  screenToViewport, viewportToScreen,
  worldToViewport, viewportToWorld,
  worldDeltaToViewport, viewportDeltaToWorld,
  screenToWorld, worldToScreen,
  worldToImage, imageToWorld,
  worldToGrid, gridToWorld,
  iso3DToWorld, worldToIso3D,
  elevationToWorldOffset,
} from "./coord-transforms";

import type { P2, P3 } from "./coord-types";
import type { AffineMatrix, TileMeshCoord } from "./coord-types";
import {
  screenToWorld, worldToScreen,
  viewportToWorld, worldToViewport,
  imageToWorld, worldToImage,
  gridToWorld, worldToGrid,
  iso3DToWorld, worldToIso3D,
} from "./coord-transforms";

export type CoordSystem = "SCREEN" | "VIEWPORT" | "WORLD" | "IMAGE" | "GRID" | "ISO3D";

export interface TransformContext {
  wt?: AffineMatrix;
  mesh?: TileMeshCoord;
  gridSize?: number;
  gridDistance?: number;
  heightDir?: P2;
  elevation?: number;
}

/**
 * Universal Coordinate Transformer.
 * Converts a point from `fromSys` to `toSys` using internal mapping functions.
 * Uses WORLD space as the hub for O(1) routing instead of O(N²).
 */
export function transformCoord(
  p: P2 | P3,
  fromSys: CoordSystem,
  toSys: CoordSystem,
  ctx: TransformContext
): P2 | P3 {
  if (fromSys === toSys) return { ...p };

  let worldP: P2;
  switch (fromSys) {
    case "WORLD":
      worldP = { x: p.x, y: p.y };
      break;
    case "SCREEN":
      if (!ctx.wt) throw new Error("wt required for SCREEN → WORLD");
      worldP = screenToWorld(p, ctx.wt);
      break;
    case "VIEWPORT":
      if (!ctx.wt) throw new Error("wt required for VIEWPORT → WORLD");
      worldP = viewportToWorld(p, ctx.wt);
      break;
    case "IMAGE":
      if (!ctx.mesh) throw new Error("mesh required for IMAGE → WORLD");
      worldP = imageToWorld(p, ctx.mesh);
      break;
    case "GRID":
      if (ctx.gridSize === undefined) throw new Error("gridSize required for GRID → WORLD");
      worldP = gridToWorld(p, ctx.gridSize);
      break;
    case "ISO3D":
      if (ctx.heightDir === undefined || ctx.gridSize === undefined || ctx.gridDistance === undefined) {
        throw new Error("heightDir, gridSize, gridDistance required for ISO3D → WORLD");
      }
      worldP = iso3DToWorld(p as P3, ctx.heightDir, ctx.gridSize, ctx.gridDistance);
      break;
    default:
      throw new Error(`Unknown fromSys: ${fromSys}`);
  }

  if (toSys === "WORLD") return worldP;

  switch (toSys) {
    case "SCREEN":
      if (!ctx.wt) throw new Error("wt required for WORLD → SCREEN");
      return worldToScreen(worldP, ctx.wt);
    case "VIEWPORT":
      if (!ctx.wt) throw new Error("wt required for WORLD → VIEWPORT");
      return worldToViewport(worldP, ctx.wt);
    case "IMAGE":
      if (!ctx.mesh) throw new Error("mesh required for WORLD → IMAGE");
      return worldToImage(worldP, ctx.mesh);
    case "GRID":
      if (ctx.gridSize === undefined) throw new Error("gridSize required for WORLD → GRID");
      return worldToGrid(worldP, ctx.gridSize);
    case "ISO3D":
      if (ctx.heightDir === undefined || ctx.gridSize === undefined || ctx.gridDistance === undefined || ctx.elevation === undefined) {
        throw new Error("heightDir, gridSize, gridDistance, and elevation required for WORLD → ISO3D");
      }
      return worldToIso3D(worldP, ctx.elevation, ctx.heightDir, ctx.gridSize, ctx.gridDistance);
    default:
      throw new Error(`Unknown toSys: ${toSys}`);
  }
}
