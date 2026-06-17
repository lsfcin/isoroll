import { type WallDoc } from "./wall-coords";
export declare const WALL_COLORS: {
    normal: number;
    terrain: number;
    invisible: number;
    ethereal: number;
    sound: number;
    door: number;
    secret: number;
    window: number;
};
export declare function wallColor(doc: WallDoc): number;
export declare class WallOverlay {
    private static boxes;
    private static selectTile;
    private static altMode;
    private static pendingRefresh;
    private static rafId;
    static create(_tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    /** Registers window event listeners only — Foundry hooks handled by RenderGate. */
    static activate(): void;
    static show(tile: Tile, isDrag?: boolean): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    static enterSelect(tile: Tile): void;
    static exitSelect(tile: Tile): void;
    static isSelectMode(tileId: string): boolean;
    static showIfActive(tile: Tile): void;
    static refresh(tile: Tile): void;
    private static setAltMode;
    private static drawDisplay;
    private static drawSelect;
}
