// HTML builders for the scene-config Isoroll tab panel.

import { MODULE_ID } from "../core";
import { PROJECTION_TYPES } from "../transform";

export type SceneDoc = { getFlag: (m: string, k: string) => unknown };
export type SceneFlags = {
  enabled: boolean; transformBg: boolean;
  projection: string; cRot: number; cSkX: number; cSkY: number; cRatio: number;
};

// Build projection <option> labels using per-key localization.
// Each key's label is computed individually to avoid multi-call statements.
export const PROJ_KEYS = ["dimetric_2_1", "true_iso", "overhead", "proj_3_2", "diablo", "torment", "hades", "custom"];
export const PROJ_LOC_KEYS: Record<string, string> = {
  dimetric_2_1: "ISOROLL.Projection.Dimetric21",
  true_iso:     "ISOROLL.Projection.TrueIso",
  overhead:     "ISOROLL.Projection.Overhead",
  proj_3_2:     "ISOROLL.Projection.Proj32",
  diablo:       "ISOROLL.Projection.Diablo",
  torment:      "ISOROLL.Projection.Torment",
  hades:        "ISOROLL.Projection.Hades",
  custom:       "ISOROLL.Projection.Custom",
};

function projOptionHtml(k: string, currentKey: string): string {
  const locKey  = PROJ_LOC_KEYS[k] ?? k;
  const lbl     = game.i18n.localize(locKey);
  const active  = k === (currentKey || "dimetric_2_1");
  const sel     = active ? " selected" : "";
  return `<option value="${k}"${sel}>${lbl}</option>`;
}

function projectionOptions(currentKey: string): string {
  const keys  = Object.keys(PROJECTION_TYPES);
  const parts = keys.map((k) => projOptionHtml(k, currentKey));
  return parts.join("");
}

export function readSceneFlags(doc: SceneDoc): SceneFlags {
  const rawEnabled = doc.getFlag(MODULE_ID, "enabled");
  const rawBg      = doc.getFlag(MODULE_ID, "transformBackground");
  const rawProj    = doc.getFlag(MODULE_ID, "projection");
  const rawRot     = doc.getFlag(MODULE_ID, "customRotation");
  const rawSkX     = doc.getFlag(MODULE_ID, "customSkewX");
  const rawSkY     = doc.getFlag(MODULE_ID, "customSkewY");
  const rawRatio   = doc.getFlag(MODULE_ID, "customRatio");
  return {
    enabled:     rawEnabled === true,
    transformBg: rawBg      === true,
    projection:  (typeof rawProj  === "string" ? rawProj  : undefined) ?? "dimetric_2_1",
    cRot:        (typeof rawRot   === "number" ? rawRot   : undefined) ?? -45,
    cSkX:        (typeof rawSkX   === "number" ? rawSkX   : undefined) ?? 18.435,
    cSkY:        (typeof rawSkY   === "number" ? rawSkY   : undefined) ?? 18.435,
    cRatio:      (typeof rawRatio === "number" ? rawRatio : undefined) ?? 2.0,
  };
}

function buildCustomHtml(f: SceneFlags): string {
  const i18n     = game.i18n;
  const loc      = i18n.localize.bind(i18n);
  const lblRot   = loc("ISOROLL.SceneConfig.CustomRotation");
  const lblSkX   = loc("ISOROLL.SceneConfig.CustomSkewX");
  const lblSkY   = loc("ISOROLL.SceneConfig.CustomSkewY");
  const lblRatio = loc("ISOROLL.SceneConfig.CustomRatio");
  return (
    `<div class="form-group"><label for="isoroll-customRotation">${lblRot}</label>` +
    `<div class="form-fields">` +
    `<input type="number" id="isoroll-customRotation" step="0.001" name="flags.${MODULE_ID}.customRotation" value="${f.cRot}">` +
    `</div></div>` +
    `<div class="form-group"><label for="isoroll-customSkewX">${lblSkX}</label>` +
    `<div class="form-fields">` +
    `<input type="number" id="isoroll-customSkewX" step="0.001" name="flags.${MODULE_ID}.customSkewX" value="${f.cSkX}">` +
    `</div></div>` +
    `<div class="form-group"><label for="isoroll-customSkewY">${lblSkY}</label>` +
    `<div class="form-fields">` +
    `<input type="number" id="isoroll-customSkewY" step="0.001" name="flags.${MODULE_ID}.customSkewY" value="${f.cSkY}">` +
    `</div></div>` +
    `<div class="form-group"><label for="isoroll-customRatio">${lblRatio}</label>` +
    `<div class="form-fields">` +
    `<input type="number" id="isoroll-customRatio" step="0.001" min="0.1" name="flags.${MODULE_ID}.customRatio" value="${f.cRatio}">` +
    `</div></div>`
  );
}

export function buildSceneHtml(f: SceneFlags): string {
  const i18n       = game.i18n;
  const loc        = i18n.localize.bind(i18n);
  const lblEnable  = loc("ISOROLL.SceneConfig.Enable");
  const hintEnable = loc("ISOROLL.SceneConfig.EnableHint");
  const lblTrans   = loc("ISOROLL.SceneConfig.TransformationsHeading");
  const lblProj    = loc("ISOROLL.SceneConfig.Projection");
  const hintProj   = loc("ISOROLL.SceneConfig.ProjectionHint");
  const lblBg      = loc("ISOROLL.SceneConfig.TransformBackground");
  const hintBg     = loc("ISOROLL.SceneConfig.TransformBackgroundHint");
  const customVis  = f.projection === "custom" ? "" : 'style="display:none"';
  const checkedEn  = f.enabled     ? "checked" : "";
  const checkedBg  = f.transformBg ? "checked" : "";
  const projOpts   = projectionOptions(f.projection);
  const customFld  = buildCustomHtml(f);
  return (
    `<div class="form-group"><label for="isoroll-enabled">${lblEnable}</label>` +
    `<div class="form-fields"><input type="checkbox" id="isoroll-enabled" name="flags.${MODULE_ID}.enabled" ${checkedEn}></div>` +
    `<p class="hint">${hintEnable}</p></div>` +
    `<fieldset><legend>${lblTrans}</legend>` +
    `<div class="form-group"><label for="isoroll-projection">${lblProj}</label>` +
    `<div class="form-fields"><select id="isoroll-projection" name="flags.${MODULE_ID}.projection" class="isoroll-projection-select">${projOpts}</select></div>` +
    `<p class="hint">${hintProj}</p></div>` +
    `<div class="isoroll-custom-fields" ${customVis}>${customFld}</div>` +
    `<div class="form-group"><label for="isoroll-transformBackground">${lblBg}</label>` +
    `<div class="form-fields"><input type="checkbox" id="isoroll-transformBackground" name="flags.${MODULE_ID}.transformBackground" ${checkedBg}></div>` +
    `<p class="hint">${hintBg}</p></div>` +
    `</fieldset>`
  );
}
