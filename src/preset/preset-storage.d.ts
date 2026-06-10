import type { IsorollPreset } from "./preset-types";
export declare function deriveKey(src: string): string;
export declare function getCachedPreset(key: string): IsorollPreset | undefined;
export declare function preloadCache(): Promise<void>;
export declare function readPreset(key: string): Promise<IsorollPreset | null>;
export declare function writePreset(preset: IsorollPreset): Promise<void>;
