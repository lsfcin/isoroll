// HTML builders for the tile-config Isoroll tab panel.

import { MODULE_ID, VolumeFlags } from "../core";
import { flagCheckbox, flagNumber, flagSelect } from "./tab-helpers";
import { WallManager } from "../walls";

export function buildWallSection(d: TileDocument): string {
  const t        = (k: string) => game.i18n.localize(k);
  const wallCnt  = WallManager.getLinkedWallIds(d).length;
  const lblWalls = t("ISOROLL.TileConfig.WallsHeading");
  const lblLink  = t("ISOROLL.TileConfig.LinkedWalls");
  const ttlGen   = t("ISOROLL.WallManager.GenerateBase");
  const ttlSel   = t("ISOROLL.WallManager.SelectWalls");
  const ttlUnl   = t("ISOROLL.WallManager.UnlinkAll");
  const ttlDel   = t("ISOROLL.WallManager.DeleteLinked");
  return (
    `<fieldset><legend>${lblWalls}</legend>` +
    `<div class="form-group"><label>${lblLink}: <b class="isoroll-wall-count">${wallCnt}</b></label>` +
    `<div class="form-fields" style="gap:4px">` +
    `<button type="button" class="isoroll-gen-walls-btn" title="${ttlGen}"><i class="fas fa-border-all"></i></button>` +
    `<button type="button" class="isoroll-select-walls-btn" title="${ttlSel}"><i class="fas fa-mouse-pointer"></i></button>` +
    `<button type="button" class="isoroll-unlink-walls-btn" title="${ttlUnl}"><i class="fas fa-unlink"></i></button>` +
    `<button type="button" class="isoroll-delete-walls-btn" title="${ttlDel}"><i class="fas fa-trash-alt"></i></button>` +
    `</div></div></fieldset>`
  );
}

function buildDoorSectionInner(d: TileDocument): string {
  const t      = (k: string) => game.i18n.localize(k);
  const beh    = WallManager.getDoorBehavior(d);
  const fo     = beh.mode === "fade" ? beh.opacity : 0.2;
  const lblDH  = t("ISOROLL.TileConfig.DoorHeading");
  const lblDM  = t("ISOROLL.TileConfig.DoorMode");
  const optN   = t("ISOROLL.TileConfig.DoorModeNone");
  const optH   = t("ISOROLL.TileConfig.DoorModeHide");
  const optF   = t("ISOROLL.TileConfig.DoorModeFade");
  const lblFO  = t("ISOROLL.TileConfig.DoorFadeOpacity");
  const hideFG = beh.mode !== "fade" ? ' style="display:none"' : "";
  return (
    `<fieldset><legend>${lblDH}</legend>` +
    `<div class="form-group"><label>${lblDM}</label>` +
    `<div class="form-fields"><select class="isoroll-door-mode-sel">` +
    `<option value="none"${beh.mode === "none" ? " selected" : ""}>${optN}</option>` +
    `<option value="hide"${beh.mode === "hide" ? " selected" : ""}>${optH}</option>` +
    `<option value="fade"${beh.mode === "fade" ? " selected" : ""}>${optF}</option>` +
    `</select></div></div>` +
    `<div class="form-group isoroll-fade-grp"${hideFG}><label>${lblFO}</label>` +
    `<div class="form-fields"><input type="number" class="isoroll-fade-opacity" min="0" max="1" step="0.05" value="${fo}"></div>` +
    `</div></fieldset>`
  );
}

export function buildDoorSection(d: TileDocument): string {
  let result = "";
  if (WallManager.hasLinkedDoor(d)) {
    result = buildDoorSectionInner(d);
  }
  return result;
}

export function readTileFlags(d: TileDocument): {
  transformTile: boolean; foregroundTile: boolean;
  showImage: boolean; showVolume: boolean; presetEnabled: boolean;
} {
  const rawTt  = d.getFlag(MODULE_ID, "transformTile");
  const rawFg  = d.getFlag(MODULE_ID, "foregroundTile");
  const rawImg = d.getFlag(MODULE_ID, "showImageManipulation");
  const rawVol = d.getFlag(MODULE_ID, "showVolumeManipulation");
  const rawPre = d.getFlag(MODULE_ID, "presetEnabled");
  return {
    transformTile:  rawTt  === true,
    foregroundTile: rawFg  !== false,
    showImage:      rawImg !== false,
    showVolume:     rawVol !== false,
    presetEnabled:  rawPre !== false,
  };
}

export function buildTileTabHtml(d: TileDocument): string {
  const t         = (k: string) => game.i18n.localize(k);
  const lblTrans  = t("ISOROLL.TileConfig.TransformationHeading");
  const lblManip  = t("ISOROLL.TileConfig.ManipulationHeading");
  const lblShadow = t("ISOROLL.TileConfig.ShadowHeading");
  const lblFog    = t("ISOROLL.TileConfig.FogHeading");
  const lblPreset = t("ISOROLL.TileConfig.PresetHeading");
  const f         = readTileFlags(d);
  const chkTt     = flagCheckbox("transformTile",          "TileConfig", f.transformTile);
  const chkFg     = flagCheckbox("foregroundTile",         "TileConfig", f.foregroundTile);
  const chkImg    = flagCheckbox("showImageManipulation",  "TileConfig", f.showImage);
  const chkVol    = flagCheckbox("showVolumeManipulation", "TileConfig", f.showVolume, 'style="white-space:nowrap"');
  const shadowEn  = VolumeFlags.getShadowEnabled(d, false);
  const shadowSh  = VolumeFlags.getShadowShape(d, "rect");
  const shadowRad = VolumeFlags.getShadowRadius(d);
  const shadowOp  = VolumeFlags.getShadowOpacity(d, 0.5);
  const fogHide   = VolumeFlags.getHideOnFog(d);
  const circleLbl = t("ISOROLL.ShadowShape.Circle");
  const rectLbl   = t("ISOROLL.ShadowShape.Rect");
  const chkShdEn  = flagCheckbox("shadowEnabled", "TileConfig", shadowEn);
  const selShdSh  = flagSelect("shadowShape", "TileConfig", shadowSh, [
    { value: "circle", label: circleLbl },
    { value: "rect",   label: rectLbl },
  ]);
  const numRad    = flagNumber("shadowRadius",  "TileConfig", shadowRad, 0.1, 4.0, 0.1);
  const numOp     = flagNumber("shadowOpacity", "TileConfig", shadowOp,  0.0, 1.0, 0.05);
  const chkFog    = flagCheckbox("hideOnFog",     "TileConfig", fogHide);
  const chkPre    = flagCheckbox("presetEnabled", "TileConfig", f.presetEnabled);
  const wallSec   = buildWallSection(d);
  const doorSec   = buildDoorSection(d);
  return (
    `<fieldset><legend>${lblTrans}</legend>${chkTt}${chkFg}</fieldset>` +
    `<fieldset><legend>${lblManip}</legend>${chkImg}${chkVol}</fieldset>` +
    `<fieldset><legend>${lblShadow}</legend>${chkShdEn}${selShdSh}${numRad}${numOp}</fieldset>` +
    `<fieldset><legend>${lblFog}</legend>${chkFog}</fieldset>` +
    `<fieldset><legend>${lblPreset}</legend>${chkPre}</fieldset>` +
    wallSec + doorSec
  );
}
