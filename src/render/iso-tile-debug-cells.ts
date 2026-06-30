// iso-tile-debug-cells.ts — per-cell slice marker rendering for debugSlices mode.
import { CanvasEnv } from "../core";
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

// Draws one colored triangle per grid cell of the tile, color matching the associated slice.
// Association mirrors the renderer's own diagonal formula (buildSlice: d=kStart+effectiveI)
// inverted: for cell offset (dc,dr), d=dc+dr, effectiveI=d-kStart, si=flipped?nSlices-1-effectiveI:effectiveI.
export function drawCellMarkers(wc: PIXI.Container, p: SliceDebugParams): void {
  const { tile, kStart, nSlices, Wg, Hg, flipped } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - (tile.document.width ?? 0) / 2;
  const nwY = tile.document.y - (tile.document.height ?? 0) / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const r = gs * 0.18;
  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const wx = snapX + (dc + 0.5) * gs;
      const wy = snapY + (dr + 0.5) * gs;
      const effectiveI = Math.max(0, dc + dr - kStart);
      const si = Math.min(nSlices - 1, flipped ? nSlices - 1 - effectiveI : effectiveI);
      _drawTriangle(wc, wx, wy, r, SLICE_COLORS[si % SLICE_COLORS.length]);
    }
  }
}
