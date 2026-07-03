import { type PlaceableDoc } from "./fog-state";
export type { PlaceableDoc };
export declare function docAlpha(doc: PlaceableDoc): number;
export declare function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void;
export declare function getViewers(): Token[];
export declare function applyTokenFogContainer(c: PIXI.Container, x: number, y: number, tokenId?: string): void;
export declare function applyTokenFog(s: PIXI.Sprite, doc: PlaceableDoc, p: {
    x: number;
    y: number;
}, viewers: Token[]): void;
export declare function applyTileFog(s: PIXI.Sprite, doc: PlaceableDoc, tileId: string, x: number, y: number, w: number, h: number, hideOnFog: boolean, viewers: Token[]): void;
