export { IMG_YSCALE_SNAP_PX } from "../gizmos/img-drag";
export type HandleType = "width" | "height" | "boundH" | "elevation" | "scale" | "move" | "imgOffset" | "imgScale" | "imgYScale" | "swapSide";
export interface DragState {
    type: HandleType;
    tile: Tile;
    startGX: number;
    startGY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startBoundH: number;
    startElev: number;
    startDocX: number;
    startDocY: number;
    startImgOffX: number;
    startImgOffY: number;
    startImgScale: number;
    startImgYScale: number;
    startImgHalfH: number;
}
export declare const handleTypeMap: WeakMap<PIXI.Container, HandleType>;
export declare function handlePositions(tx: number, ty: number, tw: number, th: number, elevPx: number, elevTopPx: number, heightDirX: number, heightDirY: number, imgBL?: {
    x: number;
    y: number;
} | null, imgTR?: {
    x: number;
    y: number;
} | null, imgBC?: {
    x: number;
    y: number;
} | null, imgTC?: {
    x: number;
    y: number;
} | null): Record<HandleType, {
    cx: number;
    cy: number;
}>;
export declare function projectDrag(drag: DragState, gx: number, gy: number): {
    tw: number;
    th: number;
    boundH: number;
    elev: number;
    docX: number;
    docY: number;
    imgOffX: number;
    imgOffY: number;
    imgScale: number;
    imgYScale: number;
};
export declare function commitDrag(drag: DragState, gx: number, gy: number): void;
export declare function storeDragHistory(drag: DragState): void;
