export declare class VolumeOverlay {
    private static boxes;
    private static shadows;
    private static shadowState;
    static create(tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    private static shadowSnap;
    private static showShadow;
    private static hideShadow;
    private static removeBox;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    private static draw;
}
