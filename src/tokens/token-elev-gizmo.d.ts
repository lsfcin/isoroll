export declare class TokenElevGizmo {
    private static sets;
    private static lastState;
    private static lastCommittedElev;
    static activate(): void;
    private static onCanvasReady;
    private static onUpdateScene;
    private static onDrawToken;
    private static onControlToken;
    private static onRefreshToken;
    static show(token: Token, selected?: boolean): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
    private static beginDrag;
    private static pushHistory;
    private static commit;
}
