export declare const tileUpsertTimers: Map<string, number>;
export declare const tokenUpsertTimers: Map<string, number>;
export declare const bgUpsertTimers: Map<string, number>;
export declare function debounced(timers: Map<string, ReturnType<typeof setTimeout>>, id: string, fn: () => Promise<void>, delay?: number): void;
export declare function upsertTile(doc: unknown): Promise<void>;
export declare function upsertToken(doc: unknown): Promise<void>;
export declare function upsertBackground(scene: unknown): Promise<void>;
