export declare class BgHtml {
    static currentHtml: HTMLElement | null;
    static previewBg: PIXI.Sprite | null;
    private static keyHandler;
    private static wheelHandler;
    private static onShow;
    static activate(onShow: () => void, onClearAll: () => void): void;
    private static isTBF;
    private static onRenderGridConfig;
    private static onCloseGridConfig;
    static scaleVerticalStep(delta: number): void;
    static syncYScaleInput(ys: number): void;
}
