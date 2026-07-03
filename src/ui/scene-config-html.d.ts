export type SceneDoc = {
    getFlag: (m: string, k: string) => unknown;
};
export type SceneFlags = {
    enabled: boolean;
    transformBg: boolean;
    projection: string;
    cRot: number;
    cSkX: number;
    cSkY: number;
    cRatio: number;
};
export declare const PROJ_KEYS: string[];
export declare const PROJ_LOC_KEYS: Record<string, string>;
export declare function readSceneFlags(doc: SceneDoc): SceneFlags;
export declare function buildSceneHtml(f: SceneFlags): string;
