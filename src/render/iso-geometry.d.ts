export type P2 = {
    x: number;
    y: number;
};
export interface WorldBoxVerts {
    NW_base: P2;
    NE_base: P2;
    SW_base: P2;
    SE_base: P2;
    NW_top: P2;
    NE_top: P2;
    SW_top: P2;
    SE_top: P2;
    ground: P2;
    baseCenter: P2;
    topCenter: P2;
    elevation: number;
}
export type TileFootprint = {
    tx: number;
    ty: number;
    tw: number;
    th: number;
};
export declare const IsoGeometry: {
    tileVerts(tile: Tile): WorldBoxVerts;
    tokenVerts(token: Token): WorldBoxVerts;
    footprint(token: Token): TileFootprint;
};
