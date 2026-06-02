import { MODULE_ID } from "../volume/flags";
import { addIsorollTab, cbGroup } from "./scene-config";
import {
  getLinkedWallIds, generateBaseWalls, linkSelectedWalls,
  unlinkAllWalls, deleteLinkedWalls,
} from "../walls/wall-ops";

export function registerTileConfigHook(): void {
  Hooks.on("renderTileConfig", (app: { document: TileDocument }, html: JQuery) => {
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const d  = app.document;
    const t  = (k: string) => game.i18n.localize(k);
    const wc = getLinkedWallIds(d).length;

    const wallSection = `
      <fieldset><legend>${t("ISOROLL.TileConfig.WallsHeading")}</legend>
        <div class="form-group">
          <label>${t("ISOROLL.TileConfig.LinkedWalls")}</label>
          <div class="form-fields"><b class="isoroll-wall-count">${wc}</b></div>
        </div>
        <div class="form-group">
          <div class="form-fields" style="gap:4px;flex-wrap:wrap">
            <button type="button" class="isoroll-gen-walls-btn" title="${t("ISOROLL.WallManager.GenerateBase")}">
              <i class="fas fa-border-all"></i></button>
            <button type="button" class="isoroll-link-walls-btn" title="${t("ISOROLL.WallManager.LinkSelected")}">
              <i class="fas fa-link"></i></button>
            <button type="button" class="isoroll-unlink-walls-btn" title="${t("ISOROLL.WallManager.UnlinkAll")}">
              <i class="fas fa-unlink"></i></button>
            <button type="button" class="isoroll-delete-walls-btn" title="${t("ISOROLL.WallManager.DeleteLinked")}">
              <i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </fieldset>`;

    addIsorollTab($html, t("ISOROLL.TabLabel"),
      `<legend>${t("ISOROLL.TileConfig.Heading")}</legend>` +
      cbGroup("foregroundTile",        "TileConfig", d.getFlag(MODULE_ID, "foregroundTile")         !== false) +
      cbGroup("transformTile",         "TileConfig", d.getFlag(MODULE_ID, "transformTile")          === true) +
      cbGroup("showImageManipulation", "TileConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
      cbGroup("showVolumeManipulation","TileConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false) +
      cbGroup("presetEnabled",         "TileConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false) +
      wallSection,
      ($h) => {
        const refresh = () => $h.find(".isoroll-wall-count").text(getLinkedWallIds(d).length);
        const warn    = (msg: string) => ui.notifications?.warn(msg);
        const info    = (msg: string) => ui.notifications?.info(msg);

        $h.on("click", ".isoroll-gen-walls-btn",    () => generateBaseWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-unlink-walls-btn", () => unlinkAllWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-delete-walls-btn", () => deleteLinkedWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-link-walls-btn",   () => {
          linkSelectedWalls(d).then(n => {
            refresh();
            n > 0 ? info(game.i18n.format("ISOROLL.WallManager.LinkedN", { n }))
                  : warn(t("ISOROLL.WallManager.NoneSelected"));
          }).catch(console.warn);
        });
      });
  });
}
