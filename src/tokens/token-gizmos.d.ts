export declare class TokenGizmos {
    private static _handleKeys;
    static lastCommittedElev: Map<string, number>;
    static configOpen: Set<string>;
    static create(_token: Token): void;
    static sync(_token: Token): void;
    static rebuild(token: Token): void;
    static onControl(token: Token, controlled: boolean): void;
    static setConfigOpen(token: Token, open: boolean): void;
    private static _renderImgHandle;
    private static _showImgHandles;
    static show(token: Token): void;
    static onDestroy(id: string): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
    private static _drawBox;
}
