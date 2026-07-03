/**
 * Painter's algorithm depth sort for isometric SE camera.
 *
 * Sort key: gridCol + gridRow + elevation/gridSize
 * Lower key = further from camera = rendered first (behind).
 *
 * Hooks into canvas primary layer sort after each render tick.
 */
export declare class DepthSorter {
    static activate(): void;
    private static sortKey;
    static onRefresh(): void;
    static sort(): void;
    private static objectSortKey;
}
