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

// Draws one colored triangle per grid cell, matching the slice whose frontier cell center is
// nearest in image-x to the grid cell's center. This implements "slice centralized over cell"
// correctly for multi-row tiles where screen-x ≠ image-x due to iso mesh skew.
export function drawCellMarkers(wc: PIXI.Container, p: SliceDebugParams): void {
  const { tile, mesh, origFrame, kStart, nSlices, Wg, Hg, flipped } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - (tile.document.width ?? 0) / 2;
  const nwY = tile.document.y - (tile.document.height ?? 0) / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const gridC0 = Math.round(snapX / gs);
  const gridR0 = Math.round(snapY / gs);
  const ax = (mesh as MeshRef).anchor?.x ?? 0.5;
  const fw = origFrame.width;
  const r = gs * 0.18;
  const meshRef = mesh as MeshRef;

  // Pre-compute each slice's frontier cell center image-x.
  const frontierImgX: number[] = new Array(nSlices);
  for (let si = 0; si < nSlices; si++) {
    const effectiveI = flipped ? nSlices - 1 - si : si;
    const d = kStart + effectiveI;
    const rc = Math.min(Hg - 1, d);
    const cc = d - rc;
    frontierImgX[si] = _imgX((gridC0 + cc + 0.5) * gs, (gridR0 + rc + 0.5) * gs, ax, fw, flipped, meshRef);
  }

  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const wx = snapX + (dc + 0.5) * gs;
      const wy = snapY + (dr + 0.5) * gs;
      const cellImgX = _imgX(wx, wy, ax, fw, flipped, meshRef);
      let si = 0;
      let bestDist = Infinity;
      for (let s = 0; s < nSlices; s++) {
        const dist = Math.abs(cellImgX - frontierImgX[s]);
        if (dist < bestDist) { bestDist = dist; si = s; }
      }
      _drawTriangle(wc, wx, wy, r, SLICE_COLORS[si % SLICE_COLORS.length]);
    }
  }
}
