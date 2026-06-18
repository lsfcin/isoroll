
import { MODULE_ID, VolumeFlags, scheduleWrap, CanvasEnv } from "../core";
import { getLinkedWallIds, setLinkedWallIds, hasLinkedDoor, getDoorBehavior, setDoorBehavior } from "./wall-flags";
import { updateLinkedWallPositions, flipLinkedWallAnchorsX } from "./wall-sync";
import { generateBaseWalls, deleteLinkedWalls as _deleteLinkedWalls, unlinkAllWalls as _unlinkAllWalls } from "./wall-crud";
import { canvasToAnchor, scene, wallsLayer, type TileDoc } from "./wall-coords";
import { applyDoorBehavior, cycleDoorBehavior as _cycleDoorBehavior } from "./wall-door";
import type { DoorBehavior } from "./wall-types";
import { WallOverlay } from "./wall-overlay";
import { WallHistory } from "./wall-history";

import { upsertTile, debounced, tileUpsertTimers } from "../preset";

const wrap = (fn: () => Promise<void>, label: string) => scheduleWrap(fn, label, 0);

export class WallManager {
  private static preSizes: Map<string, { w: number; h: number }> = new Map();

  static activate(): void {
    Hooks.on("preUpdateTile", WallManager.onPreUpdateTile);
    Hooks.on("updateTile",    WallManager.onUpdateTile);
    Hooks.on("deleteTile",    WallManager.onDeleteTile);
    Hooks.on("deleteWall",    WallManager.onDeleteWall);
    Hooks.on("updateWall",    WallManager.onUpdateWall);
    Hooks.on("canvasReady",   () => WallHistory.clear());
    window.addEventListener("keydown", (e) => {
      if (!e.ctrlKey || e.key !== "z" || e.shiftKey) return;
      if ((e.target as HTMLElement)?.matches?.("input,textarea,[contenteditable]")) return;
      if (!WallHistory.size) return;
      // Defer to Foundry if tile history has entries added after this wall op
      const currentTileHistLen = ((canvas as unknown as { tiles?: { history?: unknown[] } }).tiles?.history?.length ?? 0);
      if (currentTileHistLen > WallHistory.topTileHistLen) return;
      e.preventDefault(); e.stopImmediatePropagation();
      WallHistory.undo().catch(console.warn);
    });
    WallOverlay.activate();
  }

