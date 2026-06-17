// Thin Foundry hook subscriber. All dispatch and classification logic lives in render-lifecycle.ts.

import { MODULE_ID, VolumeFlags } from '../core';
import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
import {
  registerTokenRenderer, registerTileRenderer,
  onCanvasReady, onCanvasTeardown, onSceneChange, onGridConfigOpen, onSightRefresh,
  onTileDraw, onTileRefresh, onTileFlagsChange, onTileSelect, onTileDeselect, onTileDestroy,
  onTokenDraw, onTokenRefresh, onTokenFlagsChange, onTokenSelect, onTokenDeselect, onTokenDestroy,
} from './render-lifecycle';

export class RenderGate {
  registerToken(r: TokenRenderer): this { registerTokenRenderer(r); return this; }
  registerTile(r: TileRenderer):   this { registerTileRenderer(r);  return this; }

  activate(): void {
    Hooks.on("canvasReady",      ()                                       => onCanvasReady());
    Hooks.on("canvasTeardown",   ()                                       => onCanvasTeardown());
    Hooks.on("updateScene",      (s: Scene)                               => onSceneChange(s, {}));
    Hooks.on("renderGridConfig", (app: Application)                       => onGridConfigOpen(app));
    Hooks.on("sightRefresh",     ()                                       => onSightRefresh());
    Hooks.on("drawToken",        (t: Token)                               => onTokenDraw(t));
    Hooks.on("controlToken",     (t: Token, c: boolean)                   => c ? onTokenSelect(t) : onTokenDeselect(t));
    Hooks.on("refreshToken",     (t: Token, f?: Record<string, boolean>)  => onTokenRefresh(t, f));
    Hooks.on("destroyToken",     (t: Token)                               => onTokenDestroy(t.id));
    Hooks.on("drawTile",         (t: Tile)                                => onTileDraw(t));
    Hooks.on("controlTile",      (t: Tile, c: boolean)                    => c ? onTileSelect(t) : onTileDeselect(t));
    Hooks.on("refreshTile",      (t: Tile, f?: Record<string, boolean>)   => onTileRefresh(t, f));
    Hooks.on("destroyTile",      (t: Tile)                                => onTileDestroy(t.id));
    Hooks.on("updateToken", (doc: TokenDocument, changes: Record<string, unknown>) => {
      if (!VolumeFlags.isSceneEnabled()) return;
      const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
      if (!flags && !("elevation" in changes)) return;
      const token = (doc as unknown as { object?: Token }).object;
      if (!token) return;
      onTokenFlagsChange(token);
    });
    Hooks.on("updateTile", (doc: unknown, changes: Record<string, unknown>) => {
      if (!VolumeFlags.isSceneEnabled()) return;
      const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
      if (!flags) return;
      const tile = (doc as unknown as { object?: Tile }).object;
      if (!tile) return;
      onTileFlagsChange(tile);
    });
  }
}
