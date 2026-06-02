// Foundry shims, coordinate helpers, and linked-wall flag accessors.
import { MODULE_ID } from "../volume/flags";
import type { WallDef, TileAnchor } from "./wall-types";

export type TileDoc = TileDocument & { x: number; y: number; width: number; height: number };
export type WallDoc = WallDocument & { c: number[]; door?: number };

export type WallsCollection = {
  get(id: string): { document: WallDoc } | undefined;
  controlled: { document: WallDoc }[];
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
