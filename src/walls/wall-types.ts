/**
 * Normalized wall definition stored in a TilePreset.
 * Coordinates are 0..1 relative to the tile's top-left corner in canvas (non-iso) space.
 * Height offsets are in grid units relative to the tile's baseElevation (used in Feature 3).
 */
export interface WallDef {
  ax: number; ay: number;   // endpoint A (normalized)
  bx: number; by: number;   // endpoint B (normalized)
  topOffset: number;        // grid units above baseElevation where wall top sits
  bottomOffset: number;     // grid units above baseElevation where wall bottom sits
  isDoor: boolean;
}

/** Stored in wall flags so WallManager can recompute position on tile move/resize. */
export interface TileAnchor {
  ax: number; ay: number;
  bx: number; by: number;
}
