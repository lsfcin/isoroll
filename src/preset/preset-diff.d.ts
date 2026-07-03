export declare const TILE_PRESET_KEYS: Set<string>;
export declare const TOKEN_PRESET_KEYS: Set<string>;
export declare const BG_PRESET_FLAG_KEYS: Set<string>;
export declare function changedFlagKeys(changes: Record<string, unknown>): Set<string>;
export declare function intersects(a: Set<string>, b: Set<string>): boolean;
export declare function bgNativeChanged(c: Record<string, unknown>): boolean;
export declare const tileNativeChanged: (c: Record<string, unknown>) => boolean;
