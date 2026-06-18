// Registers the isoroll Iso tab in the TokenConfig AppV2 sheet.

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { TokenBackground, TokenGizmos } from "../tokens";
import { addIsorollTab, flagCheckbox, flagNumber, flagSelect } from "./tab-helpers";

type ConfigApp = { document: { id?: string } };
const getCanvasToken = (id: string) => CanvasEnv.getToken(id);

export function registerTokenConfigHook(): void {
  // Track config-open so renderers show gizmos / keep label bright even when token is deselected.
  Hooks.on("renderTokenConfig", (app: ConfigApp) => {
    const id = app.document?.id; if (!id || !VolumeFlags.isSceneEnabled()) return;
    const token = getCanvasToken(id); if (!token) return;
    TokenGizmos.setConfigOpen(token, true);
    TokenBackground.setConfigOpen(token, true);
  });
  Hooks.on("closeTokenConfig", (app: ConfigApp) => {
    const id = app.document?.id; if (!id) return;
    const token = getCanvasToken(id);
    if (token) { TokenGizmos.setConfigOpen(token, false); TokenBackground.setConfigOpen(token, false); }
    else { TokenGizmos.configOpen.delete(id); TokenBackground.configOpen.delete(id); }
  });

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
        flagCheckbox("showImageManipulation",  "TokenConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
        flagCheckbox("showVolumeManipulation", "TokenConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false, 'style="white-space:nowrap"') +
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
        `</fieldset>`,
        ($h) => {
          // Live preview: update flag with render:false to avoid resetting the active tab.
          // RenderGate's updateToken hook picks up the change and calls rebuild() directly.
          type DocLike = { update(data: Record<string, unknown>, opts?: { render?: boolean }): Promise<unknown> };
          const setFlag = (key: string, val: unknown) => {
            (d as unknown as DocLike).update({ [`flags.${MODULE_ID}.${key}`]: val }, { render: false }).catch(() => {});
          };
          $h.on("change", `[name^='flags.${MODULE_ID}.']`, (e) => {
            const el = e.target as HTMLInputElement | HTMLSelectElement;
            const key = el.name.slice(`flags.${MODULE_ID}.`.length);
            const val: unknown = el.type === "checkbox" ? (el as HTMLInputElement).checked
                               : el.type === "number"   ? parseFloat((el as HTMLInputElement).value)
                               : el.value;
            setFlag(key, val);
          });
          // Disable dependent controls when parent checkbox is unchecked
          const toggleGroup = (cbId: string, ...deps: string[]) => {
            const upd = () => $h.find(deps.map(i => `#${i}`).join(",")).prop("disabled", !$h.find(`#${cbId}`).prop("checked"));
            $h.on("change", `#${cbId}`, upd); upd();
          };
          toggleGroup("isoroll-shadowEnabled",  "isoroll-shadowShape",    "isoroll-shadowRadius",  "isoroll-shadowOpacity");
          toggleGroup("isoroll-elevLineEnabled", "isoroll-elevLineDashed", "isoroll-elevLineColor");
        });
    },
  );
}
