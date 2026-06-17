export declare class VolumeGizmos {
    private static sets;
    private static blockers;
    static create(_tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    private static suppressRotateHandle;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    private static swapSide;
    private static beginDrag;
}
