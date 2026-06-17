import type { TokenRenderer } from "./token-renderer";
import type { TileRenderer } from "./tile-renderer";
type Mesh = PIXI.DisplayObject & {
    texture?: PIXI.Texture;
    anchor?: PIXI.ObservablePoint;
    skew?: PIXI.ObservablePoint;
    scale?: PIXI.ObservablePoint;
    alpha?: number;
    rotation?: number;
};
/** Create a PIXI.Sprite clone whose transforms mirror a PrimarySpriteMesh. */
export declare function cloneSprite(mesh: Mesh): PIXI.Sprite | null;
/** Sync geometry transforms from mesh onto an existing clone sprite.
 *  Does NOT copy alpha or visible — both come from the document. */
export declare function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void;
export declare const IsoTokenRenderer: TokenRenderer;
export declare const IsoTileRenderer: TileRenderer;
export declare const IsoSpriteLayer: {
    token: TokenRenderer;
    tile: TileRenderer;
    getLayer(): PIXI.Container;
    /** Runs every frame at LOW priority — after Foundry adds fog containers — to keep isoroll layers above fog. */
    _onTick(): void;
    _onCanvasInit(): void;
    _teardown(): void;
    /** Registers ticker (layer-order enforcement) and infrastructure hooks only.
     *  Foundry render hooks are handled by the gate via IsoSpriteLayer.token / .tile. */
    activate(): void;
};
export {};
