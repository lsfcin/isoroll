export declare class VolumeGizmos {
    private static _handleKeys;
    private static blockers;
    static create(_tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    static onDestroy(id: string): void;
    private static suppressRotateHandle;
    private static _collectShowParams;
    private static _renderHandle;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
}
