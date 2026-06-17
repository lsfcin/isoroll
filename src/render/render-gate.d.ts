import type { TokenRenderer } from "./token-renderer";
import type { TileRenderer } from "./tile-renderer";
export declare class RenderGate {
    private tokenRenderers;
    private tileRenderers;
    registerToken(r: TokenRenderer): this;
    registerTile(r: TileRenderer): this;
    activate(): void;
    private onCanvasReady;
    private onUpdateScene;
    private onDrawToken;
    private onControlToken;
    private onRefreshToken;
    private onDrawTile;
    private onControlTile;
    private onRefreshTile;
}
