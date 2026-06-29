// Registers the isoroll Iso tab in the TokenConfig AppV2 sheet.

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { TokenBackground, TokenGizmos } from "../tokens";
import { addIsorollTab, flagCheckbox, flagNumber, flagSelect } from "./tab-helpers";

type ConfigApp = { document: { id?: string } };
const getCanvasToken = (id: string) => CanvasEnv.getToken(id);

// Track config-open so renderers show gizmos / keep label bright even when token is deselected.
export function onRenderTokenConfigState(app: ConfigApp): void {
  const id = app.document?.id;
  if (id && VolumeFlags.isSceneEnabled()) {
    const token = getCanvasToken(id);
    if (token) {
      TokenGizmos.setConfigOpen(token, true);
      TokenBackground.setConfigOpen(token, true);
    }
  }
}

export function onCloseTokenConfig(app: ConfigApp): void {
  const id = app.document?.id;
  if (!id) {
    return;
  }
  const token = getCanvasToken(id);
  if (token) {
    TokenGizmos.setConfigOpen(token, false);
    TokenBackground.setConfigOpen(token, false);
  } else {
    TokenGizmos.configOpen.delete(id);
    TokenBackground.configOpen.delete(id);
  }
}

type FlagDoc = { getFlag: (m: string, k: string) => unknown };

function buildShadowElevHtml(d: FlagDoc): string {
  const t         = (k: string) => game.i18n.localize(k);
  const lblShadow = t("ISOROLL.TokenConfig.ShadowHeading");
  const lblElev   = t("ISOROLL.TokenConfig.ElevLineHeading");
  const shadowEn  = VolumeFlags.getShadowEnabled(d);
  const shadowSh  = VolumeFlags.getShadowShape(d);
  const shadowRad = VolumeFlags.getShadowRadius(d);
  const shadowOp  = VolumeFlags.getShadowOpacity(d);
  const elevEn    = VolumeFlags.getElevLineEnabled(d);
  const elevDash  = VolumeFlags.getElevLineDashed(d);
  const elevColor = VolumeFlags.getElevLineColor(d);
  const circleLbl = t("ISOROLL.ShadowShape.Circle");
  const rectLbl   = t("ISOROLL.ShadowShape.Rect");
  const blackLbl  = t("ISOROLL.ElevLineColor.Black");
  const playerLbl = t("ISOROLL.ElevLineColor.Player");
  const chkShdEn  = flagCheckbox("shadowEnabled", "TokenConfig", shadowEn);
  const selShdSh  = flagSelect("shadowShape", "TokenConfig", shadowSh, [
    { value: "circle", label: circleLbl },
    { value: "rect",   label: rectLbl },
  ]);
  const numRad    = flagNumber("shadowRadius",  "TokenConfig", shadowRad, 0.1, 4.0, 0.1);
  const numOp     = flagNumber("shadowOpacity", "TokenConfig", shadowOp,  0.0, 1.0, 0.05);
  const chkElvEn  = flagCheckbox("elevLineEnabled", "TokenConfig", elevEn);
  const chkElvDsh = flagCheckbox("elevLineDashed",  "TokenConfig", elevDash);
  const selElvClr = flagSelect("elevLineColor", "TokenConfig", elevColor, [
    { value: "black",  label: blackLbl },
    { value: "player", label: playerLbl },
  ]);
  return (
    `<fieldset><legend>${lblShadow}</legend>${chkShdEn}${selShdSh}${numRad}${numOp}</fieldset>` +
    `<fieldset><legend>${lblElev}</legend>${chkElvEn}${chkElvDsh}${selElvClr}</fieldset>`
  );
}

function buildTokenTabHtml(d: FlagDoc): string {
  const t        = (k: string) => game.i18n.localize(k);
  const lblTrans = t("ISOROLL.TokenConfig.TransformationHeading");
  const lblManip = t("ISOROLL.TokenConfig.ManipulationHeading");
  const lblPre   = t("ISOROLL.TokenConfig.PresetHeading");
  const rawTrans = d.getFlag(MODULE_ID, "transformToken");
  const rawImg   = d.getFlag(MODULE_ID, "showImageManipulation");
  const rawVol   = d.getFlag(MODULE_ID, "showVolumeManipulation");
  const rawPre   = d.getFlag(MODULE_ID, "presetEnabled");
  const chkTok   = flagCheckbox("transformToken",          "TokenConfig", rawTrans === true);
  const chkImg   = flagCheckbox("showImageManipulation",   "TokenConfig", rawImg   !== false);
  const chkVol   = flagCheckbox("showVolumeManipulation",  "TokenConfig", rawVol   !== false, 'style="white-space:nowrap"');
  const chkPre   = flagCheckbox("presetEnabled",           "TokenConfig", rawPre   !== false);
  const midHtml  = buildShadowElevHtml(d);
  return (
    `<fieldset><legend>${lblTrans}</legend>${chkTok}</fieldset>` +
    `<fieldset><legend>${lblManip}</legend>${chkImg}${chkVol}</fieldset>` +
    midHtml +
    `<fieldset><legend>${lblPre}</legend>${chkPre}</fieldset>`
  );
}

type DocLike = { update(data: Record<string, unknown>, opts?: { render?: boolean }): Promise<unknown> };

function bindTokenEvents($h: JQuery, d: FlagDoc): void {
  const setFlag = (key: string, val: unknown) => {
    const doc = d as unknown as DocLike;
    const p   = doc.update({ [`flags.${MODULE_ID}.${key}`]: val }, { render: false });
    p.catch(() => {});
  };
  $h.on("change", `[name^='flags.${MODULE_ID}.']`, (e) => {
    const el  = e.target as HTMLInputElement | HTMLSelectElement;
    const key = el.name.slice(`flags.${MODULE_ID}.`.length);
    let val: unknown;
    if (el.type === "checkbox") {
      val = (el as HTMLInputElement).checked;
    } else if (el.type === "number") {
      val = parseFloat((el as HTMLInputElement).value);
    } else {
      val = el.value;
    }
    setFlag(key, val);
  });
  const toggleGroup = (cbId: string, ...deps: string[]) => {
    const upd = () => {
      const $cb      = $h.find(`#${cbId}`);
      const checked  = $cb.prop("checked") as boolean;
      const parts    = deps.map(i => `#${i}`);
      const selector = parts.join(",");
      const $deps    = $h.find(selector);
      $deps.prop("disabled", !checked);
    };
    $h.on("change", `#${cbId}`, upd);
    upd();
  };
  toggleGroup("isoroll-shadowEnabled",  "isoroll-shadowShape",    "isoroll-shadowRadius",  "isoroll-shadowOpacity");
  toggleGroup("isoroll-elevLineEnabled", "isoroll-elevLineDashed", "isoroll-elevLineColor");
}

export function onRenderTokenConfigTab(
  app: { document: FlagDoc }, html: JQuery): void {
  const $html   = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
  const d       = app.document;
  const label   = game.i18n.localize("ISOROLL.TabLabel");
  const tabHtml = buildTokenTabHtml(d);
  addIsorollTab($html, label, tabHtml, ($h) => bindTokenEvents($h, d));
}
