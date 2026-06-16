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
    readonly ISO_SPRITES: "iso-sprites";
    readonly TILE_SHADOW: "tile-shadow";
    readonly TOKEN_SHADOW: "token-shadow";
    readonly TILE_OVERLAY: "tile-overlay";
    readonly TILE_GIZMOS: "tile-gizmos";
    readonly TOKEN_INDICATORS: "token-indicators";
    readonly TOKEN_GIZMOS: "token-gizmos";
    readonly TOKEN_LABEL: "token-label";
    readonly BG_GIZMOS: "bg-gizmos";
    readonly WALL_OVERLAY: "wall-overlay";
};
