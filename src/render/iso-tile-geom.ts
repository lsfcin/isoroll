// iso-tile-geom.ts — pure slice-cut math: grid metrics, frontier-face projection, structural diff.
import { VolumeFlags, CanvasEnv } from "../core";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";
import { frontierFaces } from "./iso-tile-depth";
import type { SliceFace } from "./iso-tile-depth";

export type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
  rotation?: number;
};

export interface SliceState {
  cuts: number[];
  rawCuts: number[];
  faces: SliceFace[];
  fw: number;
  frontierWorldPts: P2[];
  meshRot: number;
  meshScX: number;
  meshFlipped: boolean;
}

export function gridMetrics(tile: Tile): {
  gs: number;
  nwX: number;
  nwY: number;
  Wg: number;
  Hg: number;
} {
  const gs = CanvasEnv.gridSize();
  const docW = tile.document.width ?? 0;
  const docH = tile.document.height ?? 0;
  const nwX = tile.document.x - docW / 2;
  const nwY = tile.document.y - docH / 2;
  const WgRight = Math.ceil((nwX + docW) / gs);
  const WgLeft = Math.floor(nwX / gs);
  const Wg = WgRight - WgLeft;
  const HgBottom = Math.ceil((nwY + docH) / gs);
  const HgTop = Math.floor(nwY / gs);
  const Hg = HgBottom - HgTop;
  return { gs, nwX, nwY, Wg, Hg };
}

export function tileSliceCount(tile: Tile): number {
  const { Wg, Hg } = gridMetrics(tile);
  return Math.max(1, Wg + Hg - 1);
}

// Cuts and faces both live in TEXTURE space: the flip mirror (scale.x<0) is baked into
// the projection for both, so slice bounds are directly comparable to face intervals.
// Cuts = strictly interior frontier-corner projections (texture boundaries excluded);
// out-of-bounds corners clamp to 0 or fw and drop out, preventing phantom slices.
export function computeSliceCuts(tile: Tile, mesh: Mesh, origFrame: PIXI.Rectangle): SliceState {
  const { gs, nwX, nwY, Wg, Hg } = gridMetrics(tile);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const ax = mesh.anchor?.x ?? 0.5;
  const gridC0 = Math.floor(nwX / gs);
  const gridR0 = Math.floor(nwY / gs);
  const fw = origFrame.width;
  const projX = (p: P2): number => {
    const uv = transformCoord(p, "WORLD", "IMAGE", { mesh }) as P2;
    const uvx = flipped ? 2 * ax - uv.x : uv.x;
    const rounded = Math.round(uvx * fw);
    const low = Math.max(0, rounded);
    return Math.min(fw, low);
  };
  const worldFaces = frontierFaces(Wg, Hg, gridC0, gridR0, gs);
  const faces: SliceFace[] = [];
  for (const wf of worldFaces) {
    const xa = projX(wf.a);
    const xb = projX(wf.b);
    const x0 = Math.min(xa, xb);
    const x1 = Math.max(xa, xb);
    faces.push({ row: wf.row, col: wf.col, x0, x1 });
  }
  // Frontier corners = face start points plus the last face's end point.
  const frontierWorldPts: P2[] = worldFaces.map((wf) => wf.a);
  const lastFace = worldFaces[worldFaces.length - 1];
  frontierWorldPts.push(lastFace.b);
  const rawCuts = frontierWorldPts.map(projX);
  const sorted = [...rawCuts];
  sorted.sort((a, b) => a - b);
  const interior = sorted.filter((v) => v > 0 && v < fw);
  const cuts = [...new Set(interior)];
  const meshRot = mesh.rotation ?? 0;
  const meshScX = Math.abs(mesh.scale?.x ?? 1);
  const meshFlipped = (mesh.scale?.x ?? 1) < 0;
  return { cuts, rawCuts, faces, fw, frontierWorldPts, meshRot, meshScX, meshFlipped };
}

// Structural drift between stored and freshly computed slice state → full rebuild needed.
// Pure translation keeps cuts identical (texture-relative); sub-cell shifts move them.
export function sliceStateChanged(
  prev: SliceState,
  fresh: SliceState,
  sliceCount: number,
): boolean {
  let changed = sliceCount !== fresh.cuts.length + 1 || prev.cuts.length !== fresh.cuts.length;
  if (!changed) {
    changed = fresh.cuts.some((c, i) => Math.abs(c - prev.cuts[i]) > 0.5);
  }
  if (!changed) {
    const rotDrift = Math.abs(fresh.meshRot - prev.meshRot) > 0.001;
    const scXDrift = Math.abs(fresh.meshScX - prev.meshScX) > 0.001;
    changed = rotDrift || scXDrift || fresh.meshFlipped !== prev.meshFlipped;
  }
  return changed;
}
