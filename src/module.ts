import "../styles/isoroll.scss";
import { registerVolumeSettings } from "./volume/settings";
import { VolumeFlags } from "./volume/flags";
import { DepthSorter } from "./sorter/depth-sorter";
import { Occluder } from "./occluder/occluder";

Hooks.once("init", () => {
  registerVolumeSettings();
  VolumeFlags.register();
  console.log("isoroll | initialized");
});

Hooks.once("ready", () => {
  DepthSorter.activate();
  Occluder.activate();
  console.log("isoroll | ready");
});
