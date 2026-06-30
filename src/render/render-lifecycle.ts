// Named lifecycle entry points for all rendering decisions.
// render-gate.ts routes Foundry hooks here; overlays called directly until Phase 5+ IsoRenderer.
// No rendering logic lives outside this file except RenderHandle.show/hide from selection events.

import { VolumeFlags, suppressTooltip, CanvasEnv } from '../core';
import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
import { isoRendererSightRefresh } from './iso-renderer';
import { classifyToken, classifyTile } from './render-lifecycle-state';
import { drawToken, refreshToken, flagsChangeToken, selectToken, deselectToken, destroyToken } from './render-lifecycle-token';
import { drawTile, refreshTile, flagsChangeTile, selectTile, deselectTile, destroyTile } from './render-lifecycle-tile';

const _tokenRenderers: TokenRenderer[] = [];
const _tileRenderers:  TileRenderer[]  = [];
let _renderSuspended = false;  // true while GridConfig is open; blocks per-frame refresh rebuilds

export function registerTokenRenderer(r: TokenRenderer): void {
  _tokenRenderers.push(r);
}
export function registerTileRenderer(r: TileRenderer): void {
  _tileRenderers.push(r);
}

export function onCanvasReady(): void {
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
  if (!VolumeFlags.isSceneEnabled()) {
    return;
  }
  for (const token of CanvasEnv.tokens()) {
    suppressTooltip(token);
    const tokenState = classifyToken(token);
    if (tokenState === "transformed") {
      continue;
    }
    _tokenRenderers.forEach(r => r.create(token));
    const tokenControlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
    if (tokenControlled) {
      _tokenRenderers.forEach(r => r.onControl(token, true));
    }
  }
  for (const tile of CanvasEnv.tiles()) {
    const tileState = classifyTile(tile);
    if (tileState === "transformed") {
      continue;
    }
    _tileRenderers.forEach(r => r.create(tile));
    const tileControlled = (tile as unknown as { controlled?: boolean }).controlled ?? false;
    if (tileControlled) {
      _tileRenderers.forEach(r => r.onControl(tile, true));
    }
  }
  onSightRefresh();
}

export function onCanvasTeardown(): void {
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onSceneChange(scene: Scene, _changes: object): void {
  const sceneId = (scene as unknown as { id?: string }).id;
  if (sceneId !== CanvasEnv.scene()?.id) {
    return;
  }
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onTileDraw(tile: Tile): void {
  if (!_renderSuspended) {
    const state = classifyTile(tile);
    drawTile(tile, state, _tileRenderers);
  }
}

export function onTileRefresh(tile: Tile, flags?: Record<string, boolean>): void {
  if (!_renderSuspended) {
    const state = classifyTile(tile);
    refreshTile(tile, state, _tileRenderers, flags);
  }
}

export function onTileFlagsChange(tile: Tile): void {
  const state = classifyTile(tile);
  flagsChangeTile(tile, state, _tileRenderers);
}

export function onTileSelect(tile: Tile): void {
  const state = classifyTile(tile);
  selectTile(tile, state, _tileRenderers);
}

export function onTileDeselect(tile: Tile): void {
  const state = classifyTile(tile);
  deselectTile(tile, state, _tileRenderers);
}

export function onTileMove(_tile: Tile): void {
  // Sync-only drag path; called from onTileRefresh when animation frame fires without position commit
}

export function onTileDestroy(id: string): void {
  destroyTile(id, _tileRenderers);
}

export function onTokenDraw(token: Token): void {
  if (!_renderSuspended) {
    suppressTooltip(token);
    const state = classifyToken(token);
    drawToken(token, state, _tokenRenderers);
  }
}

export function onTokenRefresh(token: Token, flags?: Record<string, boolean>): void {
  if (!_renderSuspended) {
    suppressTooltip(token);
    const state = classifyToken(token);
    refreshToken(token, state, _tokenRenderers, flags);
  }
}

export function onTokenFlagsChange(token: Token): void {
  const state = classifyToken(token);
  flagsChangeToken(token, state, _tokenRenderers);
}

export function onTokenSelect(token: Token): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  selectToken(token, state, _tokenRenderers, onSightRefresh);
}

export function onTokenDeselect(token: Token): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  deselectToken(token, state, _tokenRenderers, onSightRefresh);
}

export function onTokenMove(_token: Token): void {
  // Sync-only drag path; called from onTokenRefresh when animation frame fires without position commit
}

export function onTokenDestroy(id: string): void {
  destroyToken(id, _tokenRenderers);
}

export function onSightRefresh(): void {
  isoRendererSightRefresh();
  _tokenRenderers.forEach(r => r.onSightRefresh?.());
  _tileRenderers.forEach(r => r.onSightRefresh?.());
}

export function onGridConfigOpen(_app: Application): void {
  _renderSuspended = true;
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onGridConfigClose(): void {
  _renderSuspended = false;
  onCanvasReady();
}

export function onGridConfigPreview(_params: object): void {
  // Phase 7 — no-op until background system is refactored
}
