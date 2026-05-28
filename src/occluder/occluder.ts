import { MODULE_ID, VolumeFlags } from "../volume/flags";

export class Occluder {
  static activate(): void {
    Hooks.on("refreshToken", Occluder.evaluateAll);
    Hooks.on("updateToken", Occluder.evaluateAll);
    Hooks.on("updateTile", Occluder.evaluateAll);
    Hooks.on("createToken", Occluder.evaluateAll);
    Hooks.on("deleteToken", Occluder.evaluateAll);
  }

  private static evaluateAll(): void {
    if (canvas.scene?.getFlag(MODULE_ID, "enabled") !== true) return;
    const tiles = canvas.tiles?.placeables ?? [];
    const opacity = game.settings.get(MODULE_ID, "occlusionOpacity") as number;
    for (const tile of tiles) Occluder.evaluateTile(tile, opacity);
  }

  private static evaluateTile(tile: Tile, occlusionOpacity: number): void {
    if (tile.mesh) tile.mesh.alpha = Occluder.hasTokenBehind(tile) ? occlusionOpacity : 1.0;
  }

  private static hasTokenBehind(tile: Tile): boolean {
    const tokens = canvas.tokens?.placeables ?? [];
    const gridSize = canvas.grid?.size ?? 100;

    const tileElev = VolumeFlags.getTileBaseElevation(tile.document);
    const tileKey = tile.x / gridSize + tile.y / gridSize + tileElev / gridSize;
    const tileZTop = tileElev + VolumeFlags.getTileHeight(tile.document);
    const tileBounds = tile.bounds;

    for (const token of tokens) {
      const tokenElev = token.document.elevation ?? 0;
      const tokenKey = token.x / gridSize + token.y / gridSize + tokenElev / gridSize;
      if (tokenKey >= tileKey) continue;

      const tokenZTop = tokenElev + VolumeFlags.getTokenHeight(token.document);
      if (tokenElev >= tileZTop || tokenZTop <= tileElev) continue;

      const b = token.bounds;
      if (b.right > tileBounds.left && b.left < tileBounds.right &&
          b.bottom > tileBounds.top && b.top < tileBounds.bottom) return true;
    }

    return false;
  }
}
