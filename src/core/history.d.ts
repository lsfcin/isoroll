export type HistoryLayer = "tiles" | "tokens" | "walls";
export declare const IsoHistory: {
    pushPreDrag(_layer: HistoryLayer, _entry: object): void;
};
