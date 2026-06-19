// Footprint math for tiles and tokens.
// The one place that reads CanvasEnv.gridSize() + currentProjection() to produce world-space geometry.

import { VolumeFlags, elevToCanvas, getElevation, CanvasEnv } from '../core';
import { currentProjection } from '../transform';

export type P2 = { x: number; y: number };

export interface WorldBoxVerts {
  NW_base: P2; NE_base: P2; SW_base: P2; SE_base: P2;
  NW_top:  P2; NE_top:  P2; SW_top:  P2; SE_top:  P2;
  ground:     P2;
  baseCenter: P2;
  topCenter:  P2;
  elevation:  number;
}

export type TileFootprint = { tx: number; ty: number; tw: number; th: number };

function pt(x: number, y: number): P2 { return { x, y }; }

function buildVerts(
  tx: number, ty: number, tw: number, th: number,
  elevPx: number, elevTopPx: number, hx: number, hy: number, elevation: number,
): WorldBoxVerts {
  return {
    NW_base: pt(tx + hx * elevPx,       ty + hy * elevPx),
    NE_base: pt(tx + tw + hx * elevPx,  ty + hy * elevPx),
    SW_base: pt(tx + hx * elevPx,       ty + th + hy * elevPx),
    SE_base: pt(tx + tw + hx * elevPx,  ty + th + hy * elevPx),
    NW_top:  pt(tx + hx * elevTopPx,       ty + hy * elevTopPx),
    NE_top:  pt(tx + tw + hx * elevTopPx,  ty + hy * elevTopPx),
    SW_top:  pt(tx + hx * elevTopPx,       ty + th + hy * elevTopPx),
    SE_top:  pt(tx + tw + hx * elevTopPx,  ty + th + hy * elevTopPx),
    ground:     pt(tx + tw / 2,                          ty + th / 2),
    baseCenter: pt(tx + tw / 2 + hx * elevPx,    ty + th / 2 + hy * elevPx),
    topCenter:  pt(tx + tw / 2 + hx * elevTopPx, ty + th / 2 + hy * elevTopPx),
    elevation,
  };
}

export const IsoGeometry = {
  tileVerts(tile: Tile): WorldBoxVerts {
    const tw = tile.document.width  ?? 0;
    const th = tile.document.height ?? 0;
    const tx = (tile.document.x ?? 0) - tw / 2;
    const ty = (tile.document.y ?? 0) - th / 2;
    const proj      = currentProjection();
    const gridSize  = CanvasEnv.gridSize();
    const gridDist  = CanvasEnv.gridDistance();
    const elevation = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH    = VolumeFlags.getEffectiveTileHeight(tile.document);
    const elevPx    = elevToCanvas(elevation, gridSize, gridDist);
    const { x: hx, y: hy } = proj.heightDir;
    return buildVerts(tx, ty, tw, th, elevPx, elevPx + boundH * gridSize, hx, hy, elevation);
  },

  tokenVerts(token: Token): WorldBoxVerts {
    const fp        = IsoGeometry.footprint(token);
    const gridSize  = CanvasEnv.gridSize();
    const gridDist  = CanvasEnv.gridDistance();
    const proj      = currentProjection();
    const elevation = getElevation(token.document);
    const boundH    = VolumeFlags.getTokenHeight(token.document);
    const elevPx    = elevToCanvas(elevation, gridSize, gridDist);
    const { x: hx, y: hy } = proj.heightDir;
    return buildVerts(fp.tx, fp.ty, fp.tw, fp.th, elevPx, elevPx + boundH * gridSize, hx, hy, elevation);
  },

  footprint(token: Token): TileFootprint {
    const gridSize = CanvasEnv.gridSize();
    return {
      tx: token.document.x ?? 0,
      ty: token.document.y ?? 0,
      tw: (token.document.width  ?? 1) * gridSize,
      th: (token.document.height ?? 1) * gridSize,
    };
  },
};
