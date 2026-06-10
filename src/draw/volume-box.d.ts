export interface BoxVerts {
    NW_base: P;
    NE_base: P;
    SW_base: P;
    SE_base: P;
    NW_top: P;
    NE_top: P;
    SW_top: P;
    SE_top: P;
    ground: P;
    baseCenter: P;
    topCenter: P;
    elevation: number;
}
export type P = {
    x: number;
    y: number;
};
export declare function point(x: number, y: number): P;
export declare function computeVerts(tile: Tile): BoxVerts;
export declare function computeTokenVerts(token: Token): BoxVerts;
export declare function drawAnchorLine(g: PIXI.Graphics, v: BoxVerts): void;
export declare function drawBox(g: PIXI.Graphics, v: BoxVerts): void;
