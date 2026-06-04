import { MODULE_ID } from "../flags";
import { getLinkedWallIds, setLinkedWallIds, hasLinkedDoor, getDoorBehavior, setDoorBehavior } from "./wall-flags";
import { updateLinkedWallPositions, flipLinkedWallAnchorsX } from "./wall-sync";
import { generateBaseWalls, deleteLinkedWalls as _deleteLinkedWalls, unlinkAllWalls as _unlinkAllWalls } from "./wall-crud";
import { canvasToAnchor, scene, type TileDoc } from "./wall-coords";
import { applyDoorBehavior, cycleDoorBehavior as _cycleDoorBehavior } from "./wall-door";
import type { DoorBehavior } from "./wall-types";
import { WallOverlay } from "./wall-overlay";
import { WallHistory } from "./wall-history";
import { scheduleWrap } from "../util";

const wrap = (fn: () => Promise<void>, label: string) => scheduleWrap(fn, label, 0);

export class WallManager {
  static activate(): void {
    Hooks.on("updateTile",    WallManager.onUpdateTile);
    Hooks.on("deleteTile",    WallManager.onDeleteTile);
    Hooks.on("deleteWall",    WallManager.onDeleteWall);
    Hooks.on("updateWall",    WallManager.onUpdateWall);
    Hooks.on("canvasReady",   () => WallHistory.clear());
    window.addEventListener("keydown", (e) => {
      if (!e.ctrlKey || e.key !== "z" || e.shiftKey) return;
      if ((e.target as HTMLElement)?.matches?.("input,textarea,[contenteditable]")) return;
      if (!WallHistory.size) return;
      e.preventDefault(); e.stopImmediatePropagation();
      WallHistory.undo().catch(console.warn);
    });
    WallOverlay.activate();
  }

  private static onUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll === "preset") return;
    if (!getLinkedWallIds(doc).length) return;
    const posOrSize   = "x" in changes || "y" in changes || "width" in changes || "height" in changes;
    const elevChanged = "elevation" in changes;
    const isoFlags    = (changes as Record<string, Record<string, unknown>>)?.flags?.[MODULE_ID] ?? {};
    const tileFlippedChanged = "tileFlipped" in isoFlags;
    const imagePropsChanged  = "imageOffset" in isoFlags || "imageScale" in isoFlags;
    const boundHChanged      = "boundHeight" in isoFlags;
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
    wrap(() => deleteLinkedWalls(doc), "wall cascade delete");
  }

  private static onDeleteWall(
    doc: WallDocument, options: Record<string, unknown>,
  ): void {
    // Skip when deleteLinkedWalls bulk-deleted — it handles the flag clear directly
    if (options.isoroll === "wallBulkDelete") return;
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
    // Skip anchor-sync updates (would cause infinite loop)
    if (options.isoroll === "anchorUpdate") return;
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tileObj = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(tileId);
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
    const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(doc.id!);
    if (tile) WallOverlay.refresh(tile);
  }

}
