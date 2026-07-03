// iso-tile-depth.ts — slice→cell depth assignment and zIndex banding for the iso sprite layer.
import type { P2 } from "../transform";

export const DEPTH_SCALE = 10000;
// Token clones sit half a band above tile slices of the same depth cell.
export const TOKEN_BAND = DEPTH_SCALE * 0.5;

// Depth→zIndex: row/col in grid units (fractional OK). band = sub-depth offset
// (tile sort band from tileSortBand, or TOKEN_BAND for token clones).
export const depthZIndex = (row: number, col: number, elev: number, band = 0): number => (row - col + elev) * DEPTH_SCALE + band;

// One camera-facing frontier face of the tile footprint, projected to image-x px.
export interface SliceFace { row: number; col: number; x0: number; x1: number }
// Same face with its two bounding world corners, before projection.
export interface WorldFace { row: number; col: number; a: P2; b: P2 }

// Camera-facing frontier faces of a Wg×Hg cell footprint, in walk order: west faces
// down the left column, the bottom cell (west→east corners, spanning 2 proj units),
// then south faces along the bottom row. Wg+Hg-1 faces; endpoints are the frontier corners.
//
// ORIENTATION-ROTATION HOOK: when the iso viewpoint rotates (8+1 multiview strategy),
// the frontier columns/rows change — adapt this helper only; projection and cell
// lookup are shape-agnostic.
export function frontierFaces(Wg: number, Hg: number, c0: number, r0: number, gs: number): WorldFace[] {
  const faces: WorldFace[] = [];
  const botR = r0 + Hg - 1;
  for (let r = r0; r < botR; r++) {
    faces.push({ row: r, col: c0, a: { x: c0 * gs, y: r * gs }, b: { x: c0 * gs, y: (r + 1) * gs } });
  }
  faces.push({ row: botR, col: c0, a: { x: c0 * gs, y: botR * gs }, b: { x: (c0 + 1) * gs, y: (botR + 1) * gs } });
  for (let c = c0 + 1; c < c0 + Wg; c++) {
    faces.push({ row: botR, col: c, a: { x: c * gs, y: (botR + 1) * gs }, b: { x: (c + 1) * gs, y: (botR + 1) * gs } });
  }
  return faces;
}

// The single depth cell for slice i: the frontier face nearest to (usually containing)
// the slice's image-x midpoint. Faces and cuts live in the same texture space (flip
// mirror baked into both projections), so no flip handling is needed here. Art that
// overhangs the footprint clamps to the nearest edge face.
export function sliceDepthCell(i: number, nSlices: number, cuts: number[], fw: number, faces: SliceFace[]): SliceFace {
  const left = i === 0 ? 0 : cuts[i - 1];
  const right = i === nSlices - 1 ? fw : cuts[i];
  const mid = (left + right) / 2;
  let best = faces[0];
  let bestDist = Infinity;
  for (const f of faces) {
    let d = 0;
    if (mid < f.x0) {
      d = f.x0 - mid;
    } else if (mid > f.x1) {
      d = mid - f.x1;
    }
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

// Rank of a tile among peers ordered by (document.sort, id), bounded below TOKEN_BAND.
// Raw Foundry sort values are 100000-spaced (performIntegerSort) and would swallow
// whole depth bands if added to the zIndex directly.
export function tileSortBand(tileId: string, peers: Array<{ id: string; sort: number }>): number {
  const ordered = [...peers];
  ordered.sort((a, b) => {
    let cmp = a.sort - b.sort;
    if (cmp === 0) {
      cmp = a.id.localeCompare(b.id);
    }
    return cmp;
  });
  const rank = ordered.findIndex(p => p.id === tileId);
  const clampedLow = Math.max(rank, 0);
  return Math.min(clampedLow, TOKEN_BAND - 1);
}
