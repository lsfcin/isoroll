/**
 * Asset URL resolver: {name}_{stance}_{facing}.{ext}
 *
 * v1: facing hardcoded to SE (single-view). Architecture ready for multiview.
 * Future: accept facing parameter driven by token movement direction.
 */

export type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "TOP";
export type Stance =
  | "idle"
  | "ready"
  | "attack"
  | "shoot"
  | "cast"
  | "dodge"
  | "shield"
  | "evade"
  | "endure"
  | "hurt"
  | "prone"
  | "dead"
  | "sneak"
  | "fly"
  | "talk";

const DEFAULT_FACING: Facing = "SE";
const ASSET_BASE = "modules/isoroll/assets";
const EXT = "png";

export function resolveTokenAsset(
  name: string,
  stance: Stance,
  facing: Facing = DEFAULT_FACING,
): string {
  return `${ASSET_BASE}/chars/${name}/${name}_${stance}_${facing}.${EXT}`;
}

export function resolveTileAsset(name: string, facing: Facing = DEFAULT_FACING): string {
  return `${ASSET_BASE}/tiles/${name}/${name}_${facing}.${EXT}`;
}
