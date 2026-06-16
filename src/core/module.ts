import "../../styles/isoroll.scss";
import { registerVolumeSettings } from "./settings";
import { VolumeOverlay, VolumeGizmos } from "../tiles";
import { TokenBackground, TokenGizmos } from "../tokens";
import { Occluder } from "../occluder";
import { CanvasTransform, ObjectTransform, registerRulerPatch } from "../transform";
import { BackgroundGizmos } from "../background";
import { registerSceneConfigHook, registerTileConfigHook, registerTokenConfigHook } from "../ui";
import { TileHud, TokenHud } from "../hud";
import { PresetManager } from "../preset";
import { WallManager, WallOverlay } from "../walls";
import { LayerManager, LAYER_KEYS, IsoSpriteLayer, RenderGate } from "../render";
import type { TokenRenderer, TileRenderer } from "../render";

Hooks.once("init", () => {
  registerVolumeSettings();
  registerSceneConfigHook();
  registerTokenConfigHook();
  registerTileConfigHook();
  registerRulerPatch();
  CanvasTransform.activate();
  BackgroundGizmos.activate();
  TileHud.activate();
  TokenHud.activate();
  ObjectTransform.activate();
  Occluder.activate();
  PresetManager.activate();
  WallManager.activate();

  const gate = new RenderGate();
  gate
    .registerToken(IsoSpriteLayer.token)
    .registerToken(TokenBackground as unknown as TokenRenderer)
    .registerToken(TokenGizmos     as unknown as TokenRenderer)
    .registerTile(IsoSpriteLayer.tile)
    .registerTile(VolumeOverlay    as unknown as TileRenderer)
    .registerTile(VolumeGizmos     as unknown as TileRenderer)
    .registerTile(WallOverlay      as unknown as TileRenderer);
  gate.activate();
  IsoSpriteLayer.activate(); // ticker + layer infrastructure only

  LayerManager.declareOrder([
    LAYER_KEYS.ISO_SPRITE_LAYER,
    LAYER_KEYS.TILE_SHADOW,
    LAYER_KEYS.TOKEN_SHADOW,
    LAYER_KEYS.VOLUME_OVERLAY, LAYER_KEYS.VOLUME_GIZMOS,
    LAYER_KEYS.TOKEN_VOLUME_GIZMOS, LAYER_KEYS.TOKEN_GIZMOS,
    LAYER_KEYS.BG_GIZMOS,
    LAYER_KEYS.WALL_OVERLAY,
  ]);

  console.log("isoroll | initialized");
});
