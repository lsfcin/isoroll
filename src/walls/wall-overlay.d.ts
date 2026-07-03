export { WALL_COLORS, wallColor } from "./wall-overlay-ops";
export declare class WallOverlay {
    private static selectTile;
    private static altMode;
    private static pendingRefresh;
    private static rafId;
    static create(_tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    static activate(): void;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    static markDragActive(tileId: string): void;
    static clearDragActive(tileId: string): void;
    static enterSelect(tile: Tile): void;
    static exitSelect(tile: Tile): void;
    static isSelectMode(tileId: string): boolean;
    static showIfActive(tile: Tile): void;
    static refresh(tile: Tile): void;
    private static setAltMode;
}
