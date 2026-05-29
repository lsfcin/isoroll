// Geometry helpers for the 3D volume overlay: vertex computation, dashed-line drawing.
import { getProjection } from "../transform/constants";
import { VolumeFlags } from "./flags";

export const ORANGE   = 0xff9829;
export const BLACK    = 0x000000;
export const DASH_LEN = 4;
export const GAP_LEN  = 5;
export const ANCHOR_DASH = 2;
export const ANCHOR_GAP  = 9;

export const ALPHA_FRONT_OUTLINE = 0.45;
export const ALPHA_FRONT_FILL    = 0.85;
export const ALPHA_BACK_OUTLINE  = 0.18;
export const ALPHA_BACK_FILL     = 0.35;

export interface BoxVerts {
  NW_base: P; NE_base: P; SW_base: P; SE_base: P;
  NW_top:  P; NE_top:  P; SW_top:  P; SE_top:  P;
  ground:     P;
  baseCenter: P;
  topCenter:  P;
  elevation:  number;
}

export type P = { x: number; y: number };

export function pt(x: number, y: number): P { return { x, y }; }

// Manually draw a dashed line (PIXI.Graphics has no native dash support)
export function drawDash(
  g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number,
  dashLen: number, gapLen: number,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  let pos = 0, drawing = true;
  g.moveTo(x1, y1);
  while (pos < len) {
    const seg = Math.min(drawing ? dashLen : gapLen, len - pos);
    pos += seg;
    const ex = x1 + ux * pos, ey = y1 + uy * pos;
    if (drawing) g.lineTo(ex, ey); else g.moveTo(ex, ey);
    drawing = !drawing;
  }
}

export function computeVerts(tile: Tile): BoxVerts {
  const tw = tile.document.width  ?? 0;
  const th = tile.document.height ?? 0;
  // document.x/y = tile CENTER in Foundry v14; subtract half-dims for top-left
  const tx = (tile.document.x ?? 0) - tw / 2;
  const ty = (tile.document.y ?? 0) - th / 2;

  const proj      = getProjection(canvas.scene);
  const gridSize  = canvas.grid?.size ?? 100;
  const gridDist  = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
  const elevation = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
  const boundH    = VolumeFlags.getTileHeight(tile.document);

  const E  = elevation * gridSize / gridDist;
  const EH = E + boundH * gridSize;
  const ex = proj.heightDir.x, ey = proj.heightDir.y;

  return {
    NW_base: pt(tx + ex * E,       ty + ey * E),
    NE_base: pt(tx + tw + ex * E,  ty + ey * E),
    SW_base: pt(tx + ex * E,       ty + th + ey * E),
    SE_base: pt(tx + tw + ex * E,  ty + th + ey * E),
    NW_top:  pt(tx + ex * EH,      ty + ey * EH),
    NE_top:  pt(tx + tw + ex * EH, ty + ey * EH),
    SW_top:  pt(tx + ex * EH,      ty + th + ey * EH),
    SE_top:  pt(tx + tw + ex * EH, ty + th + ey * EH),
    ground:     pt(tx + tw / 2,           ty + th / 2),
    baseCenter: pt(tx + tw / 2 + ex * E,  ty + th / 2 + ey * E),
    topCenter:  pt(tx + tw / 2 + ex * EH, ty + th / 2 + ey * EH),
    elevation,
  };
}
