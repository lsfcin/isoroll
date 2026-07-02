export declare class TokenBackground {
    static readonly handlesPreview = true;
    static configOpen: Set<string>;
    private static lastState;
    static create(token: Token): void;
    static sync(_token: Token): void;
    static onDestroy(id: string): void;
    static rebuild(token: Token): void;
    static onControl(token: Token, controlled: boolean): void;
    static setConfigOpen(token: Token, open: boolean): void;
    static show(token: Token, selected?: boolean): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
}
