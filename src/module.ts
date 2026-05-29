import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./volume/settings";
import { VolumeOverlay } from "./volume/overlay";
import { VolumeGizmos } from "./volume/gizmos";
import { Occluder } from "./occluder/occluder";
import { CanvasTransform } from "./transform/canvas-transform";
import { ObjectTransform } from "./transform/object-transform";
import { registerSceneConfigHook, registerTokenConfigHook, registerTileConfigHook } from "./transform/scene-config";

Hooks.once("init", () => {
  registerVolumeSettings();
  registerSceneConfigHook();
  registerTokenConfigHook();
  registerTileConfigHook();
  CanvasTransform.activate();
  ObjectTransform.activate();
  VolumeOverlay.activate();
  VolumeGizmos.activate();
  Occluder.activate();
  console.log("isoroll | initialized");
});
