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
  const live = ids.filter(id => wallsLayer().get(id));
  if (live.length !== ids.length) await setLinkedWallIds(doc, live);
}

export function getDoorBehavior(doc: TileDocument): DoorBehavior {
  const v = doc.getFlag(MODULE_ID, "doorBehavior");
  if (v && typeof v === "object" && "mode" in v) return v as DoorBehavior;
  return { mode: "none" };
}

export async function setDoorBehavior(doc: TileDocument, b: DoorBehavior): Promise<void> {
  await doc.setFlag(MODULE_ID, "doorBehavior", b);
}

export function hasLinkedDoor(doc: TileDocument): boolean {
  return getLinkedWallIds(doc).some(id => {
    const w = wallsLayer().get(id);
    return w && ((w.document as WallDoc).door ?? 0) > 0;
  });
}

export function isLinkedDoorOpen(doc: TileDocument): boolean {
  return getLinkedWallIds(doc).some(id => {
    const w = wallsLayer().get(id);
    return w && ((w.document as WallDoc).door ?? 0) > 0 && ((w.document as WallDoc).ds ?? 0) > 0;
  });
}
