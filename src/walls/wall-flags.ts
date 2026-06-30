// Linked-wall and door-behavior flag accessors for tile documents.

import { MODULE_ID } from "../core";
import type { DoorBehavior } from "./wall-types";
import { wallsLayer, type WallDoc } from "./wall-coords";

export function getLinkedWallIds(doc: TileDocument): string[] {
  const v = doc.getFlag(MODULE_ID, "linkedWallIds");
  return Array.isArray(v) ? (v as string[]) : [];
}

export async function setLinkedWallIds(doc: TileDocument, ids: string[], opts: object = {}): Promise<void> {
  await (doc as unknown as { update(d: object, o?: object): Promise<unknown> })
    .update({ [`flags.${MODULE_ID}.linkedWallIds`]: ids }, opts);
}

export async function pruneLinkedWalls(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc);
  const layer = wallsLayer();
  const live = ids.filter(id => layer.get(id));
  if (live.length !== ids.length) {
    await setLinkedWallIds(doc, live);
  }
}

export function getDoorBehavior(doc: TileDocument): DoorBehavior {
  const v = doc.getFlag(MODULE_ID, "doorBehavior");
  let result: DoorBehavior;
  if (v && typeof v === "object" && "mode" in v) {
    result = v as DoorBehavior;
  } else {
    result = { mode: "none" };
  }
  return result;
}

export async function setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void> {
  await doc.setFlag(MODULE_ID, "doorBehavior", b);
}

export function hasLinkedDoor(doc: TileDocument): boolean {
  const ids = getLinkedWallIds(doc);
  const layer = wallsLayer();
  return ids.some(id => {
    const w = layer.get(id);
    const wdoc = w ? (w.document as WallDoc) : null;
    return wdoc && (wdoc.door ?? 0) > 0;
  });
}

export function isLinkedDoorOpen(doc: TileDocument): boolean {
  const ids = getLinkedWallIds(doc);
  const layer = wallsLayer();
  return ids.some(id => {
    const w = layer.get(id);
    const wdoc = w ? (w.document as WallDoc) : null;
    return wdoc && (wdoc.door ?? 0) > 0 && (wdoc.ds ?? 0) > 0;
  });
}
