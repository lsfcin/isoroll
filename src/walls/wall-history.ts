// Undo stack for isoroll wall operations on the Tiles layer.
import { setLinkedWallIds } from "./wall-flags";
import { wallsLayer, scene, canvasToAnchor, type TileDoc } from "./wall-coords";
import { MODULE_ID } from "../flags";

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
  return ((canvas as unknown as { tiles?: { history?: unknown[] } }).tiles?.history?.length ?? 0);
}

export const WallHistory = {
  push(e: Omit<Entry, "tileHistLen">): void {
    _stack.push({ ...e, tileHistLen: tileHistLen() } as Entry);
    if (_stack.length > MAX) _stack.shift();
  },
  clear(): void { _stack.length = 0; },
  get size(): number { return _stack.length; },
  get topTileHistLen(): number { return _stack.length ? _stack[_stack.length - 1].tileHistLen : 0; },

  async undo(): Promise<void> {
    const e = _stack.pop();
    if (!e) return;

    if (e.k === "toggle") {
      const tile = (canvas.tiles as any)?.get(e.tileId);
      if (!tile) return;
      await setLinkedWallIds(tile.document, e.prevIds, { isUndo: true });
      if (!e.wasLinked && wallsLayer().get(e.wallId))
        await scene().updateEmbeddedDocuments("Wall",
          [{ _id: e.wallId, flags: { [MODULE_ID]: { parentTileId: null, tileAnchor: null } } }],
          { isUndo: true });
      refreshTile(tile);
      return;
    }

    if (e.k === "move") {
      await scene().updateEmbeddedDocuments("Wall",
        [{ _id: e.wallId, c: e.prevC }], { isoroll: "undoMove", isUndo: true });
      return;
    }

    if (e.k === "create") {
      if (e.newIds.length)
        await scene().deleteEmbeddedDocuments("Wall", e.newIds, { isoroll: "wallBulkDelete", isUndo: true });
      const tile = (canvas.tiles as any)?.get(e.tileId);
      if (!tile) return;
      await (tile.document as any).update({ [`flags.${MODULE_ID}.linkedWallIds`]: null }, { isUndo: true });
      if (e.prevData.length) await recreateWalls(e.tileId, e.prevData);
      else refreshTile(tile);
      return;
    }

    if (e.k === "delete") {
      if (e.prevData.length) await recreateWalls(e.tileId, e.prevData);
      return;
    }

    if (e.k === "unlink-all") {
      const tile = (canvas.tiles as any)?.get(e.tileId);
      if (!tile) return;
      const valid = e.prevIds.filter(id => wallsLayer().get(id));
      if (valid.length)
        await scene().updateEmbeddedDocuments("Wall", valid.map(id => {
          const w = wallsLayer().get(id)!;
          return { _id: id, flags: { [MODULE_ID]: {
            parentTileId: e.tileId,
            tileAnchor: canvasToAnchor(tile.document as TileDoc, (w.document as any).c),
          }}};
        }), { isUndo: true });
      await setLinkedWallIds(tile.document, valid, { isUndo: true });
      refreshTile(tile);
    }
  },
};

async function recreateWalls(tileId: string, data: object[]): Promise<void> {
  // keepId: true preserves original wall IDs so WallHistory "create" entries remain valid.
  const created  = await scene().createEmbeddedDocuments("Wall", data, { keepId: true, isUndo: true }) as any[];
  const ids      = created.map((w: any) => w.id as string).filter(Boolean);
  const tile     = (canvas.tiles as any)?.get(tileId);
  if (tile) await setLinkedWallIds(tile.document, ids, { isUndo: true });
  refreshTile(tile);
}

function refreshTile(tile: any): void {
  if (!tile) return;
  import("./wall-overlay").then(({ WallOverlay }) => WallOverlay.refresh(tile));
}
