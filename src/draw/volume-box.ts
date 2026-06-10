// Geometry helpers for the 3D volume overlay: vertex computation and box drawing.
import { VolumeFlags, gridDistance, elevToCanvas } from "../core";
import { currentProjection } from "../transform";

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
  elevPx: number, elevTopPx: number, heightDirX: number, heightDirY: number,
  elevation: number,
): BoxVerts {
  return {
    NW_base: point(tx + heightDirX * elevPx,       ty + heightDirY * elevPx),
    NE_base: point(tx + tw + heightDirX * elevPx,  ty + heightDirY * elevPx),
    SW_base: point(tx + heightDirX * elevPx,       ty + th + heightDirY * elevPx),
    SE_base: point(tx + tw + heightDirX * elevPx,  ty + th + heightDirY * elevPx),
    NW_top:  point(tx + heightDirX * elevTopPx,      ty + heightDirY * elevTopPx),
    NE_top:  point(tx + tw + heightDirX * elevTopPx, ty + heightDirY * elevTopPx),
    SW_top:  point(tx + heightDirX * elevTopPx,      ty + th + heightDirY * elevTopPx),
    SE_top:  point(tx + tw + heightDirX * elevTopPx, ty + th + heightDirY * elevTopPx),
    ground:     point(tx + tw / 2,                  ty + th / 2),
    baseCenter: point(tx + tw / 2 + heightDirX * elevPx,    ty + th / 2 + heightDirY * elevPx),
    topCenter:  point(tx + tw / 2 + heightDirX * elevTopPx, ty + th / 2 + heightDirY * elevTopPx),
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
  const heightDir = proj.heightDir;

  return buildBoxVerts(tx, ty, tw, th, elevPx, elevTopPx, heightDir.x, heightDir.y, elevation);
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
  const heightDir = proj.heightDir;

  return buildBoxVerts(tx, ty, tw, th, elevPx, elevTopPx, heightDir.x, heightDir.y, elevation);
}

let _shadowTex: PIXI.Texture | null = null;
function shadowTexture(): PIXI.Texture {
  if (_shadowTex) return _shadowTex;
  const size = 128, half = size / 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0,   "rgba(0,0,0,1)");
  grad.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _shadowTex = PIXI.Texture.from(cv);
  return _shadowTex;
}

export function drawGroundShadow(
  groundX: number, groundY: number, elevation: number,
  radius: number, opacity: number, shape: "circle" | "rect",
): PIXI.DisplayObject | null {
  if (elevation < 0) return null;
  const elevScale      = Math.min(2.5, 0.5 + Math.sqrt(Math.max(0, elevation)) * 0.17);
  const effectiveR     = radius * elevScale;
  const effectiveAlpha = Math.min(1, opacity * 4 * Math.max(0.1, 1 / (1 + elevation * 0.04)));
  if (shape === "circle") {
    const sprite = new PIXI.Sprite(shadowTexture());
    sprite.anchor.set(0.5);
    sprite.position.set(groundX, groundY);
    sprite.width = sprite.height = effectiveR * 2;
    sprite.alpha = effectiveAlpha;
    sprite.eventMode = "none";
    return sprite;
  }
  const g = new PIXI.Graphics();
  g.lineStyle(0);
  g.beginFill(BLACK, effectiveAlpha);
  g.drawRect(groundX - effectiveR, groundY - effectiveR, effectiveR * 2, effectiveR * 2);
  g.endFill();
  g.eventMode = "none";
  return g;
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
