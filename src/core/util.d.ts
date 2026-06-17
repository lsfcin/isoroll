export declare function suppressTooltip(token: Token): void;
export declare function scheduleWrap(fn: () => Promise<void>, label: string, delay?: number): void;
export declare function canvasZoom(): number;
export declare function gridDistance(): number;
export declare function elevToCanvas(elev: number, gridSize: number, gridDist: number): number;
export declare function screenToCanvas(dx: number, dy: number, wt: {
    a: number;
    b: number;
    c: number;
    d: number;
}): {
    x: number;
    y: number;
};
export declare function screenPointToCanvas(sx: number, sy: number, wt: {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
}): {
    x: number;
    y: number;
};
export declare function isPreviewClone(p: unknown): boolean;
export declare function hasActiveClone(p: unknown): boolean;
export declare function startPointerDrag<T>(drag: T, onMove: (drag: T, e: PointerEvent) => void, onUp: (drag: T, e: PointerEvent) => void): void;
