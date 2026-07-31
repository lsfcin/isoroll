import type { WallDef } from "../walls";
export type ManifestFacing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "TOP";
export interface ManifestTile {
    piece: string;
    asset: string;
    facing: ManifestFacing;
    u: number;
    v: number;
    boundHeight: number;
    imageOffset: [number, number];
    pxPerVoxel: number;
    z?: number;
    sizePx?: [number, number];
    originPx?: [number, number];
    mat?: string;
    side?: string;
}
export type ManifestWall = Pick<WallDef, "topOffset" | "bottomOffset" | "config"> & {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    dir?: "u" | "v";
};
export interface SceneManifest {
    scene: string;
    view: string;
    pxPerVoxel: number;
    tiles: ManifestTile[];
    walls: ManifestWall[];
}
export interface ImportOptions {
    sceneId?: string;
    assetBase?: string;
}
export interface ImportResult {
    tileIds: string[];
    wallIds: string[];
}
