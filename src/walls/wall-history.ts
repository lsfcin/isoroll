// Undo stack for isoroll wall operations on the Tiles layer.
import { MODULE_ID, CanvasEnv } from "../core";
import { setLinkedWallIds } from "./wall-flags";
import { wallsLayer, scene, canvasToAnchor, type TileDoc } from "./wall-coords";

type EntryBase = { tileHistLen: number };
type Entry =
  | ({ k: "toggle";     tileId: string; wallId: string; prevIds: string[]; wasLinked: boolean } & EntryBase)
  | ({ k: "move";       wallId: string; prevC: number[] } & EntryBase)
  | ({ k: "create";     tileId: string; newIds: string[]; prevData: object[] } & EntryBase)
  | ({ k: "delete";     tileId: string; prevData: object[] } & EntryBase)
  | ({ k: "unlink-all"; tileId: string; prevIds: string[] } & EntryBase);

const _stack: Entry[] = [];
const MAX = 50;

function tileHistLen(): number {
  const tiles = (canvas as unknown as { tiles?: { history?: unknown[] } }).tiles;
  const history = tiles?.history;
  return history?.length ?? 0;
}

export const WallHistory = {
  push(e: Omit<Entry, "tileHistLen">): void {
    const entry = { ...e, tileHistLen: tileHistLen() } as Entry;
    _stack.push(entry);
    if (_stack.length > MAX) {
      _stack.shift();
    }
  },
  clear(): void { _stack.length = 0; },
  get size(): number { return _stack.length; },
  get topTileHistLen(): number { return _stack.length ? _stack[_stack.length - 1].tileHistLen : 0; },

  async undo(): Promise<void> {
    const e = _stack.pop();
    if (e) {
      await undoEntry(e);
    }
  },
};

async function undoToggle(e: Extract<Entry, { k: "toggle" }>): Promise<void> {
  const tile = CanvasEnv.getTile(e.tileId);
  if (!tile) {
    return;
  }
  await setLinkedWallIds(tile.document, e.prevIds, { isUndo: true });
  const layer = wallsLayer();
  if (!e.wasLinked && layer.get(e.wallId)) {
    const sc = scene();
    const update = [{ _id: e.wallId, flags: { [MODULE_ID]: { parentTileId: null, tileAnchor: null } } }];
    await sc.updateEmbeddedDocuments("Wall", update, { isUndo: true });
  }
  refreshTile(tile);
}

async function undoMove(e: Extract<Entry, { k: "move" }>): Promise<void> {
  const sc = scene();
  await sc.updateEmbeddedDocuments("Wall",
    [{ _id: e.wallId, c: e.prevC }], { isoroll: "undoMove", isUndo: true });
}

async function undoCreate(e: Extract<Entry, { k: "create" }>): Promise<void> {
  const sc = scene();
  if (e.newIds.length) {
    await sc.deleteEmbeddedDocuments("Wall", e.newIds, { isoroll: "wallBulkDelete", isUndo: true });
  }
  const tile = CanvasEnv.getTile(e.tileId);
  if (!tile) {
    return;
  }
  const tileDoc = tile.document as unknown as { update(d: object, o?: object): Promise<unknown> };
  await tileDoc.update({ [`flags.${MODULE_ID}.linkedWallIds`]: null }, { isUndo: true });
  if (e.prevData.length) {
    await recreateWalls(e.tileId, e.prevData);
  } else {
    refreshTile(tile);
  }
}

async function undoDelete(e: Extract<Entry, { k: "delete" }>): Promise<void> {
  if (e.prevData.length) {
    await recreateWalls(e.tileId, e.prevData);
  }
}

async function undoUnlinkAll(e: Extract<Entry, { k: "unlink-all" }>): Promise<void> {
  const tile = CanvasEnv.getTile(e.tileId);
  if (!tile) {
    return;
  }
  const layer = wallsLayer();
  const valid = e.prevIds.filter(id => layer.get(id));
  if (valid.length) {
    const sc = scene();
    const updates = valid.map(id => {
      const w = layer.get(id)!;
      const wc = (w.document as unknown as { c: number[] }).c;
      const tileAnchor = canvasToAnchor(tile.document as TileDoc, wc);
      return { _id: id, flags: { [MODULE_ID]: { parentTileId: e.tileId, tileAnchor } } };
    });
    await sc.updateEmbeddedDocuments("Wall", updates, { isUndo: true });
  }
  await setLinkedWallIds(tile.document, valid, { isUndo: true });
  refreshTile(tile);
}

async function undoEntry(e: Entry): Promise<void> {
  if (e.k === "toggle") {
    await undoToggle(e);
  } else if (e.k === "move") {
    await undoMove(e);
  } else if (e.k === "create") {
    await undoCreate(e);
  } else if (e.k === "delete") {
    await undoDelete(e);
  } else if (e.k === "unlink-all") {
    await undoUnlinkAll(e);
  }
}

type WithId = { id: string };

async function recreateWalls(tileId: string, data: object[]): Promise<void> {
  // keepId: true preserves original wall IDs so WallHistory "create" entries remain valid.
  const sc = scene();
  const created = await sc.createEmbeddedDocuments("Wall", data, { keepId: true, isUndo: true });
  const mapped = (created as unknown as WithId[]).map(w => w.id);
  const ids = mapped.filter(Boolean);
  const tile = CanvasEnv.getTile(tileId);
  if (tile) {
    await setLinkedWallIds(tile.document, ids, { isUndo: true });
  }
  refreshTile(tile);
}

function refreshTile(tile: unknown): void {
  if (!tile) {
    return;
  }
  import("./wall-overlay").then(({ WallOverlay }) => WallOverlay.refresh(tile as Tile));  // dynamic: breaks wall-overlay-ops → wall-history → wall-overlay cycle
}
