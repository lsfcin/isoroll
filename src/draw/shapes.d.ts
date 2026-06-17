type CounterParams = {
    reverseRotation: number;
    counterFactor: number;
    ratio: number;
};
export declare function makeCounterWrapper(proj: CounterParams, x: number, y: number): PIXI.Container;
export declare function suppressMipmap(texture: unknown): void;
export declare function drawDash(g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number): void;
export declare function drawDashedContour(g: PIXI.Graphics, pts: {
    x: number;
    y: number;
}[], dash: number, gap: number, dashAlt?: number, gapAlt?: number): void;
export {};
