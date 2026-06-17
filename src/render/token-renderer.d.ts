export interface TokenRenderer {
    readonly handlesPreview?: boolean;
    create(token: Token): void;
    sync(token: Token): void;
    rebuild(token: Token): void;
    onControl(token: Token, controlled: boolean): void;
    onDestroy?(id: string): void;
    onSightRefresh?(): void;
    hide(id: string): void;
    clearAll(): void;
}
