import type { HandleType } from "../tiles";
export declare const HANDLE_COLOR: Record<HandleType, number>;
export declare function makeHandleForType(type: HandleType, heightDirX: number, heightDirY: number): PIXI.Container | PIXI.Graphics;
export declare function createRotateBlocker(tile: Tile, layer: PIXI.Container): PIXI.Graphics | null;
