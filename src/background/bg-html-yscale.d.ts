export type GCApp = {
    _processSubmitData?: (...a: unknown[]) => Promise<unknown>;
};
export declare function setupYScaleField(html: HTMLElement, app: GCApp, onShow: () => void): void;
