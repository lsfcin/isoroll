// Central hook dispatcher. Classifies each Foundry hook event into a PlaceableState,
// then dispatches to registered renderers — once, with a single authority for all guards.
// Renderers contain pure PIXI logic; no Foundry preview/pending/disabled knowledge needed.

import { VolumeFlags, isTransformedToken, isTransformedTile, suppressTooltip, isPreviewClone, hasActiveClone } from "../core";
import type { TokenRenderer } from "./token-renderer";
import type { TileRenderer } from "./tile-renderer";

type PlaceableState = "disabled" | "transformed" | "preview" | "pending" | "normal";

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

export class RenderGate {
  private tokenRenderers: TokenRenderer[] = [];
  private tileRenderers:  TileRenderer[]  = [];

  registerToken(r: TokenRenderer): this { this.tokenRenderers.push(r); return this; }
  registerTile (r: TileRenderer):  this { this.tileRenderers.push(r);  return this; }

  activate(): void {
    Hooks.on("canvasReady",      ()              => this.onCanvasReady());
    Hooks.on("updateScene",      (s: Scene)      => this.onUpdateScene(s));
    Hooks.on("renderGridConfig", ()              => { this.tokenRenderers.forEach(r => r.clearAll()); this.tileRenderers.forEach(r => r.clearAll()); });
    Hooks.on("sightRefresh",     ()              => { this.tokenRenderers.forEach(r => r.onSightRefresh?.()); this.tileRenderers.forEach(r => r.onSightRefresh?.()); });
    Hooks.on("drawToken",        (t: Token)      => this.onDrawToken(t));
    Hooks.on("controlToken",     (t: Token, c: boolean) => this.onControlToken(t, c));
    Hooks.on("refreshToken",     (t: Token, f?: Record<string, boolean>) => this.onRefreshToken(t, f));
    Hooks.on("destroyToken",     (t: Token)      => this.tokenRenderers.forEach(r => r.onDestroy?.(t.id)));
    Hooks.on("drawTile",         (t: Tile)       => this.onDrawTile(t));
    Hooks.on("controlTile",      (t: Tile, c: boolean) => this.onControlTile(t, c));
    Hooks.on("refreshTile",      (t: Tile, f?: Record<string, boolean>) => this.onRefreshTile(t, f));
    Hooks.on("destroyTile",      (t: Tile)       => this.tileRenderers.forEach(r => r.onDestroy?.(t.id)));
  }

  private onCanvasReady(): void {
    this.tokenRenderers.forEach(r => r.clearAll());
    this.tileRenderers.forEach(r => r.clearAll());
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      suppressTooltip(token);
      if (isTransformedToken(token)) continue;
      this.tokenRenderers.forEach(r => r.create(token));
      const controlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
      if (controlled) this.tokenRenderers.forEach(r => r.onControl(token, true));
    }
    for (const tile of (canvas.tiles?.placeables ?? []) as Tile[]) {
      if (isTransformedTile(tile)) continue;
      this.tileRenderers.forEach(r => r.create(tile));
      const controlled = (tile as unknown as { controlled?: boolean }).controlled ?? false;
      if (controlled) this.tileRenderers.forEach(r => r.onControl(tile, true));
    }
    this.tokenRenderers.forEach(r => r.onSightRefresh?.());
    this.tileRenderers.forEach(r => r.onSightRefresh?.());
  }

  private onUpdateScene(scene: Scene): void {
    if ((scene as unknown as { id?: string }).id !== canvas.scene?.id) return;
    this.tokenRenderers.forEach(r => r.clearAll());
    this.tileRenderers.forEach(r => r.clearAll());
  }

  private onDrawToken(token: Token): void {
    suppressTooltip(token);
    const state = classifyToken(token);
    if (state === "disabled" || state === "transformed" || state === "pending") return;
    if (state === "preview") {
      this.tokenRenderers.filter(r => r.handlesPreview).forEach(r => r.create(token));
      return;
    }
    this.tokenRenderers.forEach(r => r.create(token));
  }

  private onControlToken(token: Token, controlled: boolean): void {
    const state = classifyToken(token);
    if (state === "disabled") return;
    if (state === "transformed") { this.tokenRenderers.forEach(r => r.hide(token.id)); return; }
    if (state === "preview" || state === "pending") return;
    this.tokenRenderers.forEach(r => r.onControl(token, controlled));
  }

  private onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    suppressTooltip(token);
    const state = classifyToken(token);
    if (state === "disabled" || state === "transformed") { this.tokenRenderers.forEach(r => r.hide(token.id)); return; }
    if (state === "pending") return; // stale mesh.x/y at origin — skip all to avoid blink
    if (state === "preview") {
      // Only ISO (handlesPreview=true) follows cursor — other overlays stay at origin.
      const preview = this.tokenRenderers.filter(r => r.handlesPreview);
      preview.forEach(r => r.sync(token));
      if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) preview.forEach(r => r.rebuild(token));
      return;
    }
    this.tokenRenderers.forEach(r => r.sync(token));
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return; // animation frame, no position commit
    this.tokenRenderers.forEach(r => r.rebuild(token));
  }

  private onDrawTile(tile: Tile): void {
    const state = classifyTile(tile);
    if (state === "disabled" || state === "transformed" || state === "pending") return;
    if (state === "preview") {
      this.tileRenderers.filter(r => r.handlesPreview).forEach(r => r.create(tile));
      return;
    }
    this.tileRenderers.forEach(r => r.create(tile));
  }

  private onControlTile(tile: Tile, controlled: boolean): void {
    const state = classifyTile(tile);
    if (state === "disabled") return;
    if (state === "transformed") { this.tileRenderers.forEach(r => r.hide(tile.id)); return; }
    if (state === "preview" || state === "pending") return;
    this.tileRenderers.forEach(r => r.onControl(tile, controlled));
  }

  private onRefreshTile(tile: Tile, flags?: Record<string, boolean>): void {
    const state = classifyTile(tile);
    if (state === "disabled" || state === "transformed") { this.tileRenderers.forEach(r => r.hide(tile.id)); return; }
    if (state === "pending") return; // stale mesh.x/y at origin — skip all to avoid blink
    this.tileRenderers.forEach(r => r.sync(tile));
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return; // animation frame, no position commit
    this.tileRenderers.forEach(r => r.rebuild(tile));
  }
}
