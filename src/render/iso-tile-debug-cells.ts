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

// Draws one colored triangle per grid cell of the tile, color matching the associated slice.
// Association: project cell center to image-space x, find which cut interval it falls in.
export function drawCellMarkers(wc: PIXI.Container, p: SliceDebugParams): void {
  const { tile, mesh, origFrame, cuts, nSlices, Wg, Hg, flipped } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - (tile.document.width ?? 0) / 2;
  const nwY = tile.document.y - (tile.document.height ?? 0) / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const fw = origFrame.width;
  const ax = (mesh as MeshRef).anchor?.x ?? 0.5;
  const r = gs * 0.18;
  for (let dc = 0; dc < Wg; dc++) {
    for (let dr = 0; dr < Hg; dr++) {
      const wx = snapX + (dc + 0.5) * gs;
      const wy = snapY + (dr + 0.5) * gs;
      const uv = transformCoord({ x: wx, y: wy }, "WORLD", "IMAGE", { mesh }) as P2;
      const imgX = (flipped ? 2 * ax - uv.x : uv.x) * fw;
      let si = 0;
      for (let s = 0; s < cuts.length; s++) {
        if (imgX >= cuts[s]) si = s + 1;
        else break;
      }
      si = Math.min(si, nSlices - 1);
      _drawTriangle(wc, wx, wy, r, SLICE_COLORS[si % SLICE_COLORS.length]);
    }
  }
}
