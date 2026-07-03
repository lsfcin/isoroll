import type { TileRenderer } from './tile-renderer';
import type { PlaceableState } from './render-lifecycle-state';
export declare function drawTile(tile: Tile, state: PlaceableState, tileRenderers: TileRenderer[]): void;
export declare function refreshTile(tile: Tile, state: PlaceableState, tileRenderers: TileRenderer[], flags?: Record<string, boolean>): void;
export declare function flagsChangeTile(tile: Tile, state: PlaceableState, tileRenderers: TileRenderer[]): void;
export declare function selectTile(tile: Tile, state: PlaceableState, tileRenderers: TileRenderer[]): void;
export declare function deselectTile(tile: Tile, state: PlaceableState, tileRenderers: TileRenderer[]): void;
export declare function destroyTile(id: string, tileRenderers: TileRenderer[]): void;
