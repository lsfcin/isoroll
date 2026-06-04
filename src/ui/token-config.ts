// Registers the isoroll Iso tab in the TokenConfig AppV2 sheet.
import { MODULE_ID } from "../flags";
import { addIsorollTab, flagCheckbox } from "./tab-helpers";

export function registerTokenConfigHook(): void {
  Hooks.on("renderTokenConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const d = app.document;
      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
        `<legend>${game.i18n.localize("ISOROLL.TokenConfig.Heading")}</legend>` +
        flagCheckbox("transformToken",         "TokenConfig", d.getFlag(MODULE_ID, "transformToken")         === true) +
        flagCheckbox("showImageManipulation",  "TokenConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
        flagCheckbox("showVolumeManipulation", "TokenConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false) +
        flagCheckbox("presetEnabled",          "TokenConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false));
    },
  );
}
