export declare let DEBUG_SLICES: boolean;
export declare function debugSlices(on: boolean): void;
export declare function debugGrid(on: boolean): void;
export declare let DEBUG_ZORDER: boolean;
export declare function debugZOrder(on: boolean): void;
export declare function scheduleDumpZOrder(): void;
export declare function consumeDumpFlag(): boolean;
export declare function logSliceZ(prefix: string, i: number, state: import("./iso-tile-geom").SliceState, nSlices: number, zIndex: number, extra: string): void;
export declare function dumpZOrder(label?: string): void;
