// Registers the isoroll Iso tab in the TokenConfig AppV2 sheet.

import { MODULE_ID, VolumeFlags } from "../core";
import { addIsorollTab, flagCheckbox, flagNumber, flagSelect } from "./tab-helpers";

export function registerTokenConfigHook(): void {
  Hooks.on("renderTokenConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const d = app.document;
      const t = (k: string) => game.i18n.localize(k);
      addIsorollTab($html, t("ISOROLL.TabLabel"),
        `<fieldset><legend>${t("ISOROLL.TokenConfig.TransformationHeading")}</legend>` +
        flagCheckbox("transformToken", "TokenConfig", d.getFlag(MODULE_ID, "transformToken") === true) +
        `</fieldset>` +
        `<fieldset><legend>${t("ISOROLL.TokenConfig.ManipulationHeading")}</legend>` +
        flagCheckbox("showImageManipulation",   "TokenConfig", d.getFlag(MODULE_ID, "showImageManipulation")   !== false) +
        flagCheckbox("showVolumeManipulation",  "TokenConfig", d.getFlag(MODULE_ID, "showVolumeManipulation")  !== false) +
        flagCheckbox("showElevationUnselected", "TokenConfig", d.getFlag(MODULE_ID, "showElevationUnselected") !== false, 'style="white-space:nowrap"') +
        `</fieldset>` +
        `<fieldset><legend>${t("ISOROLL.TokenConfig.ShadowHeading")}</legend>` +
        flagCheckbox("shadowEnabled", "TokenConfig", VolumeFlags.getShadowEnabled(d)) +
        flagSelect("shadowShape", "TokenConfig", VolumeFlags.getShadowShape(d), [
          { value: "circle", label: t("ISOROLL.ShadowShape.Circle") },
          { value: "rect",   label: t("ISOROLL.ShadowShape.Rect") },
        ]) +
        flagNumber("shadowRadius",  "TokenConfig", VolumeFlags.getShadowRadius(d),  0.1, 4.0, 0.1) +
        flagNumber("shadowOpacity", "TokenConfig", VolumeFlags.getShadowOpacity(d), 0.0, 1.0, 0.05) +
        `</fieldset>` +
        `<fieldset><legend>${t("ISOROLL.TokenConfig.ElevLineHeading")}</legend>` +
        flagCheckbox("elevLineEnabled", "TokenConfig", VolumeFlags.getElevLineEnabled(d)) +
        flagCheckbox("elevLineDashed",  "TokenConfig", VolumeFlags.getElevLineDashed(d)) +
        flagSelect("elevLineColor", "TokenConfig", VolumeFlags.getElevLineColor(d), [
          { value: "black",  label: t("ISOROLL.ElevLineColor.Black") },
          { value: "player", label: t("ISOROLL.ElevLineColor.Player") },
        ]) +
        `</fieldset>` +
        `<fieldset><legend>${t("ISOROLL.TokenConfig.PresetHeading")}</legend>` +
        flagCheckbox("presetEnabled", "TokenConfig", d.getFlag(MODULE_ID, "presetEnabled") !== false) +
        `</fieldset>`);
    },
  );
}
