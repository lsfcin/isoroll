export declare function buildWallSection(d: TileDocument): string;
export declare function buildDoorSection(d: TileDocument): string;
export declare function readTileFlags(d: TileDocument): {
    transformTile: boolean;
    foregroundTile: boolean;
    showImage: boolean;
    showVolume: boolean;
    presetEnabled: boolean;
};
export declare function buildTileTabHtml(d: TileDocument): string;
