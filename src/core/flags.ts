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
    const flagVal = token.getFlag(MODULE_ID, "boundHeight") as number | undefined;
    if (flagVal !== undefined) return flagVal;
    return (game.settings?.get(MODULE_ID, "defaultTokenHeight") as number | undefined) ?? 2;
  }

  static getTileBaseElevation(tile: TileDocument): number {
    return (tile.getFlag(MODULE_ID, "baseElevation") as number | undefined) ?? 0;
  }

  static getTileHeight(tile: TileDocument): number {
    return (tile.getFlag(MODULE_ID, "boundHeight") as number | undefined) ?? 1;
  }

  // During a live resize preview the stored boundH lags the new tile dimensions.
  // If a reference size was recorded when boundH was last explicitly set, scale
  // proportionally so the effective height tracks the tile's current size.
  static getEffectiveTileHeight(tile: TileDocument): number {
    const stored = VolumeFlags.getTileHeight(tile);
    const base   = tile.getFlag(MODULE_ID, "boundHeightBase") as { w: number; h: number } | undefined;
    if (!base) return stored;
    const baseMax = Math.max(base.w, base.h);
    const curMax  = Math.max(tile.width ?? 0, tile.height ?? 0);
    return baseMax > 0 ? stored * curMax / baseMax : stored;
  }

  static getImageOffset(doc: { getFlag(s: string, k: string): unknown }): { x: number; y: number } {
    return (doc.getFlag(MODULE_ID, "imageOffset") as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
  }

  static getImageScale(doc: { getFlag(s: string, k: string): unknown }): number {
    return (doc.getFlag(MODULE_ID, "imageScale") as number | undefined) ?? 1;
  }

  static getImageYScale(doc: { getFlag(s: string, k: string): unknown }): number {
    return (doc.getFlag(MODULE_ID, "imageYScale") as number | undefined) ?? 1;
  }

  static getBackgroundYScale(scene: { getFlag(s: string, k: string): unknown }): number {
    return (scene.getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1;
  }

  static getTileFlipped(tile: TileDocument): boolean {
    return (tile.getFlag(MODULE_ID, "tileFlipped") as boolean | undefined) ?? false;
  }

  static getShowImageManipulation(doc: { getFlag(s: string, k: string): unknown }, defaultValue: boolean): boolean {
    const val = doc.getFlag(MODULE_ID, "showImageManipulation");
    return (val !== undefined && val !== null) ? (val as boolean) : defaultValue;
  }

  static getShowVolumeManipulation(doc: { getFlag(s: string, k: string): unknown }, defaultValue: boolean): boolean {
    const val = doc.getFlag(MODULE_ID, "showVolumeManipulation");
    return (val !== undefined && val !== null) ? (val as boolean) : defaultValue;
  }

  static getShowElevationUnselected(doc: { getFlag(s: string, k: string): unknown }): boolean {
    return doc.getFlag(MODULE_ID, "showElevationUnselected") !== false;
  }

  // Foreground tiles scale with gridSize (like tokens). Default true for all tiles.
  static isForegroundTile(tile: TileDocument): boolean {
    return tile.getFlag(MODULE_ID, "foregroundTile") !== false;
  }

  // Default true (opt-out model): set false to disable preset auto-apply/upsert for this doc.
  static getPresetEnabled(doc: { getFlag(s: string, k: string): unknown }): boolean {
    return doc.getFlag(MODULE_ID, "presetEnabled") !== false;
  }

  static isSceneEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  static getShadowEnabled(doc: { getFlag(s: string, k: string): unknown }, defaultOn = true): boolean {
    const v = doc.getFlag(MODULE_ID, "shadowEnabled");
    if (v === undefined || v === null) return defaultOn;
    return v !== false;
  }

  static getShadowShape(doc: { getFlag(s: string, k: string): unknown }, defaultShape: "circle" | "rect" = "circle"): "circle" | "rect" {
    return (doc.getFlag(MODULE_ID, "shadowShape") as "circle" | "rect" | undefined) ?? defaultShape;
  }

  static getShadowRadius(doc: { getFlag(s: string, k: string): unknown }): number {
    return (doc.getFlag(MODULE_ID, "shadowRadius") as number | undefined) ?? 1.0;
  }

  static getShadowOpacity(doc: { getFlag(s: string, k: string): unknown }, defaultOpacity = 0.3): number {
    return (doc.getFlag(MODULE_ID, "shadowOpacity") as number | undefined) ?? defaultOpacity;
  }

  static getElevLineEnabled(doc: { getFlag(s: string, k: string): unknown }): boolean {
    return doc.getFlag(MODULE_ID, "elevLineEnabled") !== false;
  }

  static getElevLineDashed(doc: { getFlag(s: string, k: string): unknown }): boolean {
    return doc.getFlag(MODULE_ID, "elevLineDashed") !== false;
  }

  static getElevLineColor(doc: { getFlag(s: string, k: string): unknown }): "black" | "player" {
    return (doc.getFlag(MODULE_ID, "elevLineColor") as "black" | "player" | undefined) ?? "black";
  }

  static getHideOnFog(doc: { getFlag(s: string, k: string): unknown }): boolean {
    return doc.getFlag(MODULE_ID, "hideOnFog") === true;
  }

  static getOcclusionOpacity(): number {
    return (game.settings?.get(MODULE_ID, "occlusionOpacity") as number | undefined) ?? 0.2;
  }

}

// Standalone doc helpers — not flag-specific, used across token/tile renderers.
export function getElevation(doc: object): number {
  return (doc as unknown as { elevation?: number }).elevation ?? 0;
}

export function isTransformedToken(token: Token): boolean {
  return token.document.getFlag(MODULE_ID, "transformToken") === true;
}

export function isTransformedTile(tile: Tile): boolean {
  return tile.document.getFlag(MODULE_ID, "transformTile") === true;
}
