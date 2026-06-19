// Alpha occlusion — fades tiles when a token is behind them.
// Boundary: may use tile.mesh.alpha directly (listed boundary). All canvas reads via CanvasEnv.

import { CanvasEnv, VolumeFlags } from "../core";

export function evaluateAll(): void {
  if (!VolumeFlags.isSceneEnabled()) return;
  const opacity = VolumeFlags.getOcclusionOpacity();
  for (const tile of CanvasEnv.tiles()) _evaluateTile(tile, opacity);
}

function _evaluateTile(tile: Tile, occlusionOpacity: number): void {
  if (tile.mesh) tile.mesh.alpha = _hasTokenBehind(tile) ? occlusionOpacity : 1.0;
}

function _hasTokenBehind(tile: Tile): boolean {
  const tokens = CanvasEnv.tokens();
  const gridSize = CanvasEnv.gridSize();
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

// Legacy activation — registers Foundry hooks directly. Called only when isorollNewOccluder = false.
// Remove once lifecycle path is verified in production.
export function activateLegacy(): void {
  Hooks.on("refreshToken", evaluateAll);
  Hooks.on("updateToken",  evaluateAll);
  Hooks.on("updateTile",   evaluateAll);
  Hooks.on("createToken",  evaluateAll);
  Hooks.on("deleteToken",  evaluateAll);
}
