// Geometry helpers for the 3D volume overlay: vertex computation and box drawing.
import { currentProjection } from "../transform/constants";
import { VolumeFlags } from "../flags";
import { gridDistance, elevToCanvas } from "../util";
import {
  ORANGE, BLACK,
  ALPHA_FRONT_OUTLINE, ALPHA_FRONT_FILL, ALPHA_BACK_OUTLINE, ALPHA_BACK_FILL,
} from "./constants";

export interface BoxVerts {
  NW_base: P; NE_base: P; SW_base: P; SE_base: P;
  NW_top:  P; NE_top:  P; SW_top:  P; SE_top:  P;
  ground:     P;
  baseCenter: P;
  topCenter:  P;
  elevation:  number;
}

export type P = { x: number; y: number };

export function point(x: number, y: number): P { return { x, y }; }


function buildBoxVerts(
  tx: number, ty: number, tw: number, th: number,
  elevPx: number, elevTopPx: number, hDirX: number, hDirY: number,
  elevation: number,
): BoxVerts {
  return {
    NW_base: point(tx + hDirX * elevPx,       ty + hDirY * elevPx),
    NE_base: point(tx + tw + hDirX * elevPx,  ty + hDirY * elevPx),
    SW_base: point(tx + hDirX * elevPx,       ty + th + hDirY * elevPx),
    SE_base: point(tx + tw + hDirX * elevPx,  ty + th + hDirY * elevPx),
    NW_top:  point(tx + hDirX * elevTopPx,      ty + hDirY * elevTopPx),
    NE_top:  point(tx + tw + hDirX * elevTopPx, ty + hDirY * elevTopPx),
    SW_top:  point(tx + hDirX * elevTopPx,      ty + th + hDirY * elevTopPx),
    SE_top:  point(tx + tw + hDirX * elevTopPx, ty + th + hDirY * elevTopPx),
    ground:     point(tx + tw / 2,                  ty + th / 2),
    baseCenter: point(tx + tw / 2 + hDirX * elevPx,    ty + th / 2 + hDirY * elevPx),
    topCenter:  point(tx + tw / 2 + hDirX * elevTopPx, ty + th / 2 + hDirY * elevTopPx),
    elevation,
  };
}

export function computeVerts(tile: Tile): BoxVerts {
  const tw = tile.document.width  ?? 0;
  const th = tile.document.height ?? 0;
  // document.x/y = tile CENTER in Foundry v14; subtract half-dims for top-left
  const tx = (tile.document.x ?? 0) - tw / 2;
  const ty = (tile.document.y ?? 0) - th / 2;

  const proj      = currentProjection();
  const gridSize  = canvas.grid?.size ?? 100;
  const gridDist  = gridDistance();
  const elevation = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
  const boundH    = VolumeFlags.getEffectiveTileHeight(tile.document);

  const elevPx    = elevToCanvas(elevation, gridSize, gridDist);
  const elevTopPx = elevPx + boundH * gridSize;
  const hDirX     = proj.heightDir.x, hDirY = proj.heightDir.y;

  return buildBoxVerts(tx, ty, tw, th, elevPx, elevTopPx, hDirX, hDirY, elevation);
}

// token.document.x/y = top-left (unlike tiles where it = center)
// token.document.width/height = grid units (tiles use canvas pixels)
export function computeTokenVerts(token: Token): BoxVerts {
  const gridSize  = canvas.grid?.size ?? 100;
  const gridDist  = gridDistance();
  const tw = (token.document.width  ?? 1) * gridSize;
  const th = (token.document.height ?? 1) * gridSize;
  const tx = token.document.x ?? 0;
  const ty = token.document.y ?? 0;

  const proj      = currentProjection();
  const elevation = (token.document as unknown as { elevation?: number }).elevation ?? 0;
  const boundH    = VolumeFlags.getTokenHeight(token.document);

  const elevPx    = elevToCanvas(elevation, gridSize, gridDist);
  const elevTopPx = elevPx + boundH * gridSize;
  const hDirX     = proj.heightDir.x, hDirY = proj.heightDir.y;

  return buildBoxVerts(tx, ty, tw, th, elevPx, elevTopPx, hDirX, hDirY, elevation);
}

export function drawAnchorLine(g: PIXI.Graphics, v: BoxVerts): void {
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

export function drawBox(g: PIXI.Graphics, v: BoxVerts): void {
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
