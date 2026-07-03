export type PlaceableState = "disabled" | "transformed" | "preview" | "pending" | "normal";
export declare function classifyToken(t: Token): PlaceableState;
export declare function classifyTile(t: Tile): PlaceableState;
