import { MODULE_ID } from "../flags";
import { addIsorollTab, flagCheckbox } from "../ui/tab-helpers";
import type { DoorBehavior } from "../walls/wall-types";
import { WallManager } from "../walls/wall-manager";

export function registerTileConfigHook(): void {
  Hooks.on("renderTileConfig", (app: { document: TileDocument }, html: JQuery) => {
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const d  = app.document;
    const t  = (k: string) => game.i18n.localize(k);
    const wallCount = WallManager.getLinkedWallIds(d).length;

    const wallSection = `
      <fieldset><legend>${t("ISOROLL.TileConfig.WallsHeading")}</legend>
        <div class="form-group">
          <label>${t("ISOROLL.TileConfig.LinkedWalls")}: <b class="isoroll-wall-count">${wallCount}</b></label>
          <div class="form-fields" style="gap:4px">
            <button type="button" class="isoroll-gen-walls-btn" title="${t("ISOROLL.WallManager.GenerateBase")}"><i class="fas fa-border-all"></i></button>
            <button type="button" class="isoroll-select-walls-btn" title="${t("ISOROLL.WallManager.SelectWalls")}"><i class="fas fa-mouse-pointer"></i></button>
            <button type="button" class="isoroll-unlink-walls-btn" title="${t("ISOROLL.WallManager.UnlinkAll")}"><i class="fas fa-unlink"></i></button>
            <button type="button" class="isoroll-delete-walls-btn" title="${t("ISOROLL.WallManager.DeleteLinked")}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </fieldset>`;

    const doorSection = (() => {
      if (!WallManager.hasLinkedDoor(d)) return "";
      const beh = WallManager.getDoorBehavior(d);
      const fo  = beh.mode === "fade" ? beh.opacity : 0.2;
      return `
        <fieldset><legend>${t("ISOROLL.TileConfig.DoorHeading")}</legend>
          <div class="form-group">
            <label>${t("ISOROLL.TileConfig.DoorMode")}</label>
            <div class="form-fields">
              <select class="isoroll-door-mode-sel">
                <option value="none"${beh.mode === "none" ? " selected" : ""}>${t("ISOROLL.TileConfig.DoorModeNone")}</option>
                <option value="hide"${beh.mode === "hide" ? " selected" : ""}>${t("ISOROLL.TileConfig.DoorModeHide")}</option>
                <option value="fade"${beh.mode === "fade" ? " selected" : ""}>${t("ISOROLL.TileConfig.DoorModeFade")}</option>
              </select>
            </div>
          </div>
          <div class="form-group isoroll-fade-grp"${beh.mode !== "fade" ? ' style="display:none"' : ""}>
            <label>${t("ISOROLL.TileConfig.DoorFadeOpacity")}</label>
            <div class="form-fields"><input type="number" class="isoroll-fade-opacity" min="0" max="1" step="0.05" value="${fo}"></div>
          </div>
        </fieldset>`;
    })();

    addIsorollTab($html, t("ISOROLL.TabLabel"),
      flagCheckbox("foregroundTile",        "TileConfig", d.getFlag(MODULE_ID, "foregroundTile")         !== false) +
      flagCheckbox("transformTile",         "TileConfig", d.getFlag(MODULE_ID, "transformTile")          === true) +
      flagCheckbox("showImageManipulation", "TileConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
      flagCheckbox("showVolumeManipulation","TileConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false) +
      flagCheckbox("presetEnabled",         "TileConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false) +
      wallSection + doorSection,
      ($h) => {
        const refresh  = () => $h.find(".isoroll-wall-count").text(WallManager.getLinkedWallIds(d).length);
        const getTile  = () => (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(d.id ?? "");

        $h.on("click", ".isoroll-gen-walls-btn",    () => WallManager.generateBaseWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-unlink-walls-btn", () => WallManager.unlinkAllWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-delete-walls-btn", () => WallManager.deleteLinkedWalls(d).then(refresh).catch(console.warn));
        $h.on("click", ".isoroll-select-walls-btn", () => {
          const tile = getTile();
          if (!tile) return;
          if (WallManager.isSelectMode(tile.id)) WallManager.exitSelect(tile);
          else WallManager.enterSelect(tile);
        });
        $h.on("change", ".isoroll-door-mode-sel", (e) => {
          const mode = (e.target as HTMLSelectElement).value as "none" | "hide" | "fade";
          $h.find(".isoroll-fade-grp").toggle(mode === "fade");
          const opacity = parseFloat($h.find(".isoroll-fade-opacity").val() as string) || 0.2;
          const beh: DoorBehavior = mode === "fade" ? { mode, opacity } : { mode };
          WallManager.setDoorBehavior(d, beh).catch(console.warn);
        });
        $h.on("change", ".isoroll-fade-opacity", (e) => {
          const opacity = parseFloat((e.target as HTMLInputElement).value) || 0.2;
          WallManager.setDoorBehavior(d, { mode: "fade", opacity }).catch(console.warn);
        });
      });
  });
}
