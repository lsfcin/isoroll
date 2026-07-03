import type { TokenRenderer } from "./token-renderer";
export type Mesh = PIXI.DisplayObject & {
    texture?: PIXI.Texture;
    anchor?: PIXI.ObservablePoint;
    skew?: PIXI.ObservablePoint;
    scale?: PIXI.ObservablePoint;
    alpha?: number;
    rotation?: number;
};
export declare function getMesh(obj: unknown): Mesh | undefined;
export declare function cloneSprite(mesh: Mesh): PIXI.Sprite | null;
export declare function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void;
export declare const tokenClones: Map<string, PIXI.Sprite>;
export declare const IsoTokenRenderer: TokenRenderer;
