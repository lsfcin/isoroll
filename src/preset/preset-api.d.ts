export declare function selectedTile(): unknown;
export declare function selectedToken(): unknown;
export declare function tileApiFn(src: string): Promise<void>;
export declare function tileSaveFn(src?: string): Promise<void>;
export declare function tokenApiFn(src: string): Promise<void>;
export declare function tokenSaveFn(src?: string): Promise<void>;
export declare function bgSaveFn(): Promise<void>;
export declare function bgApiFn(src: string): Promise<void>;
export declare function buildIsorollPresets(): Record<string, unknown>;
