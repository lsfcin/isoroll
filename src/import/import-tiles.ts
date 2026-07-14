// Pure manifest-tile → Foundry Tile creation-data mapping (C1, T2). v14 center convention.
import type { ManifestTile } from "./manifest-types";

export function manifestTileToData(t: ManifestTile, gridSize: number, assetBase: string): object {
  return {
    x: (t.u + 0.5) * gridSize,
    y: (t.v + 0.5) * gridSize,
    width: gridSize,
    height: gridSize,
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
