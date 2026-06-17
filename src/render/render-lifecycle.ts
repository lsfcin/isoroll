// Named lifecycle entry points for all rendering decisions.
// render-gate.ts routes Foundry hooks here; overlays called directly until Phase 5+ IsoRenderer.
// No rendering logic lives outside this file except RenderHandle.show/hide from selection events.

import { MODULE_ID, VolumeFlags, isTransformedToken, isTransformedTile, suppressTooltip, isPreviewClone, hasActiveClone, CanvasEnv } from '../core';
import type { TokenRenderer } from './token-renderer';
import type { TileRenderer } from './tile-renderer';
import { isoRendererSightRefresh } from './iso-renderer';

type PlaceableState = "disabled" | "transformed" | "preview" | "pending" | "normal";

const _tokenRenderers: TokenRenderer[] = [];
const _tileRenderers:  TileRenderer[]  = [];

export function registerTokenRenderer(r: TokenRenderer): void { _tokenRenderers.push(r); }
export function registerTileRenderer(r: TileRenderer):  void { _tileRenderers.push(r); }

function classifyToken(t: Token): PlaceableState {
  if (!VolumeFlags.isSceneEnabled()) return "disabled";
  if (isTransformedToken(t))         return "transformed";
  if (isPreviewClone(t))             return "preview";
  if (hasActiveClone(t))             return "pending";
  return "normal";
}

function classifyTile(t: Tile): PlaceableState {
  if (!VolumeFlags.isSceneEnabled()) return "disabled";
  if (isTransformedTile(t))          return "transformed";
  if (isPreviewClone(t))             return "preview";
  if (hasActiveClone(t))             return "pending";
  return "normal";
}

export function onCanvasReady(): void {
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
  if (!VolumeFlags.isSceneEnabled()) return;
  for (const token of CanvasEnv.tokens()) {
    suppressTooltip(token);
    if (isTransformedToken(token)) continue;
    _tokenRenderers.forEach(r => r.create(token));
    const controlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
    if (controlled) _tokenRenderers.forEach(r => r.onControl(token, true));
  }
  for (const tile of CanvasEnv.tiles()) {
    if (isTransformedTile(tile)) continue;
    _tileRenderers.forEach(r => r.create(tile));
    const controlled = (tile as unknown as { controlled?: boolean }).controlled ?? false;
    if (controlled) _tileRenderers.forEach(r => r.onControl(tile, true));
  }
  onSightRefresh();
}

export function onCanvasTeardown(): void {
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onSceneChange(scene: Scene, _changes: object): void {
  if ((scene as unknown as { id?: string }).id !== CanvasEnv.scene()?.id) return;
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onTileDraw(tile: Tile): void {
  const state = classifyTile(tile);
  if (state === "disabled" || state === "transformed" || state === "pending") return;
  if (state === "preview") { _tileRenderers.filter(r => r.handlesPreview).forEach(r => r.create(tile)); return; }
  _tileRenderers.forEach(r => r.create(tile));
}

export function onTileRefresh(tile: Tile, flags?: Record<string, boolean>): void {
  const state = classifyTile(tile);
  if (state === "disabled" || state === "transformed") { _tileRenderers.forEach(r => r.hide(tile.id)); return; }
  if (state === "pending") return;
  _tileRenderers.forEach(r => r.sync(tile));
  if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
  _tileRenderers.forEach(r => r.rebuild(tile));
}

export function onTileFlagsChange(tile: Tile): void {
  const state = classifyTile(tile);
  // "pending" (cloned tile) safe to rebuild on flag changes — renderers use doc coords, not mesh
  if (state === "disabled" || state === "transformed" || state === "preview") return;
  _tileRenderers.forEach(r => r.rebuild(tile));
}

export function onTileSelect(tile: Tile): void {
  const state = classifyTile(tile);
  if (state === "disabled") return;
  if (state === "transformed") { _tileRenderers.forEach(r => r.hide(tile.id)); return; }
  if (state === "preview" || state === "pending") return;
  _tileRenderers.forEach(r => r.onControl(tile, true));
}

export function onTileDeselect(tile: Tile): void {
  const state = classifyTile(tile);
  if (state === "disabled") return;
  if (state === "transformed") { _tileRenderers.forEach(r => r.hide(tile.id)); return; }
  if (state === "preview" || state === "pending") return;
  _tileRenderers.forEach(r => r.onControl(tile, false));
}

export function onTileMove(_tile: Tile): void {
  // Sync-only drag path; called from onTileRefresh when animation frame fires without position commit
}

export function onTileDestroy(id: string): void { _tileRenderers.forEach(r => r.onDestroy?.(id)); }

export function onTokenDraw(token: Token): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  if (state === "disabled" || state === "transformed" || state === "pending") return;
  if (state === "preview") { _tokenRenderers.filter(r => r.handlesPreview).forEach(r => r.create(token)); return; }
  _tokenRenderers.forEach(r => r.create(token));
}

export function onTokenRefresh(token: Token, flags?: Record<string, boolean>): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  if (state === "disabled" || state === "transformed") { _tokenRenderers.forEach(r => r.hide(token.id)); return; }
  if (state === "pending") return;
  if (state === "preview") {
    const preview = _tokenRenderers.filter(r => r.handlesPreview);
    preview.forEach(r => r.sync(token));
    if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) preview.forEach(r => r.rebuild(token));
    return;
  }
  _tokenRenderers.forEach(r => r.sync(token));
  if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
  _tokenRenderers.forEach(r => r.rebuild(token));
}

export function onTokenFlagsChange(token: Token): void {
  const state = classifyToken(token);
  // "pending" (cloned token) safe to rebuild on flag changes — renderers use doc coords, not mesh
  if (state === "disabled" || state === "transformed" || state === "preview") return;
  _tokenRenderers.forEach(r => r.rebuild(token));
}

export function onTokenSelect(token: Token): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  if (state === "disabled") return;
  if (state === "transformed") { _tokenRenderers.forEach(r => r.hide(token.id)); return; }
  if (state === "preview" || state === "pending") return;
  _tokenRenderers.forEach(r => r.onControl(token, true));
  onSightRefresh();
}

export function onTokenDeselect(token: Token): void {
  suppressTooltip(token);
  const state = classifyToken(token);
  if (state === "disabled") return;
  if (state === "transformed") { _tokenRenderers.forEach(r => r.hide(token.id)); return; }
  if (state === "preview" || state === "pending") return;
  _tokenRenderers.forEach(r => r.onControl(token, false));
  onSightRefresh();
}

export function onTokenMove(_token: Token): void {
  // Sync-only drag path; called from onTokenRefresh when animation frame fires without position commit
}

export function onTokenDestroy(id: string): void { _tokenRenderers.forEach(r => r.onDestroy?.(id)); }

export function onSightRefresh(): void {
  isoRendererSightRefresh();
  _tokenRenderers.forEach(r => r.onSightRefresh?.());
  _tileRenderers.forEach(r => r.onSightRefresh?.());
}

export function onGridConfigOpen(_app: Application): void {
  _tokenRenderers.forEach(r => r.clearAll());
  _tileRenderers.forEach(r => r.clearAll());
}

export function onGridConfigPreview(_params: object): void {
  // Phase 7 — no-op until background system is refactored
}
