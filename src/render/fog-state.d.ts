export type PlaceableDoc = {
    alpha?: unknown;
    hidden?: unknown;
};
export declare const seenTileIds: Set<string>;
export declare const restoredTileIds: Set<string>;
export declare function isRestoreChecked(): boolean;
export declare function setRestoreChecked(val: boolean): void;
export declare const STORAGE_KEY: (sceneId: string) => string;
export declare const EXPLORED_TINT = 8421504;
export declare function isGM(): boolean;
export declare function testPointVisible(p: {
    x: number;
    y: number;
}, viewers: Token[]): boolean;
export declare function buildPerimeterPoints(x: number, y: number, w: number, h: number, gs: number): {
    x: number;
    y: number;
}[];
export declare function testPerimeterVisible(x: number, y: number, w: number, h: number, viewers: Token[]): boolean;
export declare function tryRestoreForScene(sceneId: string): void;
export declare function applyNonVisibleFog(s: PIXI.Sprite, tileId: string, x: number, y: number, w: number, h: number, gs: number, cx: number, cy: number): void;
