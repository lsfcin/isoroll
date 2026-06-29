// TileHUD wall control buttons.
import { WallManager } from "../walls";
import {
  hudButton, clearIsorollHud, appendHudButtons,
  onHudAction, onHudToggle, updateHudButton,
} from "./hud-utils";

type Loc = (k: string) => string;

function buildDoorBtn(doc: TileDocument, loc: Loc): string {
  let result: string;
  if (!WallManager.hasLinkedDoor(doc)) {
    result = "";
  } else {
    const beh     = WallManager.getDoorBehavior(doc);
    const icon    = { none: "fa-eye", hide: "fa-eye-slash", fade: "fa-adjust" }[beh.mode] ?? "fa-eye";
    const key     = { none: "DoorNone", hide: "DoorHide", fade: "DoorFade" }[beh.mode] ?? "DoorNone";
    const tooltip = loc("ISOROLL.WallManager." + key);
    result = hudButton({ cls: "isoroll-door-mode", tooltip, icon });
  }
  return result;
}

function buildHudButtons(doc: TileDocument, wallCount: number, inSel: boolean, loc: Loc): string {
  const tooltipGen   = loc("ISOROLL.WallManager.GenerateBase");
  const genBtn       = hudButton({ cls: "isoroll-gen-walls",    tooltip: tooltipGen,  icon: "fa-border-all", badge: wallCount || undefined });
  const tooltipSel   = loc(inSel ? "ISOROLL.WallManager.DoneSelecting" : "ISOROLL.WallManager.SelectWalls");
  const selBtn       = hudButton({ cls: "isoroll-select-walls", tooltip: tooltipSel,  icon: inSel ? "fa-check" : "fa-mouse-pointer", active: inSel });
  const tooltipUnlnk = loc("ISOROLL.WallManager.UnlinkAll");
  const unlinkBtn    = hudButton({ cls: "isoroll-unlink-walls", tooltip: tooltipUnlnk, icon: "fa-unlink" });
  const tooltipDel   = loc("ISOROLL.WallManager.DeleteLinked");
  const delBtn       = hudButton({ cls: "isoroll-delete-walls", tooltip: tooltipDel,  icon: "fa-trash-alt" });
  const doorBtn      = buildDoorBtn(doc, loc);
  return genBtn + selBtn + unlinkBtn + delBtn + doorBtn;
}

export class TileHud {
  static activate(): void { /* hooks registered in core/hook-registry.ts */ }

  static onRenderTileHUD(hud: { object: Tile }, html: JQuery | HTMLElement): void {
    const tile = hud.object;
    if (!tile?.document) {
      return;
    }
    const $html     = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const doc       = tile.document;
    const wallCount = WallManager.getLinkedWallIds(doc).length;
    const loc       = (k: string) => game.i18n?.localize(k) ?? k;
    const inSel     = WallManager.isSelectMode(tile.id);

    clearIsorollHud($html, ".isoroll-gen-walls, .isoroll-select-walls, .isoroll-unlink-walls, .isoroll-delete-walls, .isoroll-door-mode");
    const buttonsHtml = buildHudButtons(doc, wallCount, inSel, loc);
    appendHudButtons($html, "right", buttonsHtml);

    const rerender = () => (hud as unknown as { render(): void }).render();

    onHudAction($html, ".isoroll-gen-walls",    () => WallManager.generateBaseWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-unlink-walls", () => WallManager.unlinkAllWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-delete-walls", () => WallManager.deleteLinkedWalls(doc).then(rerender));
    onHudAction($html, ".isoroll-door-mode",    () => WallManager.cycleDoorBehavior(doc).then(rerender));
    onHudToggle($html, ".isoroll-select-walls", (e) => {
      const $btn = $(e.currentTarget as HTMLElement);
      if (WallManager.isSelectMode(tile.id)) {
        WallManager.exitSelect(tile);
        const tooltip = loc("ISOROLL.WallManager.SelectWalls");
        updateHudButton($btn, { active: false, icon: "fa-mouse-pointer", tooltip });
      } else {
        WallManager.enterSelect(tile);
        const tooltip = loc("ISOROLL.WallManager.DoneSelecting");
        updateHudButton($btn, { active: true, icon: "fa-check", tooltip });
      }
    });
  }
}
