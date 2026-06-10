export declare function getBgYScale(): number;
export declare function setBgYScaleOverride(v: number | null): void;
export declare class BackgroundTransform {
    private static originalBg;
    private static lastCapturedSprite;
    private static patchedSprite;
    private static savedUpdateTransform;
    static get lastCapture(): PIXI.Sprite | null;
    static getSprite(): PIXI.Sprite | null;
    static capture(bg: PIXI.Sprite): void;
    static apply(): void;
    static reset(): void;
    static clearCapture(): void;
    static clearGridConfigPatch(): void;
    static onRenderGridConfig(enabled: boolean, bgTransform: boolean): void;
}
