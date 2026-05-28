import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./volume/settings";
import { VolumeFlags } from "./volume/flags";
import { DepthSorter } from "./sorter/depth-sorter";
import { Occluder } from "./occluder/occluder";
import { CanvasTransform } from "./transform/canvas-transform";
import { ObjectTransform } from "./transform/object-transform";
import { registerSceneConfigHook } from "./transform/scene-config";

Hooks.once("init", () => {
  registerVolumeSettings();
  VolumeFlags.register();
  registerSceneConfigHook();
  CanvasTransform.activate();
  ObjectTransform.activate();
  DepthSorter.activate();
  Occluder.activate();
  console.log("isoroll | initialized");
});
