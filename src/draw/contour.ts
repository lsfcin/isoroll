// Unified dashed image-contour drawing shared by tile and token overlays.
import { BLACK, DASH_LEN, GAP_LEN } from "./constants";
import { CanvasEnv } from "../core";
import { drawDash } from "./shapes";

export interface MeshLike {
  x: number;
  y: number;
  rotation: number;
  scale: { x: number; y: number };
  texture?: { width: number; height: number };
  anchor?: { x: number; y: number };
}

export function drawMeshContour(g: PIXI.Graphics, mesh: MeshLike): void {
  if (!mesh.texture) return;
  const texW = mesh.texture.width, texH = mesh.texture.height;
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const sx = mesh.scale.x, sy = mesh.scale.y;
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  const local = [
    { x: -ax * texW,    y: -ay * texH    },
    { x: (1-ax) * texW, y: -ay * texH    },
    { x: (1-ax) * texW, y: (1-ay) * texH },
    { x: -ax * texW,    y: (1-ay) * texH },
  ];
  const pts = local.map(c => ({
    x: mesh.x + cr*(c.x*sx) - sr*(c.y*sy),
    y: mesh.y + sr*(c.x*sx) + cr*(c.y*sy),
  }));
  const wt = CanvasEnv.worldTransform();
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
