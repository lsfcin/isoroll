import { MODULE_ID } from "../volume/flags";
import {
  getLinkedWallIds, setLinkedWallIds, updateLinkedWallPositions,
  deleteLinkedWalls, generateBaseWalls, unlinkAllWalls,
  canvasToAnchor, hasLinkedDoor, getDoorBehavior, cycleDoorBehavior, applyDoorBehavior,
} from "./wall-ops";
import { scene, type TileDoc } from "./wall-core";
import { WallOverlay } from "./wall-overlay";

function wrap(fn: () => Promise<void>, label: string): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), 0);
}

export class WallManager {
  static activate(): void {
    Hooks.on("updateTile",    WallManager.onUpdateTile);
    Hooks.on("deleteTile",    WallManager.onDeleteTile);
    Hooks.on("deleteWall",    WallManager.onDeleteWall);
    Hooks.on("updateWall",    WallManager.onUpdateWall);
    Hooks.on("renderTileHUD", WallManager.onRenderTileHUD);
    WallOverlay.activate();
  }

  private static onUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll === "preset") return;
    const posOrSize = "x" in changes || "y" in changes || "width" in changes || "height" in changes;
    if (!posOrSize || !getLinkedWallIds(doc).length) return;
    wrap(() => updateLinkedWallPositions(doc), "wall position update");
  }

  private static onDeleteTile(doc: TileDocument): void {
    wrap(() => deleteLinkedWalls(doc), "wall cascade delete");
  }

  private static onDeleteWall(doc: WallDocument): void {
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tileObj = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(tileId);
    if (!tileObj) return;
    const ids = getLinkedWallIds(tileObj.document).filter(id => id !== doc.id);
    wrap(() => setLinkedWallIds(tileObj.document, ids), "wall id prune");
    WallOverlay.refresh(tileObj);
  }

  private static onUpdateWall(
    doc: WallDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    // Skip updates we triggered via tile-move or anchor sync
    if (options.isoroll === "wallMove" || options.isoroll === "anchorUpdate") return;
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tileObj = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(tileId);
    if (!tileObj) return;

    // User manually moved wall in Walls layer → recompute stored anchor
    if (options.isoroll !== "wallEndpointDrag" && "c" in changes) {
      wrap(async () => {
        const c = (doc as unknown as { c: number[] }).c;
        await scene().updateEmbeddedDocuments("Wall",
          [{ _id: doc.id, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(tileObj.document as TileDoc, c) } } }],
          { isoroll: "anchorUpdate" });
      }, "wall anchor sync");
    }

    WallOverlay.refresh(tileObj);

    if ("ds" in changes) {
      wrap(() => applyDoorBehavior(tileObj.document, (changes.ds as number) > 0), "door behavior");
    }
  }

  private static onRenderTileHUD(hud: { object: Tile }, html: JQuery | HTMLElement): void {
    const tile = hud.object;
    if (!tile?.document) return;
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const doc   = tile.document;
    const wc    = getLinkedWallIds(doc).length;
    const tt    = (k: string) => game.i18n?.localize(k) ?? k;
    const inSel = WallOverlay.isSelectMode(tile.id);

    const doorBtn = hasLinkedDoor(doc) ? (() => {
      const beh  = getDoorBehavior(doc);
      const icon = { none: "fa-eye", hide: "fa-eye-slash", fade: "fa-adjust" }[beh.mode] ?? "fa-eye";
      const key  = { none: "DoorNone", hide: "DoorHide", fade: "DoorFade" }[beh.mode] ?? "DoorNone";
      return `<div class="control-icon isoroll-door-mode" data-tooltip="${tt("ISOROLL.WallManager." + key)}"><i class="fas ${icon}"></i></div>`;
    })() : "";

    $html.find(".col.right").append(`
      <div class="control-icon isoroll-gen-walls" data-tooltip="${tt("ISOROLL.WallManager.GenerateBase")}">
        <i class="fas fa-border-all"></i>${wc > 0 ? `<span class="isoroll-wall-badge">${wc}</span>` : ""}
      </div>
      <div class="control-icon isoroll-select-walls${inSel ? " active" : ""}" data-tooltip="${tt(inSel ? "ISOROLL.WallManager.DoneSelecting" : "ISOROLL.WallManager.SelectWalls")}">
        <i class="fas ${inSel ? "fa-check" : "fa-mouse-pointer"}"></i>
      </div>
      <div class="control-icon isoroll-unlink-walls" data-tooltip="${tt("ISOROLL.WallManager.UnlinkAll")}">
        <i class="fas fa-unlink"></i>
      </div>
      <div class="control-icon isoroll-delete-walls" data-tooltip="${tt("ISOROLL.WallManager.DeleteLinked")}">
        <i class="fas fa-trash-alt"></i>
      </div>
      ${doorBtn}
    `);

    const rerender = () => (hud as unknown as { render(): void }).render();

    $html.on("click", ".isoroll-gen-walls",    () => wrap(async () => { await generateBaseWalls(doc); rerender(); }, "generate base walls"));
    $html.on("click", ".isoroll-unlink-walls", () => wrap(async () => { await unlinkAllWalls(doc);    rerender(); }, "unlink walls"));
    $html.on("click", ".isoroll-delete-walls", () => wrap(async () => { await deleteLinkedWalls(doc); rerender(); }, "delete walls"));
    $html.on("click", ".isoroll-door-mode",    () => wrap(async () => { await cycleDoorBehavior(doc); rerender(); }, "cycle door behavior"));
    $html.on("click", ".isoroll-select-walls", () => {
      if (WallOverlay.isSelectMode(tile.id)) WallOverlay.exitSelect(tile);
      else WallOverlay.enterSelect(tile);
      rerender();
    });
  }
}
