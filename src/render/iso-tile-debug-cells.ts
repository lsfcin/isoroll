// iso-tile-debug-cells.ts — per-cell slice marker rendering for debugSlices mode.
import { CanvasEnv } from "../core";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";
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

// Draws a small filled circle (corner marker) at world position (wx, wy).
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

// Project a world point to image-x, applying flip mirroring around anchor.
function _imgX(wx: number, wy: number, ax: number, fw: number, flipped: boolean, mesh: MeshRef): number {
  const uv = transformCoord({ x: wx, y: wy }, "WORLD", "IMAGE", { mesh }) as P2;
  return (flipped ? 2 * ax - uv.x : uv.x) * fw;
}

// Draws one colored triangle per overlapping slice per grid cell.
// Uses only the NORTH (NE world corner, top of screen diamond) and SOUTH (SW world corner,
// bottom of screen diamond). Both share worldX+worldY = const → identical imageX → zero range
// in pure iso. ±1px epsilon handles cells whose N/S imageX lands exactly on a cut, associating
// them with both adjacent slices. Result: exactly 1 slice per cell, or 2 at boundaries.
export function drawCellMarkers(wc: PIXI.Container, p: SliceDebugParams): void {
  const { tile, mesh, origFrame, nSlices, Wg, Hg, flipped, cuts } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - (tile.document.width ?? 0) / 2;
  const nwY = tile.document.y - (tile.document.height ?? 0) / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const ax = (mesh as MeshRef).anchor?.x ?? 0.5;
  const fw = origFrame.width;
  const r = gs * 0.18;
  const meshRef = mesh as MeshRef;

  // Slice x-extents in image space.
  const sliceBounds: [number, number][] = [];
  for (let i = 0; i < nSlices; i++) {
    sliceBounds.push([i === 0 ? 0 : cuts[i - 1], i === nSlices - 1 ? fw : cuts[i]]);
  }

  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const cx = snapX + dc * gs;
      const cy = snapY + dr * gs;
      // NORTH corner = top of screen diamond    = NE world corner (cx+gs, cy)
      // SOUTH corner = bottom of screen diamond = SW world corner (cx,    cy+gs)
      // Both share worldX+worldY = cx+cy+gs → same imageX in this projection → zero range.
      const northX = _imgX(cx + gs, cy,      ax, fw, flipped, meshRef);
      const southX = _imgX(cx,      cy + gs, ax, fw, flipped, meshRef);

      // Visual: white dot at N corner, yellow dot at S corner.
      const dotR = r * 0.35;
      _drawDot(wc, cx + gs, cy,      dotR, 0xffffff);  // N = white  (top  of diamond)
      _drawDot(wc, cx,      cy + gs, dotR, 0xffee00);  // S = yellow (bottom of diamond)

      const cellMinX = Math.min(northX, southX) - 1;
      const cellMaxX = Math.max(northX, southX) + 1;

      const overlapping: number[] = [];
      for (let si = 0; si < nSlices; si++) {
        const [sliceL, sliceR] = sliceBounds[si];
        if (cellMinX < sliceR && cellMaxX > sliceL) overlapping.push(si);
      }

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
