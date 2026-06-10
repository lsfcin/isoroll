
import { MODULE_ID } from "../core";
import { CanvasTransform, getProjection, PROJECTION_TYPES } from "../transform";
import { addIsorollTab } from "./tab-helpers";

function projectionOptions(currentKey: string): string {
  const labels: Record<string, string> = {
    dimetric_2_1: game.i18n.localize("ISOROLL.Projection.Dimetric21"),
    true_iso:     game.i18n.localize("ISOROLL.Projection.TrueIso"),
    overhead:     game.i18n.localize("ISOROLL.Projection.Overhead"),
    proj_3_2:     game.i18n.localize("ISOROLL.Projection.Proj32"),
    diablo:       game.i18n.localize("ISOROLL.Projection.Diablo"),
    torment:      game.i18n.localize("ISOROLL.Projection.Torment"),
    hades:        game.i18n.localize("ISOROLL.Projection.Hades"),
    custom:       game.i18n.localize("ISOROLL.Projection.Custom"),
  };
  return Object.keys(PROJECTION_TYPES)
    .map((k) => {
      const sel = k === (currentKey || "dimetric_2_1") ? " selected" : "";
      return `<option value="${k}"${sel}>${labels[k] ?? k}</option>`;
    })
    .join("");
}

export function registerSceneConfigHook(): void {
  Hooks.on("renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const doc = app.document;
      // Sanitize with strict checks: prior bad saves may store arrays as "false,false,false" etc.
      const enabled     = doc.getFlag(MODULE_ID, "enabled")            === true;
      const transformBg = doc.getFlag(MODULE_ID, "transformBackground") === true;
      const rawProj  = doc.getFlag(MODULE_ID, "projection");
      const rawRot   = doc.getFlag(MODULE_ID, "customRotation");
      const rawSkX   = doc.getFlag(MODULE_ID, "customSkewX");
      const rawSkY   = doc.getFlag(MODULE_ID, "customSkewY");
      const rawRatio = doc.getFlag(MODULE_ID, "customRatio");
      const projection = (typeof rawProj  === "string" ? rawProj  : undefined) ?? "dimetric_2_1";
      const cRot   = (typeof rawRot   === "number" ? rawRot   : undefined) ?? -45;
      const cSkX   = (typeof rawSkX   === "number" ? rawSkX   : undefined) ?? 18.435;
      const cSkY   = (typeof rawSkY   === "number" ? rawSkY   : undefined) ?? 18.435;
      const cRatio = (typeof rawRatio === "number" ? rawRatio : undefined) ?? 2.0;
      const customVisible = projection === "custom" ? "" : 'style="display:none"';

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"), `
          <div class="form-group">
            <label for="isoroll-enabled">${game.i18n.localize("ISOROLL.SceneConfig.Enable")}</label>
            <div class="form-fields">
              <input type="checkbox" id="isoroll-enabled" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.EnableHint")}</p>
          </div>
          <fieldset>
            <legend>${game.i18n.localize("ISOROLL.SceneConfig.TransformationsHeading")}</legend>
            <div class="form-group">
              <label for="isoroll-projection">${game.i18n.localize("ISOROLL.SceneConfig.Projection")}</label>
              <div class="form-fields">
                <select id="isoroll-projection" name="flags.${MODULE_ID}.projection" class="isoroll-projection-select">
                  ${projectionOptions(projection)}
                </select>
              </div>
              <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.ProjectionHint")}</p>
            </div>
            <div class="isoroll-custom-fields" ${customVisible}>
              <div class="form-group">
                <label for="isoroll-customRotation">${game.i18n.localize("ISOROLL.SceneConfig.CustomRotation")}</label>
                <div class="form-fields">
                  <input type="number" id="isoroll-customRotation" step="0.001" name="flags.${MODULE_ID}.customRotation" value="${cRot}">
                </div>
              </div>
              <div class="form-group">
                <label for="isoroll-customSkewX">${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewX")}</label>
                <div class="form-fields">
                  <input type="number" id="isoroll-customSkewX" step="0.001" name="flags.${MODULE_ID}.customSkewX" value="${cSkX}">
                </div>
              </div>
              <div class="form-group">
                <label for="isoroll-customSkewY">${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewY")}</label>
                <div class="form-fields">
                  <input type="number" id="isoroll-customSkewY" step="0.001" name="flags.${MODULE_ID}.customSkewY" value="${cSkY}">
                </div>
              </div>
              <div class="form-group">
                <label for="isoroll-customRatio">${game.i18n.localize("ISOROLL.SceneConfig.CustomRatio")}</label>
                <div class="form-fields">
                  <input type="number" id="isoroll-customRatio" step="0.001" min="0.1" name="flags.${MODULE_ID}.customRatio" value="${cRatio}">
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="isoroll-transformBackground">${game.i18n.localize("ISOROLL.SceneConfig.TransformBackground")}</label>
              <div class="form-fields">
                <input type="checkbox" id="isoroll-transformBackground" name="flags.${MODULE_ID}.transformBackground" ${transformBg ? "checked" : ""}>
              </div>
              <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.TransformBackgroundHint")}</p>
            </div>
          </fieldset>`,
        ($h) => {
          $h.on("change", `input[name="flags.${MODULE_ID}.enabled"]`, (event) => {
            if (!(event.target as HTMLInputElement).checked)
              $h.find(`input[name="flags.${MODULE_ID}.transformBackground"]`).prop("checked", false);
          });
          $h.on("change", ".isoroll-projection-select", (event) => {
            $h.find(".isoroll-custom-fields").toggle((event.target as HTMLSelectElement).value === "custom");
          });
          const num = (name: string): number | undefined => {
            const v = parseFloat($h.find(`input[name="flags.${MODULE_ID}.${name}"]`).val() as string);
            return isNaN(v) ? undefined : v;
          };
          const sync = () => {
            const projKey = ($h.find(".isoroll-projection-select").val() as string) || "dimetric_2_1";
            CanvasTransform.previewProjection = getProjection({
              getFlag: (_m: string, k: string): unknown => {
                if (k === "projection")     return projKey;
                if (k === "customRotation") return num("customRotation");
                if (k === "customSkewX")    return num("customSkewX");
                if (k === "customSkewY")    return num("customSkewY");
                if (k === "customRatio")    return num("customRatio");
                return undefined;
              },
            });
            CanvasTransform.previewOverride = {
              enabled: $h.find(`input[name="flags.${MODULE_ID}.enabled"]`).is(':checked'),
              transformBg: $h.find(`input[name="flags.${MODULE_ID}.transformBackground"]`).is(':checked'),
            };
            CanvasTransform.applyCurrentState(); CanvasTransform.refresh();
          };
          $h.on("change",
            `input[name="flags.${MODULE_ID}.enabled"], input[name="flags.${MODULE_ID}.transformBackground"], .isoroll-projection-select, input[name="flags.${MODULE_ID}.customRotation"], input[name="flags.${MODULE_ID}.customSkewX"], input[name="flags.${MODULE_ID}.customSkewY"], input[name="flags.${MODULE_ID}.customRatio"]`,
            sync);
        },
      );
    },
  );
}
