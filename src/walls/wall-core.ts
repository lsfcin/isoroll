// Foundry shims, coordinate helpers, and linked-wall flag accessors.
import { MODULE_ID, VolumeFlags } from "../volume/flags";
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

// Anchors are normalized positions in image space (0=image-left, 1=image-right).
// Image center = tile center + imageOffset; image size = footprint × imageScale.
// At default imgOff=0 + imgScale=1 this collapses to the footprint formula.
export function imageRect(doc: TileDoc): { icx: number; icy: number; sw: number; sh: number } {
  const gs = (canvas as unknown as { grid?: { size?: number } }).grid?.size ?? 100;
  const imgOff   = VolumeFlags.getImageOffset(doc);
  const imgScale = VolumeFlags.getImageScale(doc);
  return {
    icx: doc.x + imgOff.x * gs,
    icy: doc.y + imgOff.y * gs,
    sw:  doc.width  * imgScale,
    sh:  doc.height * imgScale,
  };
}

export function anchorToCanvas(
  icx: number, icy: number, sw: number, sh: number, a: TileAnchor,
): [number, number, number, number] {
  return [icx - sw/2 + a.ax * sw, icy - sh/2 + a.ay * sh,
          icx - sw/2 + a.bx * sw, icy - sh/2 + a.by * sh];
}

export function defToCanvas(doc: TileDoc, def: WallDef): [number, number, number, number] {
  const { icx, icy, sw, sh } = imageRect(doc);
  return [icx - sw/2 + def.ax * sw, icy - sh/2 + def.ay * sh,
          icx - sw/2 + def.bx * sw, icy - sh/2 + def.by * sh];
}

export function canvasToAnchor(doc: TileDoc, c: number[]): TileAnchor {
  const { icx, icy, sw, sh } = imageRect(doc);
  return {
    ax: (c[0] - icx) / sw + 0.5, ay: (c[1] - icy) / sh + 0.5,
    bx: (c[2] - icx) / sw + 0.5, by: (c[3] - icy) / sh + 0.5,
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
