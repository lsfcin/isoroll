import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";
export declare function tilePresetData(preset: TilePreset): object;
export declare function applyTile(doc: unknown, preset: TilePreset): Promise<void>;
export declare function applyToken(doc: unknown, preset: TokenPreset): Promise<void>;
export declare function applyBackground(scene: unknown, preset: BackgroundPreset): Promise<void>;
export declare function autoApplyTile(doc: unknown): Promise<void>;
/** Apply only the wall portion of a cached preset (called from createTile on cache-hit). */
export declare function autoApplyTileWalls(doc: unknown): Promise<void>;
export declare function autoApplyToken(doc: unknown): Promise<void>;
export declare function autoApplyBackground(scene: unknown): Promise<void>;
export declare function applyPresetToSource(doc: unknown, src: string): void;
