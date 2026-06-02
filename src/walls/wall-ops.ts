import { MODULE_ID, VolumeFlags } from "../volume/flags";
import type { WallDef, TileAnchor } from "./wall-types";
import {
  wallsLayer, scene,
  tileRect, defToCanvas, canvasToAnchor,
  getLinkedWallIds, setLinkedWallIds,
  type TileDoc, type WallDoc,
} from "./wall-core";

export { getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls } from "./wall-core";

export function generateBaseWallDefs(doc: TileDocument): WallDef[] {
  const topOffset = VolumeFlags.getTileHeight(doc);
  return [
    { ax: 0, ay: 0, bx: 1, by: 0, topOffset, bottomOffset: 0, isDoor: false }, // N
    { ax: 1, ay: 0, bx: 1, by: 1, topOffset, bottomOffset: 0, isDoor: false }, // E
    { ax: 1, ay: 1, bx: 0, by: 1, topOffset, bottomOffset: 0, isDoor: false }, // S
    { ax: 0, ay: 1, bx: 0, by: 0, topOffset, bottomOffset: 0, isDoor: false }, // W
  ];
}

export async function createWallsFromDefs(doc: TileDocument, defs: WallDef[]): Promise<string[]> {
  const tDoc = doc as TileDoc;
  const baseElevation = VolumeFlags.getTileBaseElevation(doc);
  const wallData = defs.map(def => ({
    c: defToCanvas(tDoc, def),
    door: def.isDoor ? 1 : 0,
    flags: {
      [MODULE_ID]: {
        parentTileId: doc.id,
        tileAnchor: { ax: def.ax, ay: def.ay, bx: def.bx, by: def.by } satisfies TileAnchor,
        wallTop:    baseElevation + def.topOffset,
        wallBottom: baseElevation + def.bottomOffset,
      },
    },
  }));
  const created = await scene().createEmbeddedDocuments("Wall", wallData);
  return created.map(w => w.id ?? "").filter(Boolean);
}

export async function deleteLinkedWalls(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc).filter(id => wallsLayer().get(id));
  if (!ids.length) return;
  await scene().deleteEmbeddedDocuments("Wall", ids);
  // linkedWallIds flag cleared by deleteWall hook cascade
}

export async function updateLinkedWallPositions(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc);
  if (!ids.length) return;
  const { left, top, w, h } = tileRect(doc as TileDoc);
  const updates: { _id: string; c: [number, number, number, number] }[] = [];
  for (const id of ids) {
    const wall = wallsLayer().get(id);
    if (!wall) continue;
    const anchor = wall.document.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    if (!anchor) continue;
    updates.push({ _id: id,
      c: [left + anchor.ax * w, top + anchor.ay * h, left + anchor.bx * w, top + anchor.by * h] });
  }
  if (!updates.length) return;
  await scene().updateEmbeddedDocuments("Wall", updates, { isoroll: "wallMove" });
}

/** Links currently controlled walls to the tile. Returns count newly linked. */
export async function linkSelectedWalls(doc: TileDocument): Promise<number> {
  const controlled = wallsLayer().controlled;
  if (!controlled.length) return 0;
  const existing    = new Set(getLinkedWallIds(doc));
  const baseElevation = VolumeFlags.getTileBaseElevation(doc);
  const wallUpdates: { _id: string; flags: object }[] = [];
  for (const wall of controlled) {
    const id = wall.document.id as string | null;
    if (!id) continue;
    existing.add(id);
    wallUpdates.push({ _id: id, flags: { [MODULE_ID]: {
      parentTileId: doc.id,
      tileAnchor:  canvasToAnchor(doc as TileDoc, wall.document.c),
      wallTop:     baseElevation + VolumeFlags.getTileHeight(doc),
      wallBottom:  baseElevation,
    }}});
  }
  if (!wallUpdates.length) return 0;
  await scene().updateEmbeddedDocuments("Wall", wallUpdates);
  await setLinkedWallIds(doc, [...existing]);
  return wallUpdates.length;
}

export async function unlinkAllWalls(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc).filter(id => wallsLayer().get(id));
  if (ids.length) {
    await scene().updateEmbeddedDocuments("Wall", ids.map(id => ({
      _id: id, flags: { [MODULE_ID]: { parentTileId: null, tileAnchor: null } },
    })));
  }
  await doc.unsetFlag(MODULE_ID, "linkedWallIds");
}

export async function generateBaseWalls(doc: TileDocument): Promise<void> {
  await deleteLinkedWalls(doc);
  const ids = await createWallsFromDefs(doc, generateBaseWallDefs(doc));
  await setLinkedWallIds(doc, ids);
}

export function extractWallDefs(doc: TileDocument): WallDef[] {
  const ids = getLinkedWallIds(doc);
  if (!ids.length) return [];
  const baseElevation = VolumeFlags.getTileBaseElevation(doc);
  return ids.flatMap(id => {
    const wall = wallsLayer().get(id);
    if (!wall) return [];
    const anchor = wall.document.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    if (!anchor) return [];
    const wallTop    = (wall.document.getFlag(MODULE_ID, "wallTop")    as number | undefined) ?? baseElevation + 1;
    const wallBottom = (wall.document.getFlag(MODULE_ID, "wallBottom") as number | undefined) ?? baseElevation;
    return [{ ax: anchor.ax, ay: anchor.ay, bx: anchor.bx, by: anchor.by,
      topOffset: wallTop - baseElevation, bottomOffset: wallBottom - baseElevation,
      isDoor: (wall.document as WallDoc).door === 1 }];
  });
}

export async function applyWallDefs(doc: TileDocument, defs: WallDef[]): Promise<void> {
  if (!defs.length) return;
  await deleteLinkedWalls(doc);
  await setLinkedWallIds(doc, await createWallsFromDefs(doc, defs));
}
