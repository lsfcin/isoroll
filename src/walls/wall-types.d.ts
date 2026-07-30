/**
 * Normalized wall definition stored in a TilePreset.
 * Coordinates are 0..1 relative to the tile's top-left corner in canvas (non-iso) space.
 * Height offsets are in grid units relative to the tile's baseElevation (used in Feature 3).
 */
export interface WallConfig {
    move: number;
    sense: number;
    light: number;
    sound: number;
    door: number;
    dir: number;
}
export interface WallDef {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    topOffset: number;
    bottomOffset: number;
    config: Partial<WallConfig>;
    dir?: "u" | "v";
}
/** Stored in wall flags so WallManager can recompute position on tile move/resize. */
export interface TileAnchor {
    ax: number;
    ay: number;
    bx: number;
    by: number;
}
export type DoorBehavior = {
    mode: "none";
} | {
    mode: "hide";
} | {
    mode: "fade";
    opacity: number;
};
