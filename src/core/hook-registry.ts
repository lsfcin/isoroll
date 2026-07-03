// Central hook registry — all Hooks.on/once calls in one place (placeable hooks split
// into hook-registry-placeables.ts). Grouped by event name; handlers listed in explicit
// execution order. To add a new hook: register it here, NOT in a subsystem file.

import { CanvasTransform, onPreUpdateScene, onUpdateSceneGridRescale } from "../transform";
import {
  onCanvasReady,
  onCanvasTeardown,
  onSceneChange,
  onGridConfigOpen,
  onGridConfigClose,
  onSightRefresh,
  IsoSpriteLayer,
} from "../render";
import { BackgroundGizmos, BgHtml } from "../background";
import { TileHud } from "../hud";
import { PresetManager } from "../preset";
import { WallManager } from "../walls";
import { registerTileAndTokenHooks } from "./hook-registry-placeables";
import {
  onRenderSceneConfig,
  onRenderTileConfig,
  onRenderTokenConfigState,
  onCloseTokenConfig,
  onRenderTokenConfigTab,
} from "../ui";

function registerCanvasAndSceneHooks(): void {
  // ── canvasInit ────────────────────────────────────────────────────────────
  Hooks.on("canvasInit", IsoSpriteLayer._onCanvasInit);

  // ── canvasReady ───────────────────────────────────────────────────────────
  // Order: stage transform → bg gizmo clear → wall history clear → render lifecycle → ticker
  Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
  Hooks.on("canvasReady", BackgroundGizmos.clearAll); // clears stale gizmos on scene load (also used as GridConfig close callback)
  Hooks.on("canvasReady", WallManager.onCanvasReady);
  Hooks.on("canvasReady", onCanvasReady);
  Hooks.on("canvasReady", IsoSpriteLayer.onCanvasReady);

  // ── canvasTeardown ────────────────────────────────────────────────────────
  Hooks.on("canvasTeardown", onCanvasTeardown);

  // ── changeScene ───────────────────────────────────────────────────────────
  Hooks.on("changeScene", IsoSpriteLayer._teardown);

  // ── updateScene ──────────────────────────────────────────────────────────
  // Order: stage transform → render lifecycle → object transform (grid rescale) → preset upsert
  Hooks.on("updateScene", CanvasTransform.onUpdateScene);
  Hooks.on("updateScene", (s: Scene) => onSceneChange(s, {}));
  Hooks.on("updateScene", onUpdateSceneGridRescale);
  Hooks.on("updateScene", PresetManager.onUpdateScene);
}

export function registerAllHooks(): void {
  registerCanvasAndSceneHooks();
  registerTileAndTokenHooks();

  // ── closeGridConfig ───────────────────────────────────────────────────────
  // Order: stage transform → render lifecycle → bg html
  Hooks.on("closeGridConfig", CanvasTransform.onCloseGridConfig);
  Hooks.on("closeGridConfig", onGridConfigClose);
  Hooks.on("closeGridConfig", BgHtml.onCloseGridConfig);

  // ── closeSceneConfig ──────────────────────────────────────────────────────
  Hooks.on("closeSceneConfig", CanvasTransform.onCloseSceneConfig);

  // ── closeTokenConfig ──────────────────────────────────────────────────────
  Hooks.on("closeTokenConfig", onCloseTokenConfig);

  // ── createScene ───────────────────────────────────────────────────────────
  Hooks.on("createScene", PresetManager.onCreateScene);

  // ── deleteWall ────────────────────────────────────────────────────────────
  Hooks.on("deleteWall", WallManager.onDeleteWall);

  // ── preUpdateScene ────────────────────────────────────────────────────────
  Hooks.on("preUpdateScene", onPreUpdateScene);

  // ── ready ─────────────────────────────────────────────────────────────────
  Hooks.once("ready", PresetManager.onReady);

  // ── renderGridConfig ──────────────────────────────────────────────────────
  // Order: stage transform preview → render lifecycle grid config state → bg html injection
  Hooks.on("renderGridConfig", CanvasTransform.onRenderGridConfig);
  Hooks.on("renderGridConfig", (app: Application) => onGridConfigOpen(app));
  Hooks.on(
    "renderGridConfig",
    (app: { _processSubmitData?: (...a: unknown[]) => Promise<unknown> }, html: HTMLElement) =>
      BgHtml.onRenderGridConfig(app, html),
  );

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

  // ── updateWall ───────────────────────────────────────────────────────────
  Hooks.on("updateWall", WallManager.onUpdateWall);
}
