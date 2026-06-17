export interface TileRenderer {
    readonly handlesPreview?: boolean;
    create(tile: Tile): void;
    sync(tile: Tile): void;
    rebuild(tile: Tile): void;
    onControl(tile: Tile, controlled: boolean): void;
    onDestroy?(id: string): void;
    onSightRefresh?(): void;
    hide(id: string): void;
    clearAll(): void;
}
