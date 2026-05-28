/**
 * Tile occlusion fade when a token stands behind the tile's 3D volume.
 *
 * Tile fades (not token) when ALL hold:
 *   1. Tile sort key > token sort key  (tile is "in front" of token)
 *   2. Tile and token screen-space AABB overlap
 *   3. Tile z-range [baseElev, baseElev+height] intersects token z-range
 *
 * Occluding tiles fade to configurable opacity (default 0.2).
 * Transition is instant — PIXI alpha set directly.
 */

import { MODULE_ID, VolumeFlags } from "../volume/flags";
import { DepthSorter } from "../sorter/depth-sorter";

export class Occluder {
  static activate(): void {
    Hooks.on("refreshToken", Occluder.evaluateAll);
    Hooks.on("updateToken", Occluder.evaluateAll);
    Hooks.on("updateTile", Occluder.evaluateAll);
    Hooks.on("createToken", Occluder.evaluateAll);
    Hooks.on("deleteToken", Occluder.evaluateAll);
  }

  private static evaluateAll(): void {
    const tiles = canvas.tiles?.placeables ?? [];
    for (const tile of tiles) {
      Occluder.evaluateTile(tile);
    }
  }

  private static evaluateTile(tile: Tile): void {
    const hiding = Occluder.hasTokenBehind(tile);
    const targetAlpha = hiding
      ? ((game.settings.get(MODULE_ID, "occlusionOpacity") as number) ?? 0.2)
      : 1.0;

    if (tile.mesh) {
      tile.mesh.alpha = targetAlpha;
    }
  }

  private static hasTokenBehind(tile: Tile): boolean {
    const tokens = canvas.tokens?.placeables ?? [];
    const gridSize = canvas.grid?.size ?? 100;

    const tileKey = DepthSorter.sortKey(
      tile.x / gridSize,
      tile.y / gridSize,
      VolumeFlags.getTileBaseElevation(tile.document),
    );
    const tileZBase = VolumeFlags.getTileBaseElevation(tile.document);
    const tileZTop = tileZBase + VolumeFlags.getTileHeight(tile.document);
    const tileBounds = tile.bounds;

    for (const token of tokens) {
      const tokenKey = DepthSorter.sortKey(
        token.x / gridSize,
        token.y / gridSize,
        token.document.elevation ?? 0,
      );

      // tile must be in front of the token
      if (tileKey <= tokenKey) continue;

      const tokenZBase = token.document.elevation ?? 0;
      const tokenZTop = tokenZBase + VolumeFlags.getTokenHeight(token.document);

      const zOverlap = tokenZBase < tileZTop && tokenZTop > tileZBase;
      if (!zOverlap) continue;

      const tokenBounds = token.bounds;
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
