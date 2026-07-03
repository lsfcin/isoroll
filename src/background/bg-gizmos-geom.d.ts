export interface BgGeom {
    tr: {
        x: number;
        y: number;
    };
    tc: {
        x: number;
        y: number;
    };
    bl: {
        x: number;
        y: number;
    };
    tl: {
        x: number;
        y: number;
    };
    br: {
        x: number;
        y: number;
    };
    sx: number;
    sCX: number;
    sCY: number;
    bgYS: number;
    baseH: number;
    topSc: number;
    leftSc: number;
}
export declare function computeBgGeom(previewBg: PIXI.Sprite): BgGeom;
