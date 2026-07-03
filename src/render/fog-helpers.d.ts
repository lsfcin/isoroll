export type { PlaceableDoc } from "./fog-state";
export { docAlpha, applyDocState, getViewers, applyTokenFogContainer, applyTokenFog, applyTileFog } from "./fog-apply";
export declare function clearSeenTiles(): void;
export declare function saveSessionToStorage(): void;
export declare function tryRestoreFromStorage(): void;
export declare function maybeInvalidateRestoredTiles(): void;
