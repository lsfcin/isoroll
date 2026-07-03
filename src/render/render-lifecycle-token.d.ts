import type { TokenRenderer } from './token-renderer';
import type { PlaceableState } from './render-lifecycle-state';
export declare function drawToken(token: Token, state: PlaceableState, tokenRenderers: TokenRenderer[]): void;
export declare function refreshToken(token: Token, state: PlaceableState, tokenRenderers: TokenRenderer[], flags?: Record<string, boolean>): void;
export declare function flagsChangeToken(token: Token, state: PlaceableState, tokenRenderers: TokenRenderer[]): void;
export declare function selectToken(token: Token, state: PlaceableState, tokenRenderers: TokenRenderer[], onSightRefresh: () => void): void;
export declare function deselectToken(token: Token, state: PlaceableState, tokenRenderers: TokenRenderer[], onSightRefresh: () => void): void;
export declare function destroyToken(id: string, tokenRenderers: TokenRenderer[]): void;
