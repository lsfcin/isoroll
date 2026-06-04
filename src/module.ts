import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./volume/settings";
import { VolumeOverlay } from "./volume/overlay";
import { VolumeGizmos } from "./volume/gizmos";
import { TokenOverlay } from "./volume/token-overlay";
import { TokenGizmos } from "./volume/token-gizmos";
import { TokenVolumeOverlay } from "./volume/token-volume-overlay";
import { TokenVolumeGizmos } from "./volume/token-volume-gizmos";
import { Occluder } from "./occluder/occluder";
import { CanvasTransform } from "./transform/stage-transform";
import { BackgroundGizmos } from "./volume/background-gizmos";
import { ObjectTransform } from "./transform/object-transform";
import { registerSceneConfigHook, registerTileConfigHook, registerRulerPatch } from "./transform/scene-config";
import { registerTokenConfigHook } from "./ui/token-config";
import { HudPatches } from "./hud/hud-patches";
import { PresetManager } from "./preset/preset-manager";
import { WallManager } from "./walls/wall-manager";
import { LayerManager, LAYER_KEYS } from "./render/layer-manager";

Hooks.once("init", () => {
  registerVolumeSettings();
  registerSceneConfigHook();
  registerTokenConfigHook();
  registerTileConfigHook();
  registerRulerPatch();
  CanvasTransform.activate();
  BackgroundGizmos.activate();
  HudPatches.activate();
  ObjectTransform.activate();
  VolumeOverlay.activate();
  VolumeGizmos.activate();
  TokenOverlay.activate();
  TokenGizmos.activate();
  TokenVolumeOverlay.activate();
  TokenVolumeGizmos.activate();
  Occluder.activate();
  PresetManager.activate();
  WallManager.activate();
  LayerManager.declareOrder([
    LAYER_KEYS.VOLUME_OVERLAY, LAYER_KEYS.VOLUME_GIZMOS,
    LAYER_KEYS.TOKEN_OVERLAY,  LAYER_KEYS.TOKEN_VOLUME_OVERLAY,
    LAYER_KEYS.TOKEN_GIZMOS,   LAYER_KEYS.TOKEN_VOLUME_GIZMOS,
    LAYER_KEYS.BG_GIZMOS,
    LAYER_KEYS.WALL_OVERLAY,
  ]);
  console.log("isoroll | initialized");
});
