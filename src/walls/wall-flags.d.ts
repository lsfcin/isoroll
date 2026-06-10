import type { DoorBehavior } from "./wall-types";
export declare function getLinkedWallIds(doc: TileDocument): string[];
export declare function setLinkedWallIds(doc: TileDocument, ids: string[], opts?: object): Promise<void>;
export declare function pruneLinkedWalls(doc: TileDocument): Promise<void>;
export declare function getDoorBehavior(doc: TileDocument): DoorBehavior;
export declare function setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void>;
export declare function hasLinkedDoor(doc: TileDocument): boolean;
export declare function isLinkedDoorOpen(doc: TileDocument): boolean;
