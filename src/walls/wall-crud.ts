import { MODULE_ID, VolumeFlags } from "../core";
import { WallHistory } from "./wall-history";
import type { WallDef, WallConfig, TileAnchor } from "./wall-types";
import {
  wallsLayer, scene, defToCanvas, canvasToAnchor, tileRect,
  type TileDoc, type WallDoc,
} from "./wall-coords";
import { getLinkedWallIds, setLinkedWallIds } from "./wall-flags";

type Updateable = { update(d: object, o?: object): Promise<unknown> };

export function generateBaseWallDefs(doc: TileDocument): WallDef[] {
  const tDoc = doc as TileDoc;
  const { left, top, w, h } = tileRect(tDoc);
  const topOffset = VolumeFlags.getTileHeight(doc);
  const corners: [number, number, number, number][] = [
    [left,     top,     left + w, top    ],  // N
    [left + w, top,     left + w, top + h],  // E
    [left + w, top + h, left,     top + h],  // S
    [left,     top + h, left,     top    ],  // W
  ];
  return corners.map(c => ({ ...canvasToAnchor(tDoc, c), topOffset, bottomOffset: 0, config: {} }));
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
  const sc = scene();
  const created = await sc.createEmbeddedDocuments("Wall", wallData, { isUndo: true });
  const mapped = created.map(w => w.id ?? "");
  return mapped.filter(Boolean);
}

export async function deleteLinkedWalls(doc: TileDocument, skipHistory = false): Promise<void> {
  const layer = wallsLayer();
  const allIds = getLinkedWallIds(doc);
  const ids = allIds.filter(id => layer.get(id));
  if (!skipHistory && ids.length) {
    const prevData = ids.map(id => {
      const wdoc = layer.get(id)!.document as unknown as { toObject(): object };
      return wdoc.toObject();
    });
    WallHistory.push({ k: "delete", tileId: doc.id ?? "", prevData });
  }
  const sc = scene();
  if (ids.length) {
    await sc.deleteEmbeddedDocuments("Wall", ids, { isoroll: "wallBulkDelete", isUndo: true });
  }
  const tileUpdateable = doc as unknown as Updateable;
  await tileUpdateable.update({ [`flags.${MODULE_ID}.-=linkedWallIds`]: null }, { isUndo: true });
}

export async function linkSelectedWalls(doc: TileDocument): Promise<number> {
  const layer = wallsLayer();
  const controlled = layer.controlled;
  let result = 0;
  if (controlled.length) {
    const allLinked = getLinkedWallIds(doc);
    const existing = new Set(allLinked);
    const baseElevation = VolumeFlags.getTileBaseElevation(doc);
    const tileHeight = VolumeFlags.getTileHeight(doc);
    const wallUpdates: { _id: string; flags: object }[] = [];
    for (const wall of controlled) {
      const id = wall.document.id as string | null;
      if (id) {
        existing.add(id);
        const anchor = canvasToAnchor(doc as TileDoc, wall.document.c);
        wallUpdates.push({ _id: id, flags: { [MODULE_ID]: {
          parentTileId: doc.id,
          tileAnchor:  anchor,
          wallTop:     baseElevation + tileHeight,
          wallBottom:  baseElevation,
        }}});
      }
    }
    if (wallUpdates.length) {
      const sc = scene();
      await sc.updateEmbeddedDocuments("Wall", wallUpdates);
      await setLinkedWallIds(doc, [...existing]);
      result = wallUpdates.length;
    }
  }
  return result;
}

export async function unlinkAllWalls(doc: TileDocument): Promise<void> {
  const layer = wallsLayer();
  const allIds = getLinkedWallIds(doc);
  const ids = allIds.filter(id => layer.get(id));
  WallHistory.push({ k: "unlink-all", tileId: doc.id ?? "", prevIds: ids });
  const sc = scene();
  if (ids.length) {
    const wallFlagUpdates = ids.map(id => ({
      _id: id,
      flags: { [MODULE_ID]: { parentTileId: null, tileAnchor: null } },
    }));
    await sc.updateEmbeddedDocuments("Wall", wallFlagUpdates, { isUndo: true });
  }
  const tileUpdateable = doc as unknown as Updateable;
  await tileUpdateable.update({ [`flags.${MODULE_ID}.-=linkedWallIds`]: null }, { isUndo: true });
}

export async function generateBaseWalls(doc: TileDocument): Promise<void> {
  const layer = wallsLayer();
  const allLinked = getLinkedWallIds(doc);
  const linkedIds = allLinked.filter(id => layer.get(id));
  const prevData = linkedIds.map(id => {
    const wdoc = layer.get(id)!.document as unknown as { toObject(): object };
    return wdoc.toObject();
  });
  await deleteLinkedWalls(doc, true);
  const baseDefs = generateBaseWallDefs(doc);
  const newIds = await createWallsFromDefs(doc, baseDefs);
  await setLinkedWallIds(doc, newIds, { isUndo: true });
  WallHistory.push({ k: "create", tileId: doc.id ?? "", newIds, prevData });
}

function buildWallConfig(wdoc: WallDoc): Partial<WallConfig> {
  const config: Partial<WallConfig> = {};
  if (wdoc.door) {
    config.door = wdoc.door;
  }
  if (wdoc.move) {
    config.move = wdoc.move;
  }
  if (wdoc.sense) {
    config.sense = wdoc.sense;
  }
  if (wdoc.light) {
    config.light = wdoc.light;
  }
  if (wdoc.sound) {
    config.sound = wdoc.sound;
  }
  if (wdoc.dir) {
    config.dir = wdoc.dir;
  }
  return config;
}

function buildWallDef(
  id: string, layer: ReturnType<typeof wallsLayer>, baseElevation: number,
): WallDef | null {
  const wall = layer.get(id);
  let result: WallDef | null = null;
  if (wall) {
    const anchor = wall.document.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    if (anchor) {
      const wallTop    = (wall.document.getFlag(MODULE_ID, "wallTop")    as number | undefined) ?? baseElevation + 1;
      const wallBottom = (wall.document.getFlag(MODULE_ID, "wallBottom") as number | undefined) ?? baseElevation;
      const wdoc = wall.document as WallDoc;
      const config = buildWallConfig(wdoc);
      result = {
        ax: anchor.ax, ay: anchor.ay, bx: anchor.bx, by: anchor.by,
        topOffset: wallTop - baseElevation, bottomOffset: wallBottom - baseElevation, config,
      };
    }
  }
  return result;
}

export function extractWallDefs(doc: TileDocument): WallDef[] {
  const ids = getLinkedWallIds(doc);
  const layer = wallsLayer();
  const baseElevation = VolumeFlags.getTileBaseElevation(doc);
  const defs: WallDef[] = [];
  for (const id of ids) {
    const def = buildWallDef(id, layer, baseElevation);
    if (def) {
      defs.push(def);
    }
  }
  return defs;
}

export async function applyWallDefs(doc: TileDocument, defs: WallDef[]): Promise<void> {
  if (defs.length) {
    await deleteLinkedWalls(doc);
    const newIds = await createWallsFromDefs(doc, defs);
    await setLinkedWallIds(doc, newIds);
  }
}
