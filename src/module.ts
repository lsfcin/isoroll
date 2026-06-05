import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./settings";
import { VolumeOverlay } from "./tiles/tile-overlay";
import { VolumeGizmos } from "./tiles/tile-gizmos";
import { TokenOverlay } from "./tokens/token-overlay";
import { TokenGizmos } from "./tokens/token-gizmos";
import { TokenElevGizmo } from "./tokens/token-elev-gizmo";
import { Occluder } from "./occluder/occluder";
import { CanvasTransform } from "./transform/stage-transform";
import { BackgroundGizmos } from "./background/bg-gizmos";
import { ObjectTransform } from "./transform/object-transform";
import { registerSceneConfigHook } from "./ui/scene-config";
import { registerTileConfigHook } from "./ui/tile-config";
import { registerRulerPatch } from "./transform/ruler-patch";
import { registerTokenConfigHook } from "./ui/token-config";
import { TileHud } from "./hud/tile-hud";
import { TokenHud } from "./hud/token-hud";
import { PresetManager } from "./preset/preset-manager";
import { WallManager } from "./walls/wall-manager";
import { WallOverlay } from "./walls/wall-overlay";
import { LayerManager, LAYER_KEYS } from "./render/layer-manager";

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
