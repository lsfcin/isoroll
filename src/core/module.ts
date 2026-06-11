import "../../styles/isoroll.scss";
import { registerVolumeSettings } from "./settings";
import { VolumeOverlay, VolumeGizmos } from "../tiles";
import { TokenOverlay, TokenGizmos, TokenElevGizmo } from "../tokens";
import { Occluder } from "../occluder";
import { CanvasTransform, ObjectTransform, registerRulerPatch } from "../transform";
import { BackgroundGizmos } from "../background";
import { registerSceneConfigHook, registerTileConfigHook, registerTokenConfigHook } from "../ui";
import { TileHud, TokenHud } from "../hud";
import { PresetManager } from "../preset";
import { WallManager, WallOverlay } from "../walls";
import { LayerManager, LAYER_KEYS } from "../render";

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
  VolumeOverlay.activate();
  VolumeGizmos.activate();
  TokenOverlay.activate();
  TokenGizmos.activate();
  TokenElevGizmo.activate();
  Occluder.activate();
  PresetManager.activate();
  WallManager.activate();
  LayerManager.declareOrder([
    LAYER_KEYS.TOKEN_SHADOW,
    LAYER_KEYS.VOLUME_OVERLAY, LAYER_KEYS.VOLUME_GIZMOS,
    LAYER_KEYS.TOKEN_OVERLAY,
    LAYER_KEYS.TOKEN_GIZMOS,   LAYER_KEYS.TOKEN_VOLUME_GIZMOS,
    LAYER_KEYS.BG_GIZMOS,
    LAYER_KEYS.WALL_OVERLAY,
  ]);
  Hooks.on("renderGridConfig", () => {
    VolumeOverlay.clearAll();
    VolumeGizmos.clearAll();
    TokenOverlay.clearAll();
    TokenGizmos.clearAll();
    TokenElevGizmo.clearAll();
    WallOverlay.clearAll();
  });

  console.log("isoroll | initialized");
});
