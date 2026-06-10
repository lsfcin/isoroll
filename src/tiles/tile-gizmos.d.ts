export declare class VolumeGizmos {
    private static sets;
    private static blockers;
    static activate(): void;
    private static onCanvasReady;
    private static onUpdateScene;
    private static onControlTile;
    private static onRefreshTile;
    private static suppressRotateHandle;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    private static swapSide;
    private static beginDrag;
}
