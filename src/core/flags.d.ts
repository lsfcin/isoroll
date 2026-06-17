/**
 * Custom document flags for 3D bounding volumes.
 *
 * Tokens: z from elevation (existing), height + depth from flags.
 * Tiles:  base elevation, height, depth all from flags (tiles have no native elevation).
 *
 * Footprint (x/y grid cells) derived from token/tile pixel size at render time.
 */
export declare const MODULE_ID = "isoroll";
export interface TokenVolumeFlags {
    boundHeight: number;
}
export interface TileVolumeFlags {
    baseElevation: number;
    boundHeight: number;
}
export declare class VolumeFlags {
    static getTokenHeight(token: TokenDocument): number;
    static getTileBaseElevation(tile: TileDocument): number;
    static getTileHeight(tile: TileDocument): number;
    static getEffectiveTileHeight(tile: TileDocument): number;
    static getImageOffset(doc: {
        getFlag(s: string, k: string): unknown;
    }): {
        x: number;
        y: number;
    };
    static getImageScale(doc: {
        getFlag(s: string, k: string): unknown;
    }): number;
    static getImageYScale(doc: {
        getFlag(s: string, k: string): unknown;
    }): number;
    static getBackgroundYScale(scene: {
        getFlag(s: string, k: string): unknown;
    }): number;
    static getTileFlipped(tile: TileDocument): boolean;
    static getShowImageManipulation(doc: {
        getFlag(s: string, k: string): unknown;
    }, defaultValue: boolean): boolean;
    static getShowVolumeManipulation(doc: {
        getFlag(s: string, k: string): unknown;
    }, defaultValue: boolean): boolean;
    static getShowElevationUnselected(doc: {
        getFlag(s: string, k: string): unknown;
    }): boolean;
    static isForegroundTile(tile: TileDocument): boolean;
    static getPresetEnabled(doc: {
        getFlag(s: string, k: string): unknown;
    }): boolean;
    static isSceneEnabled(): boolean;
    static getShadowEnabled(doc: {
        getFlag(s: string, k: string): unknown;
    }, defaultOn?: boolean): boolean;
    static getShadowShape(doc: {
        getFlag(s: string, k: string): unknown;
    }, defaultShape?: "circle" | "rect"): "circle" | "rect";
    static getShadowRadius(doc: {
        getFlag(s: string, k: string): unknown;
    }): number;
    static getShadowOpacity(doc: {
        getFlag(s: string, k: string): unknown;
    }, defaultOpacity?: number): number;
    static getElevLineEnabled(doc: {
        getFlag(s: string, k: string): unknown;
    }): boolean;
    static getElevLineDashed(doc: {
        getFlag(s: string, k: string): unknown;
    }): boolean;
    static getElevLineColor(doc: {
        getFlag(s: string, k: string): unknown;
    }): "black" | "player";
}
export declare function getElevation(doc: object): number;
export declare function isTransformedToken(token: Token): boolean;
export declare function isTransformedTile(tile: Tile): boolean;
