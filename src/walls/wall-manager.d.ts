import type { DoorBehavior } from "./wall-types";
export declare class WallManager {
    static preSizes: Map<string, {
        w: number;
        h: number;
    }>;
    static onPreCreateTile(doc: TileDocument): void;
    static onCreateTile(doc: TileDocument): void;
    static activate(): void;
    static onCanvasReady(): void;
    static onPreUpdateTile(doc: TileDocument, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static onUpdateTile(doc: TileDocument, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static onDeleteTile(doc: TileDocument): void;
    static onDeleteWall(doc: WallDocument, options: Record<string, unknown>): void;
    static onUpdateWall(doc: WallDocument, changes: Record<string, unknown>, options: Record<string, unknown>): void;
    static markWallDrag(tileId: string): void;
    static clearWallDrag(tileId: string): void;
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
}
