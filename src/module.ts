import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./volume/settings";
import { Occluder } from "./occluder/occluder";
import { CanvasTransform } from "./transform/canvas-transform";
import { registerSceneConfigHook } from "./transform/scene-config";

Hooks.once("init", () => {
  registerVolumeSettings();
  registerSceneConfigHook();
  CanvasTransform.activate();
  Occluder.activate();
  console.log("isoroll | initialized");
});
