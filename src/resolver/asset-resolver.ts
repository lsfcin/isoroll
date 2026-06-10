/**
 * Asset URL resolver: {name}_{stance}_{facing}.{ext}
 *
 * v1: facing hardcoded to SE (single-view). Architecture ready for multiview.
 * Future: accept facing parameter driven by token movement direction.
 */

import { MODULE_ID } from "../core";
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
const ASSET_BASE = `modules/${MODULE_ID}/assets`;
const EXT = "png";

// Combat-adjacent stances fall back to ready → idle. prone/dead fall back to idle.
const STANCE_FALLBACK: Partial<Record<Stance, Stance>> = {
  ready: "idle",
  attack: "ready",
  shoot: "ready",
  cast: "ready",
  dodge: "ready",
  shield: "ready",
  evade: "ready",
  endure: "ready",
  hurt: "ready",
  prone: "idle",
  dead: "idle",
  sneak: "idle",
  fly: "idle",
  talk: "idle",
};

/** Returns the ordered list of stances to try, from specific to fallback. */
export function stanceFallbackChain(stance: Stance): Stance[] {
  const chain: Stance[] = [stance];
  let current: Stance | undefined = STANCE_FALLBACK[stance];
  while (current) {
    chain.push(current);
    current = STANCE_FALLBACK[current];
  }
  return chain;
}

export function resolveTokenAsset(
  name: string,
  stance: Stance,
  facing: Facing = DEFAULT_FACING,
): string {
  return `${ASSET_BASE}/chars/${name}/${name}_${stance}_${facing}.${EXT}`;
}

/**
 * Resolves the best available asset URL for a token, trying the full fallback
 * chain. Returns the primary URL (callers should verify existence via HEAD
 * request or Foundry's source cache before committing to a swap).
 */
export function resolveBestTokenAsset(
  name: string,
  stance: Stance,
  facing: Facing = DEFAULT_FACING,
  availableStances: Set<Stance>,
): string {
  for (const s of stanceFallbackChain(stance)) {
    if (availableStances.has(s)) {
      return resolveTokenAsset(name, s, facing);
    }
  }
  // ultimate fallback: idle, regardless of availableStances
  return resolveTokenAsset(name, "idle", facing);
}

export function resolveTileAsset(name: string, facing: Facing = DEFAULT_FACING): string {
  return `${ASSET_BASE}/tiles/${name}/${name}_${facing}.${EXT}`;
}
