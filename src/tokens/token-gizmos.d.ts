export declare class TokenGizmos {
    private static sets;
    private static shadows;
    static lastCommittedElev: Map<string, number>;
    static activate(): void;
    private static onCanvasReady;
    private static onUpdateScene;
    private static onControlToken;
    private static onRefreshToken;
    static show(token: Token): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
    private static beginDrag;
    private static pushHistory;
    private static commit;
}
