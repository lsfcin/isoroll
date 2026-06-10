/**
 * Asset URL resolver: {name}_{stance}_{facing}.{ext}
 *
 * v1: facing hardcoded to SE (single-view). Architecture ready for multiview.
 * Future: accept facing parameter driven by token movement direction.
 */
export type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "TOP";
export type Stance = "idle" | "ready" | "attack" | "shoot" | "cast" | "dodge" | "shield" | "evade" | "endure" | "hurt" | "prone" | "dead" | "sneak" | "fly" | "talk";
/** Returns the ordered list of stances to try, from specific to fallback. */
export declare function stanceFallbackChain(stance: Stance): Stance[];
export declare function resolveTokenAsset(name: string, stance: Stance, facing?: Facing): string;
/**
 * Resolves the best available asset URL for a token, trying the full fallback
 * chain. Returns the primary URL (callers should verify existence via HEAD
 * request or Foundry's source cache before committing to a swap).
 */
export declare function resolveBestTokenAsset(name: string, stance: Stance, facing: Facing, availableStances: Set<Stance>): string;
export declare function resolveTileAsset(name: string, facing?: Facing): string;
