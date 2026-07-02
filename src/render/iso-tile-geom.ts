// iso-tile-geom.ts — grid metric, slice-cut, and sprite helpers for iso tile slicing.
import { VolumeFlags, CanvasEnv } from "../core";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";
import { PlaceableDoc, applyDocState } from "./fog-helpers";
import { frontierFaces, sliceDepthCell, depthZIndex } from "./iso-tile-depth";
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

export function gridMetrics(tile: Tile): { gs: number; nwX: number; nwY: number; Wg: number; Hg: number } {
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
  const frontierWorldPts: P2[] = worldFaces.map(wf => wf.a);
  const lastFace = worldFaces[worldFaces.length - 1];
  frontierWorldPts.push(lastFace.b);
  const rawCuts = frontierWorldPts.map(projX);
  const sorted = [...rawCuts];
  sorted.sort((a, b) => a - b);
  const interior = sorted.filter(v => v > 0 && v < fw);
  const cuts = [...new Set(interior)];
  const meshRot = mesh.rotation ?? 0;
  const meshScX = Math.abs(mesh.scale?.x ?? 1);
  const meshFlipped = (mesh.scale?.x ?? 1) < 0;
  return { cuts, rawCuts, faces, fw, frontierWorldPts, meshRot, meshScX, meshFlipped };
}

// ---- Cell→slice overlap utility ----

// Project world point to image-x, applying flip-mirror around anchor.
function _imgX(wx: number, wy: number, ax: number, fw: number, flipped: boolean, mesh: Mesh): number {
  const uv = transformCoord({ x: wx, y: wy }, "WORLD", "IMAGE", { mesh }) as P2;
  const uvx = flipped ? 2 * ax - uv.x : uv.x;
  return uvx * fw;
}

// Returns, for each slice index, the list of overlapping grid cells (dc, dr).
// Uses N corner=(cx+gs, cy) and S corner=(cx, cy+gs); ±1px epsilon handles boundary cells.
// Same algorithm as drawCellMarkers in iso-tile-debug-cells.ts.
export function sliceCellOverlaps(
  cuts: number[], fw: number, Wg: number, Hg: number,
  snapX: number, snapY: number, gs: number,
  ax: number, flipped: boolean, mesh: Mesh
): Map<number, Array<{ dc: number; dr: number }>> {
  const nSlices = cuts.length + 1;
  const result = new Map<number, Array<{ dc: number; dr: number }>>();
  const sliceBounds: [number, number][] = [];
  for (let i = 0; i < nSlices; i++) {
    result.set(i, []);
    sliceBounds.push([i === 0 ? 0 : cuts[i - 1], i === nSlices - 1 ? fw : cuts[i]]);
  }
  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const cx = snapX + dc * gs;
      const cy = snapY + dr * gs;
      const northX = _imgX(cx + gs, cy,      ax, fw, flipped, mesh);
      const southX = _imgX(cx,      cy + gs, ax, fw, flipped, mesh);
      const cellMin = Math.min(northX, southX) - 1;
      const cellMax = Math.max(northX, southX) + 1;
      for (let si = 0; si < nSlices; si++) {
        const [sL, sR] = sliceBounds[si];
        if (cellMin < sR && cellMax > sL) {
          const cells = result.get(si)!;
          cells.push({ dc, dr });
        }
      }
    }
  }
  return result;
}

// ---- Sprite helpers (stateless) ----

export function cloneSliceTexture(src: PIXI.Texture, x: number, y: number, w: number, h: number): PIXI.Texture {
  const t = src.clone();
  (t as unknown as { frame: PIXI.Rectangle }).frame = new PIXI.Rectangle(x, y, w, h);
  (t as unknown as { updateUvs?(): void }).updateUvs?.();
  return t;
}

export function syncSlicePos(s: PIXI.Sprite, m: Mesh): void {
  s.position.set(m.x, m.y);
  if (m.scale) {
    s.scale.set(m.scale.x, m.scale.y);
  }
  s.rotation = m.rotation ?? 0;
}

export function initSliceAnchor(s: PIXI.Sprite, m: Mesh, fw: number, cutLeft: number, sliceW: number): void {
  if (m.anchor) {
    s.anchor.x = (m.anchor.x * fw - cutLeft) / sliceW;
    s.anchor.y = m.anchor.y;
  }
}

export interface SliceGeom {
  elev: number;
  band: number;
}

export function buildSlice(mesh: Mesh, origFrame: PIXI.Rectangle, i: number, state: SliceState, nSlices: number, g: SliceGeom, doc: PlaceableDoc, layer: PIXI.Container): PIXI.Sprite {
  const cutLeft = i === 0 ? 0 : state.cuts[i - 1];
  const cutRight = i === nSlices - 1 ? origFrame.width : state.cuts[i];
  const sliceW = Math.max(1, cutRight - cutLeft);
  const tex = cloneSliceTexture(mesh.texture!, origFrame.x + cutLeft, origFrame.y, sliceW, origFrame.height);
  const sp = new PIXI.Sprite(tex);
  sp.eventMode = "passive";
  syncSlicePos(sp, mesh);
  initSliceAnchor(sp, mesh, origFrame.width, cutLeft, sliceW);
  const cell = sliceDepthCell(i, nSlices, state.cuts, state.fw, state.faces);
  sp.zIndex = depthZIndex(cell.row, cell.col, g.elev, g.band);
  applyDocState(sp, doc);
  layer.addChild(sp);
  return sp;
}
