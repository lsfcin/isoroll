import { type GCApp } from "./bg-html-yscale";
export declare class BgHtml {
    static currentHtml: HTMLElement | null;
    static previewBg: PIXI.Sprite | null;
    private static keyHandler;
    private static wheelHandler;
    private static onShow;
    private static _onClearAll;
    static setup(onShow: () => void, onClearAll: () => void): void;
    private static isTBF;
    private static rebindHandlers;
    private static onHtmlChange;
    static onRenderGridConfig(app: GCApp, html: HTMLElement): void;
    static onCloseGridConfig(): void;
    static scaleVerticalStep(delta: number): void;
    static syncYScaleInput(ys: number): void;
}
