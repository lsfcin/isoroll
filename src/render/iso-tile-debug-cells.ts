// iso-tile-debug-cells.ts — per-cell slice marker rendering for debugSlices mode.
import { CanvasEnv } from "../core";
import { sliceCellOverlaps } from "./iso-tile-geom";
import { SLICE_COLORS, _isV8 } from "./iso-tile-debug-paint";
import type { SliceDebugParams } from "./iso-tile-debug";

type GfxX = PIXI.Graphics & {
  eventMode?: string;
  beginFill?(c: number, a: number): void;
  endFill?(): void;
  closePath?(): void;
  fill?(o: { color: number }): void;
  stroke?: unknown;
};

type MeshRef = PIXI.DisplayObject & { anchor?: PIXI.ObservablePoint };

function _drawDot(wc: PIXI.Container, wx: number, wy: number, r: number, color: number): void {
  const g = new PIXI.Graphics() as GfxX;
  g.eventMode = "passive";
  if (!_isV8(g)) {
    g.beginFill!(color, 1);
    (g as unknown as { drawCircle(x: number, y: number, r: number): void }).drawCircle(wx, wy, r);
    g.endFill!();
  } else {
    (g as unknown as { circle(x: number, y: number, r: number): void }).circle(wx, wy, r);
    g.fill!({ color });
  }
  wc.addChild(g);
}

// Draws a colored equilateral triangle (pointing up) at world position (wx, wy).
function _drawTriangle(wc: PIXI.Container, wx: number, wy: number, r: number, color: number): void {
  const hr = r * Math.sqrt(3) / 2;
  const g = new PIXI.Graphics() as GfxX;
  g.eventMode = "passive";
  if (!_isV8(g)) {
    g.beginFill!(color, 0.85);
    g.moveTo(wx, wy - r);
    g.lineTo(wx + hr, wy + r * 0.5);
    g.lineTo(wx - hr, wy + r * 0.5);
    g.closePath!();
    g.endFill!();
  } else {
    g.moveTo(wx, wy - r);
    g.lineTo(wx + hr, wy + r * 0.5);
    g.lineTo(wx - hr, wy + r * 0.5);
    g.closePath!();
    g.fill!({ color });
  }
  wc.addChild(g);
}

// Draws one colored triangle per overlapping slice per grid cell.
// Uses only the NORTH (NE world corner, top of screen diamond) and SOUTH (SW world corner,
// bottom of screen diamond). Both share worldX+worldY = const → identical imageX → zero range
// in pure iso. ±1px epsilon handles cells whose N/S imageX lands exactly on a cut, associating
// them with both adjacent slices. Result: exactly 1 slice per cell, or 2 at boundaries.
export function drawCellMarkers(wc: PIXI.Container, p: SliceDebugParams): void {
  const { tile, mesh, origFrame, Wg, Hg, flipped, cuts } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - (tile.document.width ?? 0) / 2;
  const nwY = tile.document.y - (tile.document.height ?? 0) / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const ax = (mesh as MeshRef).anchor?.x ?? 0.5;
  const fw = origFrame.width;
  const r = gs * 0.18;
  const meshRef = mesh as MeshRef;

  // slice → overlapping cells; invert to cell key → overlapping slice indices for drawing.
  const overlaps = sliceCellOverlaps(cuts, fw, Wg, Hg, snapX, snapY, gs, ax, flipped, meshRef);
  const cellToSlices = new Map<number, number[]>();
  for (const [si, cells] of overlaps) {
    for (const { dc, dr } of cells) {
      const key = dc * Hg + dr;
      const arr = cellToSlices.get(key) ?? [];
      arr.push(si);
      cellToSlices.set(key, arr);
    }
  }

  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const cx = snapX + dc * gs;
      const cy = snapY + dr * gs;
      // N = top of screen diamond (NE world corner), S = bottom (SW world corner).
      const dotR = r * 0.35;
      _drawDot(wc, cx + gs, cy,      dotR, 0xffffff);  // N = white
      _drawDot(wc, cx,      cy + gs, dotR, 0xffee00);  // S = yellow

      const overlapping = cellToSlices.get(dc * Hg + dr) ?? [];
      const wx = cx + gs * 0.5;
      const wy = cy + gs * 0.5;
      const n = overlapping.length;
      for (let k = 0; k < n; k++) {
        const wyOff = wy + (k - (n - 1) / 2) * r * 1.5;
        _drawTriangle(wc, wx, wyOff, r, SLICE_COLORS[overlapping[k] % SLICE_COLORS.length]);
      }
    }
  }
}
