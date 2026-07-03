import { PlaceableDoc } from "./fog-helpers";
import type { Mesh, SliceState } from "./iso-tile-geom";
export declare function getMesh(obj: unknown): Mesh | undefined;
export declare const needsTileClone: (t: Tile) => boolean;
export declare function cloneSliceTexture(src: PIXI.Texture, x: number, y: number, w: number, h: number): PIXI.Texture;
export declare function syncSlicePos(s: PIXI.Sprite, m: Mesh): void;
export declare function initSliceAnchor(s: PIXI.Sprite, m: Mesh, fw: number, cutLeft: number, sliceW: number): void;
export interface SliceGeom {
    elev: number;
    band: number;
}
export declare function buildSlice(mesh: Mesh, origFrame: PIXI.Rectangle, i: number, state: SliceState, nSlices: number, g: SliceGeom, doc: PlaceableDoc, layer: PIXI.Container): PIXI.Sprite;
