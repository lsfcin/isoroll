export declare class TokenGizmos {
    private static sets;
    static lastCommittedElev: Map<string, number>;
    static create(_token: Token): void;
    static sync(_token: Token): void;
    static rebuild(token: Token): void;
    static onControl(token: Token, controlled: boolean): void;
    static show(token: Token): void;
    static hide(tokenId: string): void;
    static clearAll(): void;
    private static beginDrag;
    private static pushHistory;
    private static commit;
}
