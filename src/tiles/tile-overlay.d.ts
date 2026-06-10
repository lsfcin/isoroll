export declare class VolumeOverlay {
    private static boxes;
    static activate(): void;
    private static onCanvasReady;
    private static onUpdateScene;
    private static onControlTile;
    private static onRefreshTile;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    private static draw;
}
