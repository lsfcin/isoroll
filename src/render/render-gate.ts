// Renderer registry + per-updateToken/updateTile flag-change dispatch.
// All other hook subscriptions live in core/hook-registry.ts.

import { MODULE_ID, VolumeFlags } from '../core';
import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
import {
  registerTokenRenderer, registerTileRenderer,
  onTokenFlagsChange, onTileFlagsChange,
} from './render-lifecycle';

export class RenderGate {
  registerToken(r: TokenRenderer): this { registerTokenRenderer(r); return this; }
  registerTile(r: TileRenderer):   this { registerTileRenderer(r);  return this; }

  activate(): void { /* hooks registered in core/hook-registry.ts */ }

  static onUpdateToken(doc: TokenDocument, changes: Record<string, unknown>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
    if (!flags && !("elevation" in changes)) return;
    const token = (doc as unknown as { object?: Token }).object;
    if (!token) return;
    onTokenFlagsChange(token);
  }

  static onUpdateTile(doc: unknown, changes: Record<string, unknown>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
    if (!flags) return;
    const tile = (doc as unknown as { object?: Tile }).object;
    if (!tile) return;
    onTileFlagsChange(tile);
  }
}
