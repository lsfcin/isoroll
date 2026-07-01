// iso-tile-geom.ts — grid metric, frontier-corner, and sprite helpers for iso tile slicing.
import { VolumeFlags, CanvasEnv } from "../core";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";
import { PlaceableDoc, applyDocState } from "./fog-helpers";

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
  frontierWorldPts: P2[];
  meshRot: number;
  meshScX: number;
  meshFlipped: boolean;
}

// kStart = min(Wg-1, Hg-1): first diagonal band that contains a frontier (south/east face) cell.
// Used by depth assignment in _createTileSlices, NOT by cut computation (cuts use frontier corners now).
export function gridMetrics(tile: Tile): { gs: number; nwX: number; nwY: number; Wg: number; Hg: number; kStart: number } {
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
  const kWg = Math.max(0, Wg - 1);
  const kHg = Math.max(0, Hg - 1);
  const kStart = Math.min(kWg, kHg);
  return { gs, nwX, nwY, Wg, Hg, kStart };
}

export function tileSliceCount(tile: Tile): number {
  const { Wg, Hg } = gridMetrics(tile);
  return Math.max(1, Wg + Hg - 1);
}

// Bottom-cell corner collection: the V-shaped frontier facing the camera.
// Bottom-cell = cell closest to camera = (gridC0, gridR0 + Hg-1) for the SW viewpoint.
// Its two lateral corners (W and E) are cut points.
// Propagating UP the left column (frontier on the viewer's left), each cell's W corner is a cut.
// Propagating RIGHT along the bottom row (frontier on the viewer's right), each cell's E corner is a cut.
// Total = 2 + (Hg-1) + (Wg-1) = Wg+Hg corners. After projection+sort we drop the min & max
// (tile texture boundaries), leaving Wg+Hg-2 = nSlices-1 internal cuts.
//
// ORIENTATION-ROTATION HOOK: when the iso viewpoint rotates (8+1 multiview strategy), the bottom-cell
// and the propagation directions change. Adapt this helper then — keep the corner-collection shape
// identical (list of world points), so computeSliceCuts needs no change.
export function frontierCorners(Wg: number, Hg: number, gridC0: number, gridR0: number, gs: number): P2[] {
  const pts: P2[] = [];
  const botR = gridR0 + Hg - 1;              // bottom row of the tile footprint
  // WEST corner = leftmost diamond vertex = NW corner of grid square (c*gs, r*gs)
  // EAST corner = rightmost diamond vertex = SE corner of grid square ((c+1)*gs, (r+1)*gs)
  // In iso projection (rot -45°), screen-x ∝ world.x + world.y, so NW=min(leftmost), SE=max(rightmost).
  // bottom-cell at (gridC0, botR): both lateral corners
  pts.push({ x: gridC0 * gs,         y: botR * gs });            // WEST corner
  pts.push({ x: (gridC0 + 1) * gs,   y: (botR + 1) * gs });      // EAST corner
  // left propagation: cells above bottom-cell in the same column → WEST corner of each
  for (let r = botR - 1; r >= gridR0; r--) {
    pts.push({ x: gridC0 * gs,       y: r * gs });                // WEST corner
  }
  // right propagation: cells to the right of bottom-cell in the bottom row → EAST corner of each
  for (let c = gridC0 + 1; c < gridC0 + Wg; c++) {
    pts.push({ x: (c + 1) * gs,      y: (botR + 1) * gs });       // EAST corner
  }
  return pts;
}

export function computeSliceCuts(tile: Tile, mesh: Mesh, origFrame: PIXI.Rectangle): SliceState {
  const { gs, nwX, nwY, Wg, Hg } = gridMetrics(tile);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const ax = mesh.anchor?.x ?? 0.5;
  const gridC0 = Math.floor(nwX / gs);
  const gridR0 = Math.floor(nwY / gs);
  const corners = frontierCorners(Wg, Hg, gridC0, gridR0, gs);
  // Project each frontier corner to IMAGE space; flip-mirror around anchor (texture is mirrored when scale.x<0).
  const projected = corners.map(p => {
    const uv = transformCoord(p, "WORLD", "IMAGE", { mesh }) as P2;
    const uvx = flipped ? 2 * ax - uv.x : uv.x;
    const rounded = Math.round(uvx * origFrame.width);
    // Clamp to [0, fw] (fw included so out-of-bounds corners become 0 or fw, not fw-1).
    return Math.max(0, Math.min(origFrame.width, rounded));
  });
  const rawCuts = [...projected];
  projected.sort((a, b) => a - b);
  // Keep only strictly interior values (> 0 and < fw); deduplicate.
  // Out-of-bounds corners clamp to 0 or fw and are excluded, preventing phantom zero-width slices.
  const cuts = [...new Set(projected.filter(v => v > 0 && v < origFrame.width))];
  const meshRot = mesh.rotation ?? 0;
  const meshScX = Math.abs(mesh.scale?.x ?? 1);
  const meshFlipped = (mesh.scale?.x ?? 1) < 0;
  return { cuts, rawCuts, frontierWorldPts: corners, meshRot, meshScX, meshFlipped };
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
        if (cellMin < sR && cellMax > sL) result.get(si)!.push({ dc, dr });
      }
    }
  }
  return result;
}

// ---- Sprite helpers (stateless) ----

export const DEPTH_SCALE = 10000;

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
  gridC0: number; gridR0: number; kStart: number; Hg: number; elev: number; flipped: boolean;
}

export function buildSlice(mesh: Mesh, origFrame: PIXI.Rectangle, i: number, state: SliceState, nSlices: number, g: SliceGeom, doc: PlaceableDoc, layer: PIXI.Container): PIXI.Sprite {
  const { gridC0, gridR0, kStart, Hg, elev, flipped } = g;
  const cutLeft = i === 0 ? 0 : state.cuts[i - 1];
  const cutRight = i === nSlices - 1 ? origFrame.width : state.cuts[i];
  const sliceW = Math.max(1, cutRight - cutLeft);
  const tex = cloneSliceTexture(mesh.texture!, origFrame.x + cutLeft, origFrame.y, sliceW, origFrame.height);
  const sp = new PIXI.Sprite(tex);
  sp.eventMode = "passive";
  syncSlicePos(sp, mesh);
  initSliceAnchor(sp, mesh, origFrame.width, cutLeft, sliceW);
  // Depth = fr - fc (row minus col): NE-camera viewpoint where SW face is closest.
  // flipped: texture mirrored (scale.x<0), so slice i covers visual column (nSlices-1-i).
  const effectiveI = flipped ? nSlices - 1 - i : i;
  const d = kStart + effectiveI;
  const rc = Math.min(Hg - 1, d);
  const cc = d - rc;
  const tileSort = (doc as unknown as { sort?: number }).sort ?? 0;
  sp.zIndex = ((gridR0 + rc) - (gridC0 + cc) + elev) * DEPTH_SCALE + tileSort;
  applyDocState(sp, doc);
  layer.addChild(sp);
  return sp;
}
