export interface KeyDeps {
    getHtml: () => HTMLElement | null;
    isTBF: () => boolean;
    scaleVerticalStep: (delta: number) => void;
}
export declare function buildKeyHandler(deps: KeyDeps): (e: KeyboardEvent) => void;
export declare function buildWheelHandler(scaleVerticalStep: (delta: number) => void): (e: WheelEvent) => void;
