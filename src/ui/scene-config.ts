
import { MODULE_ID } from "../core";
import { CanvasTransform, getProjection } from "../transform";
import { addIsorollTab } from "./tab-helpers";
import {
  SceneDoc, PROJ_KEYS,
  readSceneFlags, buildSceneHtml,
} from "./scene-config-html";

export { PROJ_KEYS };

function numInput($h: JQuery, name: string): number | undefined {
  const $el  = $h.find(`input[name="flags.${MODULE_ID}.${name}"]`);
  const raw  = $el.val() as string;
  const v    = parseFloat(raw);
  let result: number | undefined;
  if (!isNaN(v)) {
    result = v;
  }
  return result;
}

function getFlagValue($h: JQuery, k: string, projKey: string): unknown {
  let result: unknown;
  if (k === "projection") {
    result = projKey;
  } else if (k === "customRotation") {
    result = numInput($h, "customRotation");
  } else if (k === "customSkewX") {
    result = numInput($h, "customSkewX");
  } else if (k === "customSkewY") {
    result = numInput($h, "customSkewY");
  } else if (k === "customRatio") {
    result = numInput($h, "customRatio");
  } else {
    result = undefined;
  }
  return result;
}

function syncPreview($h: JQuery): void {
  const $sel    = $h.find(".isoroll-projection-select");
  const selVal  = $sel.val() as string;
  const projKey = selVal || "dimetric_2_1";
  CanvasTransform.previewProjection = getProjection({
    getFlag: (_m: string, k: string): unknown => getFlagValue($h, k, projKey),
  });
  const $enCb     = $h.find(`input[name="flags.${MODULE_ID}.enabled"]`);
  const $bgCb     = $h.find(`input[name="flags.${MODULE_ID}.transformBackground"]`);
  const isEnabled = $enCb.is(":checked");
  const isBg      = $bgCb.is(":checked");
  CanvasTransform.previewOverride = { enabled: isEnabled, transformBg: isBg };
  CanvasTransform.applyCurrentState();
  CanvasTransform.refresh();
}

function bindSceneEvents($h: JQuery): void {
  const enName = `flags.${MODULE_ID}.enabled`;
  const bgName = `flags.${MODULE_ID}.transformBackground`;
  $h.on("change", `input[name="${enName}"]`, (event) => {
    const checked = (event.target as HTMLInputElement).checked;
    if (!checked) {
      const $bg = $h.find(`input[name="${bgName}"]`);
      $bg.prop("checked", false);
    }
  });
  $h.on("change", ".isoroll-projection-select", (event) => {
    const isCustom = (event.target as HTMLSelectElement).value === "custom";
    const $custom  = $h.find(".isoroll-custom-fields");
    $custom.toggle(isCustom);
  });
  const syncParts = [
    `input[name="${enName}"]`,
    `input[name="${bgName}"]`,
    `.isoroll-projection-select`,
    `input[name="flags.${MODULE_ID}.customRotation"]`,
    `input[name="flags.${MODULE_ID}.customSkewX"]`,
    `input[name="flags.${MODULE_ID}.customSkewY"]`,
    `input[name="flags.${MODULE_ID}.customRatio"]`,
  ];
  const syncFields = syncParts.join(", ");
  $h.on("change", syncFields, () => syncPreview($h));
}

export function onRenderSceneConfig(
  app: { document: SceneDoc }, html: JQuery): void {
  const $html   = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
  const doc     = app.document;
  const flags   = readSceneFlags(doc);
  const label   = game.i18n.localize("ISOROLL.TabLabel");
  const tabHtml = buildSceneHtml(flags);
  addIsorollTab($html, label, tabHtml, ($h) => bindSceneEvents($h));
}
