// Undo stack for isoroll wall operations on the Tiles layer.
import { setLinkedWallIds, wallsLayer, scene, canvasToAnchor } from "./wall-core";
import { MODULE_ID } from "../volume/flags";
import type { TileDoc } from "./wall-core";

type Entry =
  | { k: "toggle";     tileId: string; wallId: string; prevIds: string[]; wasLinked: boolean }
  | { k: "move";       wallId: string; prevC: number[] }
  | { k: "create";     tileId: string; newIds: string[]; prevData: object[] }
  | { k: "delete";     tileId: string; prevData: object[] }
  | { k: "unlink-all"; tileId: string; prevIds: string[] };

const _stack: Entry[] = [];
const MAX = 50;

export const WallHistory = {
  push(e: Entry): void { _stack.push(e); if (_stack.length > MAX) _stack.shift(); },
  clear(): void { _stack.length = 0; },
  get size(): number { return _stack.length; },

  async undo(): Promise<void> {
    const e = _stack.pop();
    if (!e) return;

    if (e.k === "toggle") {
      const tile = (canvas.tiles as any)?.get(e.tileId);
      if (!tile) return;
      await setLinkedWallIds(tile.document, e.prevIds);
      if (!e.wasLinked && wallsLayer().get(e.wallId))
        await scene().updateEmbeddedDocuments("Wall",
          [{ _id: e.wallId, flags: { [MODULE_ID]: { parentTileId: null, tileAnchor: null } } }]);
      refreshTile(tile);
      return;
    }

    if (e.k === "move") {
      await scene().updateEmbeddedDocuments("Wall",
        [{ _id: e.wallId, c: e.prevC }], { isoroll: "undoMove" });
      return;
    }

    if (e.k === "create") {
      if (e.newIds.length)
        await scene().deleteEmbeddedDocuments("Wall", e.newIds, { isoroll: "wallBulkDelete" });
      const tile = (canvas.tiles as any)?.get(e.tileId);
      if (!tile) return;
      await tile.document.unsetFlag(MODULE_ID, "linkedWallIds");
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
        }));
      await setLinkedWallIds(tile.document, valid);
      refreshTile(tile);
    }
  },
};

async function recreateWalls(tileId: string, data: object[]): Promise<void> {
  const wallData = data.map((d: any) => { const { _id, ...rest } = d; return rest; });
  const created  = await scene().createEmbeddedDocuments("Wall", wallData) as any[];
  const ids      = created.map((w: any) => w.id as string).filter(Boolean);
  const tile     = (canvas.tiles as any)?.get(tileId);
  if (tile) await setLinkedWallIds(tile.document, ids);
  refreshTile(tile);
}

function refreshTile(tile: any): void {
  if (!tile) return;
  import("./wall-overlay").then(({ WallOverlay }) => WallOverlay.refresh(tile));
}
