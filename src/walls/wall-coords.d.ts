import type { WallDef, TileAnchor } from "./wall-types";
export type TileDoc = TileDocument & {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type WallDoc = WallDocument & {
    c: number[];
    ds: number;
    door: number;
    move: number;
    sight: number;
    sense: number;
    light: number;
    sound: number;
    dir: number;
};
export type WallsCollection = {
    get(id: string): {
        document: WallDoc;
    } | undefined;
    controlled: {
        document: WallDoc;
    }[];
    placeables: Array<{
        document: WallDoc;
        id: string;
    }>;
};
export type SceneEmbedded = {
    createEmbeddedDocuments(type: string, data: object[], opts?: object): Promise<{
        id: string | null;
    }[]>;
    updateEmbeddedDocuments(type: string, data: object[], opts?: object): Promise<unknown>;
    deleteEmbeddedDocuments(type: string, ids: string[], opts?: object): Promise<unknown>;
};
export declare function wallsLayer(): WallsCollection;
export declare function scene(): SceneEmbedded;
export declare function tileRect(doc: TileDoc): {
    left: number;
    top: number;
    w: number;
    h: number;
};
export declare function imageRect(doc: TileDoc): {
    icx: number;
    icy: number;
    sw: number;
    sh: number;
};
export declare function anchorToCanvas(icx: number, icy: number, sw: number, sh: number, a: TileAnchor): [number, number, number, number];
export declare function defToCanvas(doc: TileDoc, def: WallDef): [number, number, number, number];
export declare function canvasToAnchor(doc: TileDoc, c: number[]): TileAnchor;
