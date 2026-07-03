import type { WallDef } from "./wall-types";
export declare const pendingPasteWalls: Map<string, WallDef[]>;
export declare function onPreCreateTilePaste(doc: TileDocument): void;
export declare function onCreateTilePaste(doc: TileDocument): void;
