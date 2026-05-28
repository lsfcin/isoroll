/**
 * Token occlusion by tile 3D volumes.
 *
 * A tile occludes a token when all three conditions hold:
 *   1. Tile depth-sort key > token depth-sort key  (tile is "in front")
 *   2. Tile and token screen footprints overlap (XY AABB intersection)
 *   3. Tile z-range [baseElev, baseElev + height] intersects token z-range
 *
 * Occluded tokens fade to configurable opacity (default 0.2).
 */

import { MODULE_ID, VolumeFlags } from "../volume/flags";
import { DepthSorter } from "../sorter/depth-sorter";

export class Occluder {
  static activate(): void {
    Hooks.on("refreshToken", Occluder.evaluateAll);
    Hooks.on("updateToken", Occluder.evaluateAll);
    Hooks.on("updateTile", Occluder.evaluateAll);
  }

  private static evaluateAll(): void {
    const tokens = canvas.tokens?.placeables ?? [];
    for (const token of tokens) {
      Occluder.evaluateToken(token);
    }
  }

  private static evaluateToken(token: Token): void {
    const occluded = Occluder.isOccluded(token);
    const targetAlpha = occluded
      ? ((game.settings.get(MODULE_ID, "occlusionOpacity") as number) ?? 0.2)
      : 1.0;

    if (token.mesh) {
      token.mesh.alpha = targetAlpha;
    }
  }

  private static isOccluded(token: Token): boolean {
    const tiles = canvas.tiles?.placeables ?? [];
    const gridSize = canvas.grid?.size ?? 100;

    const tokenKey = DepthSorter.sortKey(
      token.x / gridSize,
      token.y / gridSize,
      token.document.elevation ?? 0,
    );
    const tokenZBase = token.document.elevation ?? 0;
    const tokenZTop = tokenZBase + VolumeFlags.getTokenHeight(token.document);
    const tokenBounds = token.bounds;

    for (const tile of tiles) {
      const tileKey = DepthSorter.sortKey(
        tile.x / gridSize,
        tile.y / gridSize,
        VolumeFlags.getTileBaseElevation(tile.document),
      );

      if (tileKey <= tokenKey) continue;

      const tileZBase = VolumeFlags.getTileBaseElevation(tile.document);
      const tileZTop = tileZBase + VolumeFlags.getTileHeight(tile.document);

      const zOverlap = tokenZBase < tileZTop && tokenZTop > tileZBase;
      if (!zOverlap) continue;

      const tileBounds = tile.bounds;
      const xyOverlap =
        tokenBounds.right > tileBounds.left &&
        tokenBounds.left < tileBounds.right &&
        tokenBounds.bottom > tileBounds.top &&
        tokenBounds.top < tileBounds.bottom;

      if (xyOverlap) return true;
    }

    return false;
  }
}
