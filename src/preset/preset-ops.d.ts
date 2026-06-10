export type TextureDoc = {
    texture?: {
        src?: string;
    };
};
type FlagDoc = {
    getFlag(m: string, k: string): unknown;
    id?: string | null;
};
type UpdateDoc = {
    update(data: object, options?: object): Promise<unknown>;
};
type TileDocP = {
    width?: number;
    height?: number;
    updateSource?(data: object): void;
};
export type SceneDoc = {
    background?: {
        src?: string;
        scaleX?: number;
        offsetX?: number;
        offsetY?: number;
    };
    grid?: {
        size?: number;
    };
    update(data: object, options?: object): Promise<unknown>;
    getFlag(m: string, k: string): unknown;
    id?: string | null;
};
export declare const asTD: (d: unknown) => TextureDoc;
export declare const asUD: (d: unknown) => UpdateDoc;
export declare const toScene: (d: unknown) => SceneDoc;
export declare const asFD: (d: unknown) => FlagDoc;
export declare const asTDp: (d: unknown) => TileDocP;
export declare const getSrc: (d: unknown) => string;
export declare const docId: (d: unknown) => string;
export declare const isPresetEnabled: (d: unknown) => boolean;
export declare const gridSize: () => number;
type BgData = {
    src?: string;
    scaleX?: number;
    offsetX?: number;
    offsetY?: number;
};
export declare const getSceneBg: (scene: unknown) => BgData | undefined;
export {};
