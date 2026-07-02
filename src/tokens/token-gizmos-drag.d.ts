export interface TkDrag {
    type: "imgOffset" | "imgScale" | "imgYScale";
    token: Token;
    startGX: number;
    startGY: number;
    startImgOffX: number;
    startImgOffY: number;
    startImgScale: number;
    startImgYScale: number;
    startImgHalfH: number;
    startMeshCX: number;
    startMeshCY: number;
}
export declare function showVolHandle(token: Token, own: {
    kind: "token";
    id: string;
}, keys: Set<string>, lastCommittedElev: Map<string, number>): void;
export declare function beginDrag(type: "imgOffset" | "imgScale" | "imgYScale", token: Token, gx: number, gy: number, imgOffX: number, imgOffY: number, imgScale: number, imgYScale?: number, imgHalfH?: number, meshCX?: number, meshCY?: number): void;
