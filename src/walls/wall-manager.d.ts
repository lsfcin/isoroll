import type { DoorBehavior } from "./wall-types";
export declare class WallManager {
    private static preSizes;
    static activate(): void;
    private static onPreUpdateTile;
    private static onUpdateTile;
    private static onDeleteTile;
    private static onDeleteWall;
    private static onUpdateWall;
    static getLinkedWallIds(doc: TileDocument): string[];
    static hasLinkedDoor(doc: TileDocument): boolean;
    static getDoorBehavior(doc: TileDocument): DoorBehavior;
    static isSelectMode(tileId: string): boolean;
    static enterSelect(tile: Tile): void;
    static exitSelect(tile: Tile): void;
    static generateBaseWalls(doc: TileDocument): Promise<void>;
    static deleteLinkedWalls(doc: TileDocument): Promise<void>;
    static unlinkAllWalls(doc: TileDocument): Promise<void>;
    static cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior>;
    static setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void>;
    private static _refreshByDoc;
}
