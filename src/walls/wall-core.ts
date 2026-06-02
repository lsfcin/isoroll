// Foundry shims, coordinate helpers, and linked-wall flag accessors.
import { MODULE_ID } from "../volume/flags";
import type { WallDef, TileAnchor, DoorBehavior } from "./wall-types";

export type TileDoc = TileDocument & { x: number; y: number; width: number; height: number };
export type WallDoc = WallDocument & {
  c: number[];
  ds: number;      // door state: 0=closed 1=open 2=locked
  door: number;    // 0=none 1=door 2=secret
  move: number;
  sight: number;   // v14+ field name (was "sense" in v12/v13)
  sense: number;   // v12/v13 fallback
  light: number;
  sound: number;
  dir: number;
};

export type WallsCollection = {
  get(id: string): { document: WallDoc } | undefined;
  controlled: { document: WallDoc }[];
  placeables: Array<{ document: WallDoc; id: string }>;
};
export type SceneEmbedded = {
  createEmbeddedDocuments(type: string, data: object[], opts?: object): Promise<{ id: string | null }[]>;
  updateEmbeddedDocuments(type: string, data: object[], opts?: object): Promise<unknown>;
  deleteEmbeddedDocuments(type: string, ids: string[], opts?: object): Promise<unknown>;
};

export function wallsLayer(): WallsCollection {
  return (canvas as unknown as { walls: WallsCollection }).walls;
}
export function scene(): SceneEmbedded {
  return canvas.scene as unknown as SceneEmbedded;
}

// tile.x/y = CENTER in Foundry v14
export function tileRect(doc: TileDoc): { left: number; top: number; w: number; h: number } {
  return { left: doc.x - doc.width / 2, top: doc.y - doc.height / 2, w: doc.width, h: doc.height };
}

export function defToCanvas(doc: TileDoc, def: WallDef): [number, number, number, number] {
  const { left, top, w, h } = tileRect(doc);
  return [left + def.ax * w, top + def.ay * h, left + def.bx * w, top + def.by * h];
}

export function canvasToAnchor(doc: TileDoc, c: number[]): TileAnchor {
  const { left, top, w, h } = tileRect(doc);
  return {
    ax: (c[0] - left) / w, ay: (c[1] - top) / h,
    bx: (c[2] - left) / w, by: (c[3] - top) / h,
  };
}

export function getLinkedWallIds(doc: TileDocument): string[] {
  const v = doc.getFlag(MODULE_ID, "linkedWallIds");
  return Array.isArray(v) ? (v as string[]) : [];
}

export async function setLinkedWallIds(doc: TileDocument, ids: string[]): Promise<void> {
  await doc.setFlag(MODULE_ID, "linkedWallIds", ids);
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
