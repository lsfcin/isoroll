// Registers the isoroll Iso tab in the TokenConfig AppV2 sheet.
import { MODULE_ID } from "../flags";
import { addIsorollTab, flagCheckbox } from "./tab-helpers";

export function registerTokenConfigHook(): void {
  Hooks.on("renderTokenConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const d = app.document;
      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
        `<fieldset><legend>${game.i18n.localize("ISOROLL.TokenConfig.TransformationHeading")}</legend>` +
        flagCheckbox("transformToken",         "TokenConfig", d.getFlag(MODULE_ID, "transformToken")         === true) +
        `</fieldset>` +
        `<fieldset><legend>${game.i18n.localize("ISOROLL.TokenConfig.ManipulationHeading")}</legend>` +
        flagCheckbox("showImageManipulation",     "TokenConfig", d.getFlag(MODULE_ID, "showImageManipulation")     !== false) +
        flagCheckbox("showVolumeManipulation",    "TokenConfig", d.getFlag(MODULE_ID, "showVolumeManipulation")    !== false) +
        flagCheckbox("showElevationUnselected",   "TokenConfig", d.getFlag(MODULE_ID, "showElevationUnselected")   !== false) +
        `</fieldset>` +
        `<fieldset><legend>${game.i18n.localize("ISOROLL.TokenConfig.PresetHeading")}</legend>` +
        flagCheckbox("presetEnabled",          "TokenConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false) +
        `</fieldset>`);
    },
  );
}
