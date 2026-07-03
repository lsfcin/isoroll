export declare function handleNativeSizeChange(doc: TileDocument, changes: Record<string, unknown>, isoFlags: Record<string, unknown>, options: Record<string, unknown>, preSizes: Map<string, {
    w: number;
    h: number;
}>): boolean;
export declare function scheduleWallUpdate(doc: TileDocument, changes: Record<string, unknown>, isoFlags: Record<string, unknown>, tileFlippedChanged: boolean, boundHChanged: boolean): void;
export declare function doUpdateWall(doc: WallDocument, changes: Record<string, unknown>, options: Record<string, unknown>, tileId: string, tileObj: Tile): void;
