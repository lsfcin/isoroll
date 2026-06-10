import type { DoorBehavior } from "./wall-types";
export declare function applyDoorBehavior(doc: TileDocument, isOpen: boolean): Promise<void>;
export declare function cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior>;
