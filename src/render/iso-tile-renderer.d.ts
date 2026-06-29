import type { TileRenderer } from "./tile-renderer";
export declare const tileSlices: Map<string, PIXI.Sprite[]>;
export declare let DEBUG_SLICES: boolean;
export declare function debugSlices(on: boolean): void;
export declare function debugGrid(on: boolean): void;
export declare const DEPTH_SCALE = 10000;
export declare const IsoTileRenderer: TileRenderer;
