/**
 * Normalized wall definition stored in a TilePreset.
 * Coordinates are 0..1 relative to the tile's top-left corner in canvas (non-iso) space.
 * Height offsets are in grid units relative to the tile's baseElevation (used in Feature 3).
 */

export interface WallConfig {
  move:  number;  // 0=normal 1=blocks 2=pass
  sense: number;  // 0=normal 1=none 2=limited 3=pass 4=close 5=proximity 6=terrain
  light: number;
  sound: number;
  door:  number;  // 0=none 1=door 2=secret
  dir:   number;  // 0=both 1=left 2=right
}

export interface WallDef {
  ax: number; ay: number;   // endpoint A (normalized 0..1 from tile top-left)
  bx: number; by: number;   // endpoint B (normalized)
  topOffset: number;        // grid units above baseElevation where wall top sits
  bottomOffset: number;
  config: Partial<WallConfig>;  // wall type flags; empty object = normal wall
}

/** Stored in wall flags so WallManager can recompute position on tile move/resize. */
export interface TileAnchor {
  ax: number; ay: number;
  bx: number; by: number;
}

export type DoorBehavior =
  | { mode: "none" }
  | { mode: "hide" }
  | { mode: "fade"; opacity: number };
