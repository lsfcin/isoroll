
import { MODULE_ID, scheduleWrap, CanvasEnv } from "../core";
import { getLinkedWallIds, setLinkedWallIds, hasLinkedDoor, getDoorBehavior, setDoorBehavior } from "./wall-flags";
import { generateBaseWalls, deleteLinkedWalls as _deleteLinkedWalls, unlinkAllWalls as _unlinkAllWalls } from "./wall-crud";
import { scene, wallsLayer } from "./wall-coords";
import { cycleDoorBehavior as _cycleDoorBehavior } from "./wall-door";
import type { DoorBehavior } from "./wall-types";
import { WallOverlay } from "./wall-overlay";
import { WallHistory } from "./wall-history";
import { handleNativeSizeChange, scheduleWallUpdate, doUpdateWall } from "./wall-manager-impl";

function wrap(fn: () => Promise<void>, label: string): void {
  scheduleWrap(fn, label, 0);
}

function currentTileHistLen(): number {
  const tiles = (canvas as unknown as { tiles?: { history?: unknown[] } }).tiles;
  return tiles?.history?.length ?? 0;
}

function isInputTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const matches = el?.matches?.("input,textarea,[contenteditable]");
  return !!matches;
}

function handleKeydown(e: KeyboardEvent): void {
  const isCtrlZ = e.ctrlKey && e.key === "z" && !e.shiftKey;
  const notInput = !isInputTarget(e.target);
  const hasHistory = !!WallHistory.size;
  const notDeferred = currentTileHistLen() <= WallHistory.topTileHistLen;
  if (isCtrlZ && notInput && hasHistory && notDeferred) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const undoPromise = WallHistory.undo();
    undoPromise.catch(console.warn);
  }
}

export class WallManager {
  static preSizes: Map<string, { w: number; h: number }> = new Map();

  static activate(): void {
    window.addEventListener("keydown", handleKeydown);
    WallOverlay.activate();
  }

  static onCanvasReady(): void { WallHistory.clear(); }

  static onPreUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    const notOurs = !options.isoroll;
    const sizeChange = "width" in changes || "height" in changes;
    if (notOurs && sizeChange) {
      WallManager.preSizes.set(doc.id!, { w: doc.width ?? 0, h: doc.height ?? 0 });
    }
  }

  static onUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll === "preset") {
      return;
    }
    const isoFlags           = (changes as Record<string, Record<string, unknown>>)?.flags?.[MODULE_ID] ?? {};
    const tileFlippedChanged = "tileFlipped" in isoFlags;
    const boundHChanged      = "boundHeight" in isoFlags;
    const tileHadWalls = handleNativeSizeChange(doc, changes, isoFlags, options, WallManager.preSizes);
    if (!tileHadWalls && getLinkedWallIds(doc).length) {
      scheduleWallUpdate(doc, changes, isoFlags, tileFlippedChanged, boundHChanged);
    }
  }

  static onDeleteTile(doc: TileDocument): void {
    wrap(async () => {
      const layer = wallsLayer();
      const allIds = getLinkedWallIds(doc);
      const ids = allIds.filter(id => !!layer.get(id));
      if (ids.length) {
        const sc = scene();
        await sc.deleteEmbeddedDocuments("Wall", ids, { isoroll: "wallBulkDelete" });
      }
    }, "wall cascade delete");
  }

  static onDeleteWall(doc: WallDocument, options: Record<string, unknown>): void {
    if (options.isoroll !== "wallBulkDelete") {
      const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
      if (tileId) {
        const tileObj = CanvasEnv.getTile(tileId);
        if (tileObj) {
          const allIds = getLinkedWallIds(tileObj.document);
          const ids = allIds.filter(id => id !== doc.id);
          wrap(() => setLinkedWallIds(tileObj.document, ids, { isUndo: true }), "wall id prune");
          WallOverlay.refresh(tileObj);
        }
      }
    }
  }

  static onUpdateWall(
    doc: WallDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll !== "anchorUpdate") {
      const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
      if (tileId) {
        const tileObj = CanvasEnv.getTile(tileId);
        if (tileObj) {
          doUpdateWall(doc, changes, options, tileId, tileObj);
        }
      }
    }
  }

  // ── Public façade ────────────────────────────────────────────────────────

  static markWallDrag(tileId: string): void  { WallOverlay.markDragActive(tileId); }
  static clearWallDrag(tileId: string): void { WallOverlay.clearDragActive(tileId); }

  static getLinkedWallIds(doc: TileDocument): string[]      { return getLinkedWallIds(doc); }
  static hasLinkedDoor(doc: TileDocument): boolean          { return hasLinkedDoor(doc); }
  static getDoorBehavior(doc: TileDocument): DoorBehavior   { return getDoorBehavior(doc); }
  static isSelectMode(tileId: string): boolean              { return WallOverlay.isSelectMode(tileId); }
  static enterSelect(tile: Tile): void                      { WallOverlay.enterSelect(tile); }
  static exitSelect(tile: Tile): void                       { WallOverlay.exitSelect(tile); }

  static async generateBaseWalls(doc: TileDocument): Promise<void> {
    await generateBaseWalls(doc);
    const tile = CanvasEnv.getTile(doc.id!);
    if (tile) {
      WallOverlay.showIfActive(tile);
    }
  }

  static async deleteLinkedWalls(doc: TileDocument): Promise<void> {
    await _deleteLinkedWalls(doc);
    const tile = CanvasEnv.getTile(doc.id!);
    if (tile) {
      WallOverlay.showIfActive(tile);
    }
  }

  static async unlinkAllWalls(doc: TileDocument): Promise<void> {
    await _unlinkAllWalls(doc);
    const tile = CanvasEnv.getTile(doc.id!);
    if (tile) {
      WallOverlay.showIfActive(tile);
    }
  }

  static async cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior> {
    return _cycleDoorBehavior(doc);
  }

  static async setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void> {
    await setDoorBehavior(doc, b);
  }
}
