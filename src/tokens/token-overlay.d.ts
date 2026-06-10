export declare class TokenOverlay {
    private static boxes;
    static activate(): void;
    private static onCanvasReady;
    private static onUpdateScene;
    private static onControlToken;
    private static onRefreshToken;
    static show(token: Token): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
}
