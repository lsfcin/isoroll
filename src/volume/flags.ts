/**
 * Custom document flags for 3D bounding volumes.
 *
 * Tokens: z from elevation (existing), height + depth from flags.
 * Tiles:  base elevation, height, depth all from flags (tiles have no native elevation).
 *
 * Footprint (x/y grid cells) derived from token/tile pixel size at render time.
 */

export const MODULE_ID = "isoroll";

export interface TokenVolumeFlags {
  boundHeight: number;  // height in grid units (default 1)
}

export interface TileVolumeFlags {
  baseElevation: number;  // z-base in grid units (default 0)
  boundHeight: number;    // height in grid units (default 1)
}

export class VolumeFlags {
  static getTokenHeight(token: TokenDocument): number {
    return (token.getFlag(MODULE_ID, "boundHeight") as number | undefined) ?? 1;
  }

  static getTileBaseElevation(tile: TileDocument): number {
    return (tile.getFlag(MODULE_ID, "baseElevation") as number | undefined) ?? 0;
  }

  static getTileHeight(tile: TileDocument): number {
    return (tile.getFlag(MODULE_ID, "boundHeight") as number | undefined) ?? 1;
  }

  static getImageOffset(tile: TileDocument): { x: number; y: number } {
    return (tile.getFlag(MODULE_ID, "imageOffset") as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
  }

  static getImageScale(tile: TileDocument): number {
    return (tile.getFlag(MODULE_ID, "imageScale") as number | undefined) ?? 1;
  }
}
