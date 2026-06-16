export declare const LayerManager: {
    ensureLayer(key: string): PIXI.Container;
    bringToTop(key: string): void;
    clearLayer(key: string): void;
    clearAll(): void;
    declareOrder(keys: string[]): void;
    enforceOrder(): void;
};
export declare function destroyMapped(map: Map<string, PIXI.Container>, id: string): void;
export declare const LAYER_KEYS: {
    readonly ISO_SPRITE_LAYER: "iso-sprite-layer";
    readonly TILE_SHADOW: "tile-shadow";
    readonly TOKEN_SHADOW: "token-shadow";
    readonly VOLUME_OVERLAY: "volume-overlay";
    readonly VOLUME_GIZMOS: "volume-gizmos";
    readonly TOKEN_SPRITE_CLONE: "token-sprite-clone";
    readonly TOKEN_GIZMOS: "token-gizmos";
    readonly TOKEN_VOLUME_GIZMOS: "token-volume-gizmos";
    readonly TOKEN_ELEV_LABEL: "token-elev-label";
    readonly BG_GIZMOS: "bg-gizmos";
    readonly WALL_OVERLAY: "wall-overlay";
};
