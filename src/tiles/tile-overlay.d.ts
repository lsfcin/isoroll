export declare class VolumeOverlay {
    private static _handles;
    private static shadowState;
    static create(tile: Tile): void;
    static sync(_tile: Tile): void;
    static rebuild(tile: Tile): void;
    static onControl(tile: Tile, controlled: boolean): void;
    static onDestroy(id: string): void;
    private static shadowSnap;
    private static _renderShadow;
    private static removeBox;
    static show(tile: Tile): void;
    static hide(tileId: string): void;
    static clearAll(): void;
    private static _drawInto;
}
