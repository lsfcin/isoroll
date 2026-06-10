export declare const IMG_YSCALE_SNAP_PX = 12;
type WT4 = {
    a: number;
    b: number;
    c: number;
    d: number;
};
type WT6 = WT4 & {
    tx: number;
    ty: number;
};
export declare function projectImgOffset(dx: number, dy: number, wt: WT4, startX: number, startY: number): {
    x: number;
    y: number;
};
export declare function projectImgYScale(dx: number, dy: number, wt: WT4, zoom: number, startYScale: number, halfH: number): number;
export declare function projectImgScale(gx: number, gy: number, startGX: number, startGY: number, startScale: number, cx: number, cy: number, wt: WT6): number;
export {};
