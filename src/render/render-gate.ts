// Dual role: (1) renderer registry — module.ts calls registerToken/Tile to enroll renderers;
// (2) flag-change gate — onUpdateToken/Tile filter updateToken/updateTile hook events to
// flag-only changes and route them to render-lifecycle, bypassing the full refresh path.
// All Foundry hook subscriptions live in core/hook-registry.ts.

import { MODULE_ID, VolumeFlags } from '../core';
import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
import {
  registerTokenRenderer, registerTileRenderer,
  onTokenFlagsChange, onTileFlagsChange,
} from './render-lifecycle';

export class RenderGate {
  registerToken(r: TokenRenderer): this {
    registerTokenRenderer(r);
    return this;
  }

  registerTile(r: TileRenderer): this {
    registerTileRenderer(r);
    return this;
  }

  activate(): void { /* hooks registered in core/hook-registry.ts */ }

  static onUpdateToken(doc: TokenDocument, changes: Record<string, unknown>): void {
    if (VolumeFlags.isSceneEnabled()) {
      const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
      if (flags || ("elevation" in changes)) {
        const token = (doc as unknown as { object?: Token }).object;
        if (token) {
          onTokenFlagsChange(token);
        }
      }
    }
  }

  static onUpdateTile(doc: unknown, changes: Record<string, unknown>): void {
    if (VolumeFlags.isSceneEnabled()) {
      const flags = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
      if (flags) {
        const tile = (doc as unknown as { object?: Tile }).object;
        if (tile) {
          onTileFlagsChange(tile);
        }
      }
    }
  }
}
