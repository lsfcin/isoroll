export declare class TokenBackground {
    private static shadows;
    private static indicators;
    private static sprites;
    private static lastState;
    static create(token: Token): void;
    static sync(token: Token): void;
    static rebuild(token: Token): void;
    static onControl(token: Token, controlled: boolean): void;
    private static updateShadow;
    private static rebuildIndicators;
    private static createSprite;
    static show(token: Token, selected?: boolean): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
}
