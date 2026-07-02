export { cloneSprite, syncSprite, IsoTokenRenderer } from "./iso-token-renderer";
export declare const IsoSpriteLayer: {
    token: import("./token-renderer").TokenRenderer;
    tile: import("./tile-renderer").TileRenderer;
    getLayer(): PIXI.Container;
    _onTick(): void;
    _onCanvasInit(): void;
    _teardown(): void;
    _sort(): void;
    onCanvasReady(): void;
    onResetFogOfWar(): void;
    activate(): void;
};
