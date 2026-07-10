import "../../styles/isoroll.scss";
import { registerVolumeSettings } from "./settings";
import { registerAllHooks } from "./hook-registry";
import { VolumeOverlay, VolumeGizmos } from "../tiles";
import { TokenBackground, TokenGizmos } from "../tokens";
import { CanvasTransform, registerRulerPatch } from "../transform";
import { BackgroundGizmos } from "../background";
import { TileHud, TokenHud } from "../hud";
import { WallManager, WallOverlay } from "../walls";
import { LayerManager, LAYER_KEYS, IsoSpriteLayer, RenderGate } from "../render";
import {
  debugSlices,
  debugGrid,
  debugZOrder,
  dumpZOrder,
  dumpZOrderJSON,
  scheduleDumpZOrder,
} from "../render";
import type { TokenRenderer, TileRenderer } from "../render";
import { importSceneManifest } from "../import";

function registerIsorollGlobal(): void {
  (globalThis as Record<string, unknown>).isoroll = {
    importSceneManifest,
    debugSlices,
    debugGrid,
    debugZOrder,
    dumpZOrder,
    dumpZOrderJSON,
    scheduleDumpZOrder,
  };
}

Hooks.once("init", () => {
  registerVolumeSettings();
  registerRulerPatch();
  CanvasTransform.activate(); // no-op: hooks registered below
  BackgroundGizmos.activate(); // BgHtml.setup() — must run before registerAllHooks
  TileHud.activate(); // no-op
  TokenHud.activate(); // no-op
  WallManager.activate(); // keydown listener + WallOverlay.activate()
  IsoSpriteLayer.activate(); // beforeunload listener

  const gate = new RenderGate();
  gate.registerToken(IsoSpriteLayer.token);
  gate.registerToken(TokenBackground as unknown as TokenRenderer);
  gate.registerToken(TokenGizmos as unknown as TokenRenderer);
  gate.registerTile(IsoSpriteLayer.tile);
  gate.registerTile(VolumeOverlay as unknown as TileRenderer);
  gate.registerTile(VolumeGizmos as unknown as TileRenderer);
  gate.registerTile(WallOverlay as unknown as TileRenderer);

  registerAllHooks();

  LayerManager.declareOrder([
    LAYER_KEYS.TILE_SHADOW,
    LAYER_KEYS.TOKEN_SHADOW,
    LAYER_KEYS.ISO_SPRITES,
    LAYER_KEYS.TILE_OVERLAY,
    LAYER_KEYS.TILE_GIZMOS,
    LAYER_KEYS.TOKEN_INDICATORS,
    LAYER_KEYS.TOKEN_GIZMOS,
    LAYER_KEYS.TOKEN_LABEL,
    LAYER_KEYS.BG_GIZMOS,
    LAYER_KEYS.WALL_OVERLAY,
  ]);

  registerIsorollGlobal();
  console.log("isoroll | initialized");
});
