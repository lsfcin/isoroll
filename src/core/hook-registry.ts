// Central hook registry — all Hooks.on/once calls in one place.
// Grouped by event name; handlers listed in explicit execution order.
// To add a new hook: register it here, do NOT add Hooks.on to a subsystem file.

import { CanvasTransform, onRefreshTile, onUpdateTileFlags, onPreUpdateScene, onUpdateSceneGridRescale, onRefreshToken } from '../transform';
import {
  onCanvasReady, onCanvasTeardown, onSceneChange,
  onGridConfigOpen, onGridConfigClose, onSightRefresh,
  onTileDraw, onTileRefresh, onTileSelect, onTileDeselect, onTileDestroy,
  onTokenDraw, onTokenRefresh, onTokenSelect, onTokenDeselect, onTokenDestroy,
  RenderGate, IsoSpriteLayer,
} from '../render';
import { BackgroundGizmos, BgHtml } from '../background';
import { TileHud }            from '../hud';
import { PresetManager }      from '../preset';
import { WallManager }        from '../walls';
import { isPreviewClone }     from './index';
import { onRenderSceneConfig, onRenderTileConfig, onRenderTokenConfigState, onCloseTokenConfig, onRenderTokenConfigTab } from '../ui';

export function registerAllHooks(): void {

  // ── canvasInit ────────────────────────────────────────────────────────────
  Hooks.on("canvasInit", IsoSpriteLayer._onCanvasInit);

  // ── canvasReady ───────────────────────────────────────────────────────────
  // Order: stage transform → bg gizmo clear → wall history clear → render lifecycle → ticker
  Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
  Hooks.on("canvasReady", BackgroundGizmos.clearAll);
  Hooks.on("canvasReady", WallManager.onCanvasReady);
  Hooks.on("canvasReady", onCanvasReady);
  Hooks.on("canvasReady", IsoSpriteLayer.onCanvasReady);

  // ── canvasTeardown ────────────────────────────────────────────────────────
  Hooks.on("canvasTeardown", onCanvasTeardown);

  // ── changeScene ───────────────────────────────────────────────────────────
  Hooks.on("changeScene", IsoSpriteLayer._teardown);

  // ── closeGridConfig ───────────────────────────────────────────────────────
  // Order: stage transform → render lifecycle → bg html
  Hooks.on("closeGridConfig", CanvasTransform.onCloseGridConfig);
  Hooks.on("closeGridConfig", onGridConfigClose);
  Hooks.on("closeGridConfig", BgHtml.onCloseGridConfig);

  // ── closeSceneConfig ──────────────────────────────────────────────────────
  Hooks.on("closeSceneConfig", CanvasTransform.onCloseSceneConfig);

  // ── closeTokenConfig ──────────────────────────────────────────────────────
  Hooks.on("closeTokenConfig", onCloseTokenConfig);

  // ── controlTile ───────────────────────────────────────────────────────────
  Hooks.on("controlTile", (t: Tile, c: boolean) => c ? onTileSelect(t) : onTileDeselect(t));

  // ── controlToken ──────────────────────────────────────────────────────────
  Hooks.on("controlToken", (t: Token, c: boolean) => c ? onTokenSelect(t) : onTokenDeselect(t));

  // ── createScene ───────────────────────────────────────────────────────────
  Hooks.on("createScene", PresetManager.onCreateScene);

  // ── createTile ────────────────────────────────────────────────────────────
  Hooks.on("createTile", PresetManager.onCreateTile);

  // ── createToken ───────────────────────────────────────────────────────────
  Hooks.on("createToken", PresetManager.onCreateToken);

  // ── deleteTile ───────────────────────────────────────────────────────────
  // Belt-and-suspenders render-lifecycle cleanup before WallManager cascade.
  Hooks.on("deleteTile", (doc: unknown) => onTileDestroy((doc as { id?: string }).id ?? ""));
  Hooks.on("deleteTile", WallManager.onDeleteTile);

  // ── deleteToken ───────────────────────────────────────────────────────────
  Hooks.on("deleteToken", (doc: unknown) => onTokenDestroy((doc as { id?: string }).id ?? ""));

  // ── deleteWall ────────────────────────────────────────────────────────────
  Hooks.on("deleteWall", WallManager.onDeleteWall);

  // ── destroyTile ───────────────────────────────────────────────────────────
  // Guard: preview clone shares id with original — must not trigger cleanup on original.
  Hooks.on("destroyTile", (t: Tile) => { if (!isPreviewClone(t)) onTileDestroy(t.id); });

  // ── destroyToken ──────────────────────────────────────────────────────────
  Hooks.on("destroyToken", (t: Token) => { if (!isPreviewClone(t)) onTokenDestroy(t.id); });

  // ── drawTile ─────────────────────────────────────────────────────────────
  Hooks.on("drawTile", onTileDraw);

  // ── drawToken ────────────────────────────────────────────────────────────
  Hooks.on("drawToken", onTokenDraw);

  // ── preCreateTile ────────────────────────────────────────────────────────
  Hooks.on("preCreateTile", PresetManager.onPreCreateTile);

  // ── preUpdateScene ────────────────────────────────────────────────────────
  Hooks.on("preUpdateScene", onPreUpdateScene);

  // ── preUpdateTile ─────────────────────────────────────────────────────────
  Hooks.on("preUpdateTile", WallManager.onPreUpdateTile);

  // ── ready ─────────────────────────────────────────────────────────────────
  Hooks.once("ready", PresetManager.onReady);

  // ── refreshTile ───────────────────────────────────────────────────────────
  // [DepthSorter.onRefresh is dormant — add Hooks.on("refreshTile", DepthSorter.onRefresh) when Phase 1 ships]
  // Order: object transform (counter-transform) → render lifecycle (rebuild clones)
  Hooks.on("refreshTile", onRefreshTile);
  Hooks.on("refreshTile", (t: Tile, f?: Record<string, boolean>) => onTileRefresh(t, f));

  // ── refreshToken ──────────────────────────────────────────────────────────
  // [DepthSorter.onRefresh dormant — same as above]
  // Order: object transform → render lifecycle
  Hooks.on("refreshToken", onRefreshToken);
  Hooks.on("refreshToken", (t: Token, f?: Record<string, boolean>) => onTokenRefresh(t, f));

  // ── renderGridConfig ──────────────────────────────────────────────────────
  // Order: stage transform preview → render lifecycle grid config state → bg html injection
  Hooks.on("renderGridConfig", CanvasTransform.onRenderGridConfig);
  Hooks.on("renderGridConfig", (app: Application) => onGridConfigOpen(app));
  Hooks.on("renderGridConfig", (app: { _processSubmitData?: (...a: unknown[]) => Promise<unknown> }, html: HTMLElement) => BgHtml.onRenderGridConfig(app, html));

  // ── renderSceneConfig ─────────────────────────────────────────────────────
  Hooks.on("renderSceneConfig", onRenderSceneConfig);

  // ── renderTileConfig ──────────────────────────────────────────────────────
  Hooks.on("renderTileConfig", onRenderTileConfig);

  // ── renderTileHUD ─────────────────────────────────────────────────────────
  Hooks.on("renderTileHUD", TileHud.onRenderTileHUD);

  // ── renderTokenConfig ─────────────────────────────────────────────────────
  // Two handlers: state tracker first, then tab injection.
  Hooks.on("renderTokenConfig", onRenderTokenConfigState);
  Hooks.on("renderTokenConfig", onRenderTokenConfigTab);

  // ── resetFogOfWar ────────────────────────────────────────────────────────
  Hooks.on("resetFogOfWar", IsoSpriteLayer.onResetFogOfWar);

  // ── sightRefresh ─────────────────────────────────────────────────────────
  Hooks.on("sightRefresh", onSightRefresh);

  // ── updateScene ──────────────────────────────────────────────────────────
  // Order: stage transform → render lifecycle → object transform (grid rescale) → preset upsert
  Hooks.on("updateScene", CanvasTransform.onUpdateScene);
  Hooks.on("updateScene", (s: Scene) => onSceneChange(s, {}));
  Hooks.on("updateScene", onUpdateSceneGridRescale);
  Hooks.on("updateScene", PresetManager.onUpdateScene);

  // ── updateTile ───────────────────────────────────────────────────────────
  // Order: object transform flags → render lifecycle flags change → preset upsert → wall sync
  Hooks.on("updateTile", onUpdateTileFlags);
  Hooks.on("updateTile", RenderGate.onUpdateTile);
  Hooks.on("updateTile", PresetManager.onUpdateTile);
  Hooks.on("updateTile", WallManager.onUpdateTile);

  // ── updateToken ──────────────────────────────────────────────────────────
  // Order: render lifecycle flags change → preset upsert
  Hooks.on("updateToken", RenderGate.onUpdateToken);
  Hooks.on("updateToken", PresetManager.onUpdateToken);

  // ── updateWall ───────────────────────────────────────────────────────────
  Hooks.on("updateWall", WallManager.onUpdateWall);
}

