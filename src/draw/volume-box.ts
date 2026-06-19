// PIXI drawing utilities for the 3D volume box. Purely functional — no canvas reads.
import { ORANGE, BLACK, ALPHA_FRONT_OUTLINE, ALPHA_FRONT_FILL, ALPHA_BACK_OUTLINE, ALPHA_BACK_FILL } from "./constants";
import type { WorldBoxVerts, DrawAPI } from '../render';

export type BoxVerts = WorldBoxVerts;
export type P = { x: number; y: number };

export function drawAnchorLine(g: DrawAPI, v: BoxVerts): void {
  if (Math.abs(v.elevation) < 0.01) return;
  const dx = v.baseCenter.x - v.ground.x;
  const dy = v.baseCenter.y - v.ground.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 4) return;
  const ux = dx / len, uy = dy / len;
  const gap = 7;
  const x1 = v.ground.x + ux * gap,     y1 = v.ground.y + uy * gap;
  const x2 = v.baseCenter.x - ux * gap, y2 = v.baseCenter.y - uy * gap;
  g.lineStyle(2, BLACK, 0.3);
  g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.lineStyle(1, ORANGE, 0.7);
  g.moveTo(x1, y1); g.lineTo(x2, y2);
}

export function drawBox(g: DrawAPI, v: BoxVerts): void {
  const edges: Array<[P, P, boolean]> = [
    [v.SE_base, v.NE_base, true],
    [v.SE_base, v.SW_base, false],
    [v.NW_base, v.NE_base, true],
    [v.NW_base, v.SW_base, false],
    [v.SW_base, v.SW_top,  false],
    [v.SE_base, v.SE_top,  false],
    [v.NW_base, v.NW_top,  false],
    [v.NE_base, v.NE_top,  true],
    [v.NE_top,  v.SE_top,  false],
    [v.SW_top,  v.SE_top,  false],
    [v.SW_top,  v.NW_top,  false],
    [v.NE_top,  v.NW_top,  false],
  ];
  for (const [a, b, back] of edges) {
    g.lineStyle(2, BLACK, back ? ALPHA_BACK_OUTLINE : ALPHA_FRONT_OUTLINE);
    g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
  }
  for (const [a, b, back] of edges) {
    g.lineStyle(1, ORANGE, back ? ALPHA_BACK_FILL : ALPHA_FRONT_FILL);
    g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
  }
  g.endFill();
}
