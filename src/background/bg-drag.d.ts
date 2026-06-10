export type BgDrag = {
    type: "bgScale" | "bgYScale" | "bgTranslate";
    startGX: number;
    startGY: number;
    startScale: number;
    startScreenCX: number;
    startScreenCY: number;
    startBgYScale: number;
    startBgHalfH: number;
    startShiftX: number;
    startShiftY: number;
};
export declare const BG_YSCALE_SNAP_PX = 12;
export declare function commitBgDrag(drag: BgDrag, gx: number, gy: number, html: HTMLElement | null, onYScale: (v: number) => void): void;
