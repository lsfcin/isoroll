// Unified dashed image-contour drawing shared by tile and token overlays.
import { BLACK, DASH_LEN, GAP_LEN } from "./constants";
import { drawDash } from "./shapes";
import type { MeshGeometry } from '../render';

// Kept for gizmos/mesh-corners.ts which still casts directly.
export interface MeshLike {
  x: number;
  y: number;
  rotation: number;
  scale: { x: number; y: number };
  texture?: { width: number; height: number };
  anchor?: { x: number; y: number };
}

export function drawMeshContour(g: PIXI.Graphics, geo: MeshGeometry | null, wt: PIXI.Matrix): void {
  if (!geo || geo.width === 0 || geo.height === 0) return;
  const texW = geo.width, texH = geo.height;
  const ax = geo.anchor.x, ay = geo.anchor.y;
  const sx = geo.scale.x, sy = geo.scale.y;
  const cr = Math.cos(geo.rotation), sr = Math.sin(geo.rotation);
  const local = [
    { x: -ax * texW,      y: -ay * texH      },
    { x: (1-ax) * texW,   y: -ay * texH      },
    { x: (1-ax) * texW,   y: (1-ay) * texH   },
    { x: -ax * texW,      y: (1-ay) * texH   },
  ];
  const pts = local.map(c => ({
    x: geo.x + cr*(c.x*sx) - sr*(c.y*sy),
    y: geo.y + sr*(c.x*sx) + cr*(c.y*sy),
  }));
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i+1)%4];
    const dx = b.x-a.x, dy = b.y-a.y;
    const canLen = Math.sqrt(dx*dx + dy*dy);
    const scrLen = Math.sqrt((wt.a*dx + wt.c*dy)**2 + (wt.b*dx + wt.d*dy)**2);
    const s = scrLen > 0 ? canLen/scrLen : 1;
    g.lineStyle(1.5, BLACK, 0.4);  drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN*s, GAP_LEN*s);
    g.lineStyle(1, 0xffffff, 0.9); drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN*s, GAP_LEN*s);
  }
}