  private static onPreUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll) return;
    if (!("width" in changes) && !("height" in changes)) return;
    WallManager.preSizes.set(doc.id!, { w: doc.width ?? 0, h: doc.height ?? 0 });
  }

  private static onUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll === "preset") return;

    const isoFlags           = (changes as Record<string, Record<string, unknown>>)?.flags?.[MODULE_ID] ?? {};
    const tileFlippedChanged = "tileFlipped" in isoFlags;
    const boundHChanged      = "boundHeight" in isoFlags;
    const sizeChanged        = "width" in changes || "height" in changes;

    // Native size change (no isoroll option): rescale boundHeight proportionally.
    // Skipped for our own gizmo drags (isoroll:"gizmoDrag"), grid rescales (isoroll:"gridRescale"),
    // swapSide (tileFlippedChanged), and explicit boundH edits (boundHChanged).
    if (sizeChanged && !tileFlippedChanged && !boundHChanged && !options.isoroll) {
      const pre = WallManager.preSizes.get(doc.id!);
      WallManager.preSizes.delete(doc.id!);
      if (pre) {
        const oldMax = Math.max(pre.w, pre.h);
        const newMax = Math.max(doc.width ?? 0, doc.height ?? 0);
        if (oldMax > 0 && Math.abs(newMax / oldMax - 1) > 1e-4) {
          const ratio    = newMax / oldMax;
          const newBoundH = VolumeFlags.getTileHeight(doc) * ratio;
          wrap(async () => {
            await doc.update({
              [`flags.${MODULE_ID}.boundHeight`]:     newBoundH,
              [`flags.${MODULE_ID}.boundHeightBase`]: { w: doc.width ?? 0, h: doc.height ?? 0 },
            }, { isoroll: "gizmoDrag", isUndo: true });
          }, "boundH rescale");
          // Linked-wall position update deferred to the subsequent boundHChanged hook.
          if (getLinkedWallIds(doc).length) return;
        }
      }
    }

    if (!getLinkedWallIds(doc).length) return;

    const posOrSize         = "x" in changes || "y" in changes || "width" in changes || "height" in changes;
    const elevChanged       = "elevation" in changes;
    const imagePropsChanged = "imageOffset" in isoFlags || "imageScale" in isoFlags;

    if (tileFlippedChanged) {
      // swapSide changes width+height+tileFlipped in one update.
      // flipLinkedWallAnchorsX handles the full transform so skip updateLinkedWallPositions.
      const sizeSwapped = "width" in changes && "height" in changes;
      wrap(() => flipLinkedWallAnchorsX(doc, sizeSwapped), "wall flip");
    } else if (posOrSize || elevChanged || imagePropsChanged || boundHChanged) {
      wrap(() => updateLinkedWallPositions(doc), "wall position update");
    }
  }

  private static onDeleteTile(doc: TileDocument): void {
    // Skip unsetFlag — tile doc is already removed from the collection.
    wrap(async () => {
      const ids = getLinkedWallIds(doc).filter(id => !!wallsLayer().get(id));
      if (ids.length) await scene().deleteEmbeddedDocuments("Wall", ids, { isoroll: "wallBulkDelete" });
    }, "wall cascade delete");
  }

  private static onDeleteWall(
    doc: WallDocument, options: Record<string, unknown>,
  ): void {
    // Skip when deleteLinkedWalls bulk-deleted — it handles the flag clear directly
    if (options.isoroll === "wallBulkDelete") return;
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tileObj = CanvasEnv.getTile(tileId);
    if (!tileObj) return;
    const ids = getLinkedWallIds(tileObj.document).filter(id => id !== doc.id);
    wrap(() => setLinkedWallIds(tileObj.document, ids, { isUndo: true }), "wall id prune");
    WallOverlay.refresh(tileObj);
  }

  private static onUpdateWall(
    doc: WallDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    // Skip anchor-sync updates (would cause infinite loop)
    if (options.isoroll === "anchorUpdate") return;
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tileObj = CanvasEnv.getTile(tileId);
    if (!tileObj) return;

    // User manually moved wall in Walls layer → recompute stored anchor
    if (options.isoroll !== "wallMove" && options.isoroll !== "wallEndpointDrag" && "c" in changes) {
      wrap(async () => {
        const c = (doc as unknown as { c: number[] }).c;
        await scene().updateEmbeddedDocuments("Wall",
          [{ _id: doc.id, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(tileObj.document as TileDoc, c) } } }],
          { isoroll: "anchorUpdate" });
      }, "wall anchor sync");
    }

    WallOverlay.refresh(tileObj);
    debounced(tileUpsertTimers, tileId, () => upsertTile(tileObj.document));

    if ("ds" in changes) {
      wrap(() => applyDoorBehavior(tileObj.document, (changes.ds as number) > 0), "door behavior");
    }
  }

  // ── Public façade ────────────────────────────────────────────────────────

  // Reads — delegate to wall-flags / WallOverlay
  static getLinkedWallIds(doc: TileDocument): string[]      { return getLinkedWallIds(doc); }
  static hasLinkedDoor(doc: TileDocument): boolean          { return hasLinkedDoor(doc); }
  static getDoorBehavior(doc: TileDocument): DoorBehavior   { return getDoorBehavior(doc); }
  static isSelectMode(tileId: string): boolean              { return WallOverlay.isSelectMode(tileId); }
  static enterSelect(tile: Tile): void                      { WallOverlay.enterSelect(tile); }
  static exitSelect(tile: Tile): void                       { WallOverlay.exitSelect(tile); }

  // Mutations — run op then refresh overlay
  static async generateBaseWalls(doc: TileDocument): Promise<void> {
    await generateBaseWalls(doc);
    WallManager._refreshByDoc(doc);
  }

  static async deleteLinkedWalls(doc: TileDocument): Promise<void> {
    await _deleteLinkedWalls(doc);
    WallManager._refreshByDoc(doc);
  }

  static async unlinkAllWalls(doc: TileDocument): Promise<void> {
    await _unlinkAllWalls(doc);
    WallManager._refreshByDoc(doc);
  }

  static async cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior> {
    return _cycleDoorBehavior(doc);
  }

  static async setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void> {
    await setDoorBehavior(doc, b);
  }

  private static _refreshByDoc(doc: TileDocument): void {
    const tile = CanvasEnv.getTile(doc.id!);
    if (tile) WallOverlay.showIfActive(tile);
  }

}
