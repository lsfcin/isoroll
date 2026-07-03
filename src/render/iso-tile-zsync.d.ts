import type { Mesh, SliceState } from "./iso-tile-geom";
export declare function tileBand(tile: Tile): number;
export declare function syncTileZ(tile: Tile, slices: PIXI.Sprite[], state: SliceState, mesh: Mesh): void;
export declare function schedulePeerResync(): void;
