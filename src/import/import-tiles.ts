// Pure manifest-tile → Foundry Tile creation-data mapping (C1, T2). v14 center convention.
import type { ManifestTile } from "./manifest-types";

// A baked sprite has its own pixel density (pxPerVoxel) and its own size, and one voxel must read as
// one grid unit on screen — so the tile rect is the sprite's natural size converted to world units,
// NOT a gridSize square. Squaring it to gridSize squashed a 255x505 wall sprite into 100x100.
// Falls back to a gridSize square when the manifest carries no sizePx (pre-2026-07-31 manifests).
function tileSize(t: ManifestTile, gridSize: number): { width: number; height: number } {
  const density = t.pxPerVoxel > 0 ? t.pxPerVoxel : gridSize;
  const size = t.sizePx;
  const usable = Array.isArray(size) && size.length === 2 && size[0] > 0 && size[1] > 0;
  const width = usable ? (size[0] * gridSize) / density : gridSize;
  const height = usable ? (size[1] * gridSize) / density : gridSize;
  return { width, height };
}

export function manifestTileToData(t: ManifestTile, gridSize: number, assetBase: string): object {
  const { width, height } = tileSize(t, gridSize);
  return {
    x: (t.u + 0.5) * gridSize,
    y: (t.v + 0.5) * gridSize,
    width,
    height,
    rotation: 0,
    texture: { src: `${assetBase}/${t.asset}` },
    flags: {
      isoroll: {
        presetEnabled: true,
        boundHeight: t.boundHeight,
        // v2 (dsl-v2-ts-twin, T7, C3): tile elevation from level/z0 — OPTIONAL manifest field,
        // 0 is the v1 back-compat default (PIN-4).
        baseElevation: t.z ?? 0,
        imageOffset: { x: t.imageOffset[0], y: t.imageOffset[1] },
      },
    },
  };
}
