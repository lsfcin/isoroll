import { MODULE_ID, VolumeFlags } from "../volume/flags";
import type { WallDef, WallConfig, DoorBehavior, TileAnchor } from "./wall-types";
import {
  wallsLayer, scene, tileRect, defToCanvas, canvasToAnchor,
  getLinkedWallIds, setLinkedWallIds,
  getDoorBehavior, setDoorBehavior, hasLinkedDoor,
  type TileDoc, type WallDoc,
} from "./wall-core";

export { getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls, canvasToAnchor } from "./wall-core";
export { getDoorBehavior, setDoorBehavior, hasLinkedDoor } from "./wall-core";

export function generateBaseWallDefs(doc: TileDocument): WallDef[] {
  const topOffset = VolumeFlags.getTileHeight(doc);
  return [
    { ax: 0, ay: 0, bx: 1, by: 0, topOffset, bottomOffset: 0, config: {} }, // N
    { ax: 1, ay: 0, bx: 1, by: 1, topOffset, bottomOffset: 0, config: {} }, // E
    { ax: 1, ay: 1, bx: 0, by: 1, topOffset, bottomOffset: 0, config: {} }, // S
    { ax: 0, ay: 1, bx: 0, by: 0, topOffset, bottomOffset: 0, config: {} }, // W
  ];
}

export async function createWallsFromDefs(doc: TileDocument, defs: WallDef[]): Promise<string[]> {
  const tDoc = doc as TileDoc;
  const baseElevation = VolumeFlags.getTileBaseElevation(doc);
  const wallData = defs.map(def => {
    // compat: old presets stored isDoor:boolean, new format uses config
    const cfg: Partial<WallConfig> = def.config
      ?? ((def as unknown as { isDoor?: boolean }).isDoor ? { door: 1 } : {});
    return {
      c: defToCanvas(tDoc, def),
      ...cfg,
      flags: {
        [MODULE_ID]: {
          parentTileId: doc.id,
          tileAnchor: { ax: def.ax, ay: def.ay, bx: def.bx, by: def.by } satisfies TileAnchor,
          wallTop:    baseElevation + def.topOffset,
          wallBottom: baseElevation + def.bottomOffset,
        },
      },
    };
  });
  const created = await scene().createEmbeddedDocuments("Wall", wallData);
  return created.map(w => w.id ?? "").filter(Boolean);
}

export async function deleteLinkedWalls(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc).filter(id => wallsLayer().get(id));
  if (ids.length) await scene().deleteEmbeddedDocuments("Wall", ids, { isoroll: "wallBulkDelete" });
  // explicit clear so callers reading the flag immediately after see count = 0
  await doc.unsetFlag(MODULE_ID, "linkedWallIds");
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
  const existing     = new Set(getLinkedWallIds(doc));
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
  await setLinkedWallIds(doc, await createWallsFromDefs(doc, generateBaseWallDefs(doc)));
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
    const wdoc = wall.document as WallDoc;
    const config: Partial<WallConfig> = {};
    if (wdoc.door)  config.door  = wdoc.door;
    if (wdoc.move)  config.move  = wdoc.move;
    if (wdoc.sense) config.sense = wdoc.sense;
    if (wdoc.light) config.light = wdoc.light;
    if (wdoc.sound) config.sound = wdoc.sound;
    if (wdoc.dir)   config.dir   = wdoc.dir;
    return [{ ax: anchor.ax, ay: anchor.ay, bx: anchor.bx, by: anchor.by,
      topOffset: wallTop - baseElevation, bottomOffset: wallBottom - baseElevation, config }];
  });
}

export async function applyWallDefs(doc: TileDocument, defs: WallDef[]): Promise<void> {
  if (!defs.length) return;
  await deleteLinkedWalls(doc);
  await setLinkedWallIds(doc, await createWallsFromDefs(doc, defs));
}

export async function applyDoorBehavior(doc: TileDocument, isOpen: boolean): Promise<void> {
  const b = getDoorBehavior(doc);
  if (b.mode === "none") return;
  if (!isOpen) { await doc.update({ hidden: false, alpha: 1 }); return; }
  if (b.mode === "hide") { await doc.update({ hidden: true }); return; }
  if (b.mode === "fade") { await doc.update({ alpha: b.opacity }); return; }
}

export async function cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior> {
  const cur  = getDoorBehavior(doc);
  const next: DoorBehavior =
    cur.mode === "none" ? { mode: "hide" } :
    cur.mode === "hide" ? { mode: "fade", opacity: 0.2 } :
    { mode: "none" };
  await setDoorBehavior(doc, next);
  return next;
}
