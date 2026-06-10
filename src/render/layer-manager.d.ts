export declare const LayerManager: {
    ensureLayer(key: string): PIXI.Container;
    bringToTop(key: string): void;
    clearLayer(key: string): void;
    clearAll(): void;
    declareOrder(keys: string[]): void;
    enforceOrder(): void;
};
export declare const LAYER_KEYS: {
    readonly VOLUME_OVERLAY: "volume-overlay";
    readonly VOLUME_GIZMOS: "volume-gizmos";
    readonly TOKEN_OVERLAY: "token-overlay";
    readonly TOKEN_GIZMOS: "token-gizmos";
    readonly TOKEN_VOLUME_GIZMOS: "token-volume-gizmos";
    readonly BG_GIZMOS: "bg-gizmos";
    readonly WALL_OVERLAY: "wall-overlay";
};
