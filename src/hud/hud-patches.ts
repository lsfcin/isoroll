// TokenHUD repositioning + TileHUD wall buttons under isometric stage transform.
import { MODULE_ID } from "../flags";
import { canvasZoom, scheduleWrap } from "../util";
import { getLinkedWallIds, hasLinkedDoor, getDoorBehavior } from "../walls/wall-flags";
import { generateBaseWalls, unlinkAllWalls, deleteLinkedWalls } from "../walls/wall-crud";
import { cycleDoorBehavior } from "../walls/wall-door";
import { WallOverlay } from "../walls/wall-overlay";

const wrap = (fn: () => Promise<void>, label: string) => scheduleWrap(fn, label, 0);

export class HudPatches {
  static activate(): void {
    Hooks.on("renderTokenHUD", HudPatches.onRenderTokenHUD);
    Hooks.on("renderTileHUD",  HudPatches.onRenderTileHUD);
  }

  // Reposition the TokenHUD to track the token under the isometric stage transform.
  private static onRenderTokenHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (canvas.scene?.getFlag(MODULE_ID, "enabled") !== true) return;
    const token = hud.object as Token;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    requestAnimationFrame(() => {
      const center = (token.center ?? { x: token.x, y: token.y }) as { x: number; y: number };
      const wt = canvas.app?.stage?.worldTransform;
      const zoom = canvasZoom();
      if (!wt) return;
      const L = (wt.a * center.x + wt.c * center.y) / zoom;
      const T = (wt.b * center.x + wt.d * center.y) / zoom;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
    });
  }

  private static onRenderTileHUD(hud: { object: Tile }, html: JQuery | HTMLElement): void {
    const tile = hud.object;
    if (!tile?.document) return;
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const doc   = tile.document;
    const wallCount = getLinkedWallIds(doc).length;
    const loc   = (k: string) => game.i18n?.localize(k) ?? k;
    const inSel = WallOverlay.isSelectMode(tile.id);

    const doorBtn = hasLinkedDoor(doc) ? (() => {
      const beh  = getDoorBehavior(doc);
      const icon = { none: "fa-eye", hide: "fa-eye-slash", fade: "fa-adjust" }[beh.mode] ?? "fa-eye";
      const key  = { none: "DoorNone", hide: "DoorHide", fade: "DoorFade" }[beh.mode] ?? "DoorNone";
      return `<div class="control-icon isoroll-door-mode" data-tooltip="${loc("ISOROLL.WallManager." + key)}"><i class="fas ${icon}"></i></div>`;
    })() : "";

    // Remove any existing isoroll buttons + handlers before re-adding (HUD may re-render in-place)
    $html.find(".isoroll-gen-walls, .isoroll-select-walls, .isoroll-unlink-walls, .isoroll-delete-walls, .isoroll-door-mode").remove();
    $html.off("click.isoroll");

    $html.find(".col.right").append(`
      <div class="control-icon isoroll-gen-walls" data-tooltip="${loc("ISOROLL.WallManager.GenerateBase")}">
        <i class="fas fa-border-all"></i>${wallCount > 0 ? `<span class="isoroll-wall-badge">${wallCount}</span>` : ""}
      </div>
      <div class="control-icon isoroll-select-walls${inSel ? " active" : ""}" data-tooltip="${loc(inSel ? "ISOROLL.WallManager.DoneSelecting" : "ISOROLL.WallManager.SelectWalls")}">
        <i class="fas ${inSel ? "fa-check" : "fa-mouse-pointer"}"></i>
      </div>
      <div class="control-icon isoroll-unlink-walls" data-tooltip="${loc("ISOROLL.WallManager.UnlinkAll")}">
        <i class="fas fa-unlink"></i>
      </div>
      <div class="control-icon isoroll-delete-walls" data-tooltip="${loc("ISOROLL.WallManager.DeleteLinked")}">
        <i class="fas fa-trash-alt"></i>
      </div>
      ${doorBtn}
    `);

    const rerender = () => (hud as unknown as { render(): void }).render();

    $html.on("click.isoroll", ".isoroll-gen-walls",    () => wrap(async () => { await generateBaseWalls(doc); rerender(); }, "generate base walls"));
    $html.on("click.isoroll", ".isoroll-unlink-walls", () => wrap(async () => { await unlinkAllWalls(doc);    rerender(); }, "unlink walls"));
    $html.on("click.isoroll", ".isoroll-delete-walls", () => wrap(async () => { await deleteLinkedWalls(doc); rerender(); }, "delete walls"));
    $html.on("click.isoroll", ".isoroll-door-mode",    () => wrap(async () => { await cycleDoorBehavior(doc); rerender(); }, "cycle door behavior"));
    $html.on("click.isoroll", ".isoroll-select-walls", (e) => {
      const $btn = $(e.currentTarget as HTMLElement);
      if (WallOverlay.isSelectMode(tile.id)) {
        WallOverlay.exitSelect(tile);
        $btn.removeClass("active").attr("data-tooltip", loc("ISOROLL.WallManager.SelectWalls"));
        $btn.find("i").attr("class", "fas fa-mouse-pointer");
      } else {
        WallOverlay.enterSelect(tile);
        $btn.addClass("active").attr("data-tooltip", loc("ISOROLL.WallManager.DoneSelecting"));
        $btn.find("i").attr("class", "fas fa-check");
      }
    });
  }
}
