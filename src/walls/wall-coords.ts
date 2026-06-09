// Canvas coordinate helpers and Foundry shims for the walls system.
import { VolumeFlags } from "../flags";
import type { WallDef, TileAnchor } from "./wall-types";
import { gridDistance, elevToCanvas } from "../util";

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

// Anchors are in S-normalized space: both axes share S = max(docW, docH, boundH_px) × imgScale.
// Image center includes elevation offset; heightDir = {+1, -1} for all isoroll projections.
export function imageRect(doc: TileDoc): { icx: number; icy: number; sw: number; sh: number } {
  const gridSize = (canvas as unknown as { grid?: { size?: number } }).grid?.size ?? 100;
  const gridDist = gridDistance();
  const imgOff   = VolumeFlags.getImageOffset(doc);
  const imgScale = VolumeFlags.getImageScale(doc);
  const elev     = (doc as unknown as { elevation?: number }).elevation ?? 0;
  const elevPx   = elevToCanvas(elev, gridSize, gridDist);
  const boundH   = VolumeFlags.getTileHeight(doc) * gridSize;
  const S        = Math.max(doc.width, doc.height, boundH) * imgScale;
  return {
    icx: doc.x + elevPx + imgOff.x * gridSize,    // heightDir.x = +1
    icy: doc.y - elevPx + imgOff.y * gridSize,    // heightDir.y = -1
    sw:  S,
    sh:  S,
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
