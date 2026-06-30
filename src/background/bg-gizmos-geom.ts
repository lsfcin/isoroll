// Background gizmo corner/scale geometry, extracted from bg-gizmos.ts.
import { CanvasEnv } from "../core";
import { currentProjection, CanvasTransform, getBgYScale } from "../transform";

export interface BgGeom {
  tr: { x: number; y: number };
  tc: { x: number; y: number };
  bl: { x: number; y: number };
  tl: { x: number; y: number };
  br: { x: number; y: number };
  sx: number;
  sCX: number;
  sCY: number;
  bgYS: number;
  baseH: number;
  topSc: number;
  leftSc: number;
}

function bgCorner(
  fx: number, fy: number, cx: number, cy: number,
  texW: number, texH: number, scX: number, scY: number, cosR: number, sinR: number,
): { x: number; y: number } {
  const lx = fx * texW * scX, ly = fy * texH * scY;
  return { x: cx + cosR * lx - sinR * ly, y: cy + sinR * lx + cosR * ly };
}

export function computeBgGeom(previewBg: PIXI.Sprite): BgGeom {
  const proj  = currentProjection();
  const gctEnabled = CanvasTransform.gctEffectiveEnabled();
  const gctTransformsBg = CanvasTransform.gctEffectiveTransformBg();
  const isoCT = gctEnabled && !gctTransformsBg;
  const cosR  = isoCT ? Math.cos(proj.reverseRotation) : 1;
  const sinR  = isoCT ? Math.sin(proj.reverseRotation) : 0;
  const texW = previewBg.texture?.width || 1;
  const texH = previewBg.texture?.height || 1;
  const bgX = previewBg.x, bgY = previewBg.y, bgW = previewBg.width || 1;
  const sx   = bgW / texW;
  const bgYS = getBgYScale();
  const scX  = isoCT ? sx * proj.counterFactor : sx;
  const scY  = isoCT ? sx * proj.ratio * proj.counterFactor * bgYS : sx;
  const cx   = bgX + bgW / 2, cy = bgY + texH * sx / 2;
  const baseH = Math.max(1, texH * sx * proj.ratio * proj.counterFactor / 2);
  const corners = [[.5,-.5],[0,-.5],[-.5,.5],[-.5,-.5],[.5,.5]]
    .map(([fx,fy]) => bgCorner(fx, fy, cx, cy, texW, texH, scX, scY, cosR, sinR));
  const [tr, tc, bl, tl, br] = corners;
  const wt = CanvasEnv.worldTransform();
  const topSc  = Math.hypot(wt.a*cosR + wt.c*sinR, wt.b*cosR + wt.d*sinR);
  const leftSc = Math.hypot(-wt.a*sinR + wt.c*cosR, -wt.b*sinR + wt.d*cosR);
  const sCX = wt.a * cx + wt.c * cy + wt.tx;
  const sCY = wt.b * cx + wt.d * cy + wt.ty;
  return { tr, tc, bl, tl, br, sx, sCX, sCY, bgYS, baseH, topSc, leftSc };
}
