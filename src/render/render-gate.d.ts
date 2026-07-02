import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
export declare class RenderGate {
    registerToken(r: TokenRenderer): this;
    registerTile(r: TileRenderer): this;
    activate(): void;
    static onUpdateToken(doc: TokenDocument, changes: Record<string, unknown>): void;
    static onUpdateTile(doc: unknown, changes: Record<string, unknown>): void;
}
