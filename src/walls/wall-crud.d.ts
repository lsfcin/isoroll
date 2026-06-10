import type { WallDef } from "./wall-types";
export declare function generateBaseWallDefs(doc: TileDocument): WallDef[];
export declare function createWallsFromDefs(doc: TileDocument, defs: WallDef[]): Promise<string[]>;
export declare function deleteLinkedWalls(doc: TileDocument, skipHistory?: boolean): Promise<void>;
/** Links currently controlled walls to the tile. Returns count newly linked. */
export declare function linkSelectedWalls(doc: TileDocument): Promise<number>;
export declare function unlinkAllWalls(doc: TileDocument): Promise<void>;
export declare function generateBaseWalls(doc: TileDocument): Promise<void>;
export declare function extractWallDefs(doc: TileDocument): WallDef[];
export declare function applyWallDefs(doc: TileDocument, defs: WallDef[]): Promise<void>;
