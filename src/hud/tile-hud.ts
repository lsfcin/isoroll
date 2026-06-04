// TileHUD wall control buttons.
import { WallManager } from "../walls/wall-manager";
import {
  hudButton, clearIsorollHud, appendHudButtons,
  onHudAction, onHudToggle, updateHudButton,
} from "./hud-utils";

export class TileHud {
  static activate(): void {
    Hooks.on("renderTileHUD", TileHud.onRenderTileHUD);
  }

  private static onRenderTileHUD(hud: { object: Tile }, html: JQuery | HTMLElement): void {
    const tile = hud.object;
    if (!tile?.document) return;
    const $html     = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const doc       = tile.document;
    const wallCount = WallManager.getLinkedWallIds(doc).length;
    const loc       = (k: string) => game.i18n?.localize(k) ?? k;
    const inSel     = WallManager.isSelectMode(tile.id);

    const doorBtnHtml = WallManager.hasLinkedDoor(doc) ? (() => {
      const beh  = WallManager.getDoorBehavior(doc);
      const icon = { none: "fa-eye", hide: "fa-eye-slash", fade: "fa-adjust" }[beh.mode] ?? "fa-eye";
      const key  = { none: "DoorNone", hide: "DoorHide", fade: "DoorFade" }[beh.mode] ?? "DoorNone";
      return hudButton({ cls: "isoroll-door-mode", tooltip: loc("ISOROLL.WallManager." + key), icon });
    })() : "";

    clearIsorollHud($html, ".isoroll-gen-walls, .isoroll-select-walls, .isoroll-unlink-walls, .isoroll-delete-walls, .isoroll-door-mode");

    appendHudButtons($html, "right",
      hudButton({ cls: "isoroll-gen-walls",    tooltip: loc("ISOROLL.WallManager.GenerateBase"),  icon: "fa-border-all", badge: wallCount || undefined }) +
      hudButton({ cls: "isoroll-select-walls", tooltip: loc(inSel ? "ISOROLL.WallManager.DoneSelecting" : "ISOROLL.WallManager.SelectWalls"), icon: inSel ? "fa-check" : "fa-mouse-pointer", active: inSel }) +
      hudButton({ cls: "isoroll-unlink-walls", tooltip: loc("ISOROLL.WallManager.UnlinkAll"),    icon: "fa-unlink" }) +
      hudButton({ cls: "isoroll-delete-walls", tooltip: loc("ISOROLL.WallManager.DeleteLinked"), icon: "fa-trash-alt" }) +
      doorBtnHtml,
    );

    const rerender = () => (hud as unknown as { render(): void }).render();

    onHudAction($html, ".isoroll-gen-walls",    () => WallManager.generateBaseWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-unlink-walls", () => WallManager.unlinkAllWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-delete-walls", () => WallManager.deleteLinkedWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-door-mode",    () => WallManager.cycleDoorBehavior(doc).then(rerender));
    onHudToggle($html, ".isoroll-select-walls", (e) => {
      const $btn = $(e.currentTarget as HTMLElement);
      if (WallManager.isSelectMode(tile.id)) {
        WallManager.exitSelect(tile);
        updateHudButton($btn, { active: false, icon: "fa-mouse-pointer", tooltip: loc("ISOROLL.WallManager.SelectWalls") });
      } else {
        WallManager.enterSelect(tile);
        updateHudButton($btn, { active: true, icon: "fa-check", tooltip: loc("ISOROLL.WallManager.DoneSelecting") });
      }
    });
  }
}
