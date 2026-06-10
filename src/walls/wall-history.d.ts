type EntryBase = {
    tileHistLen: number;
};
type Entry = ({
    k: "toggle";
    tileId: string;
    wallId: string;
    prevIds: string[];
    wasLinked: boolean;
} & EntryBase) | ({
    k: "move";
    wallId: string;
    prevC: number[];
} & EntryBase) | ({
    k: "create";
    tileId: string;
    newIds: string[];
    prevData: object[];
} & EntryBase) | ({
    k: "delete";
    tileId: string;
    prevData: object[];
} & EntryBase) | ({
    k: "unlink-all";
    tileId: string;
    prevIds: string[];
} & EntryBase);
export declare const WallHistory: {
    push(e: Omit<Entry, "tileHistLen">): void;
    clear(): void;
    readonly size: number;
    readonly topTileHistLen: number;
    undo(): Promise<void>;
};
export {};
