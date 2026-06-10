import { MODULE_ID } from "./flags";

export function registerVolumeSettings(): void {
  game.settings.register(MODULE_ID, "defaultTokenHeight", {
    name: "ISOROLL.Settings.DefaultTokenHeight.Name",
    hint: "ISOROLL.Settings.DefaultTokenHeight.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0.5, max: 10, step: 0.5 },
  });

  game.settings.register(MODULE_ID, "occlusionOpacity", {
    name: "ISOROLL.Settings.OcclusionOpacity.Name",
    hint: "ISOROLL.Settings.OcclusionOpacity.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0.2,
    range: { min: 0, max: 1, step: 0.05 },
  });
}
