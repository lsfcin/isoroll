// Pure manifest-tile → Foundry Tile creation-data mapping (C1, T2). v14 center convention.
import type { ManifestTile } from "./manifest-types";

// The bake's camera and the module's stage camera are one grid TURN apart. isoroll-content projects
// x = u - v, y = 0.5(u + v) - z (view_table.py `_DIMETRIC`); the module's stage projects
// x = a(X + Y), y = 0.5a(Y - X) - a*elev. Setting those equal gives Y = u, X = -v: the manifest's
// +u axis is the module's +y, its +v axis the module's -x. Importing (u,v) straight into (x,y)
// lays the scene out a quarter turn off, which no per-piece nudge can undo. `rows` only slides the
// result back into positive world coordinates.
function cellCenter(t: ManifestTile, gridSize: number, rows: number): { x: number; y: number } {
  return { x: (rows - t.v - 0.5) * gridSize, y: (t.u + 0.5) * gridSize };
}

type SpriteFlag = { originPx: { x: number; y: number }; pxPerVoxel: number };

// Bake data the counter-transform needs to place the sprite exactly (transform/tile-sprite-anchor):
// its pixel density, and the texel holding the piece's own world (0,0,0). Undefined for a manifest
// baked before 2026-07-31, which then falls back to the box fit.
function spriteFlag(t: ManifestTile): SpriteFlag | undefined {
  const origin = t.originPx;
  const density = t.pxPerVoxel;
  const hasOrigin = Array.isArray(origin) && origin.length === 2;
  const usable = hasOrigin && density > 0;
  return usable ? { originPx: { x: origin[0], y: origin[1] }, pxPerVoxel: density } : undefined;
}

export function manifestTileToData(
  t: ManifestTile,
  gridSize: number,
  assetBase: string,
  rows: number,
): object {
  const center = cellCenter(t, gridSize, rows);
  const sprite = spriteFlag(t);
  return {
    x: center.x,
    y: center.y,
    // The tile document is the VOLUME, not the picture: a merge=False massing box is one cell of
    // footprint, `boundHeight` cells tall. Sizing it from the sprite (255x505 px of wall art at
    // 126 px/voxel) confused the two — a 2:1 projection makes any sprite wider than its own cell.
    width: gridSize,
    height: gridSize,
    rotation: 0,
    texture: { src: `${assetBase}/${t.asset}` },
    flags: {
      isoroll: {
        // A baked kit asset has never been through the preset system, so auto-apply can only miss —
        // and every miss is a real 404 (preset-storage.readPreset fetches /isoroll/presets/<src>.json).
        // 86 tiles meant 86 failed requests and a console the user cannot read past. An imported
        // tile's geometry comes from the manifest; a preset overwriting width/height/boundHeight/
        // imageOffset behind it would also race the wall frame (wall-coords.imageRect).
        presetEnabled: false,
        boundHeight: t.boundHeight,
        // v2 (dsl-v2-ts-twin, T7, C3): tile elevation from level/z0 — OPTIONAL manifest field,
        // 0 is the v1 back-compat default (PIN-4).
        baseElevation: t.z ?? 0,
        imageOffset: { x: t.imageOffset[0], y: t.imageOffset[1] },
        // The bake-frame cell this tile came from. Kept as data because the turn above means the
        // document position no longer spells it out, and the parity oracle pairs on it.
        cell: { u: t.u, v: t.v },
        ...(sprite ? { sprite } : {}),
      },
    },
  };
}
