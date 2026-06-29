// Shared pure-math helpers for image-manipulation drag (offset, scale, Y-scale).
// Used by both tile gizmos and token gizmos — no tile/token-specific logic here.

import { screenToCanvas } from "../core";
export const IMG_YSCALE_SNAP_PX = 12;

type WT4 = { a: number; b: number; c: number; d: number };
type WT6 = WT4 & { tx: number; ty: number };

export function projectImgOffset(
  dx: number, dy: number, wt: WT4, startX: number, startY: number,
): { x: number; y: number } {
  const { x: cdx, y: cdy } = screenToCanvas(dx, dy, wt);
  return { x: startX + cdx, y: startY + cdy };
}

export function projectImgYScale(
  dx: number, dy: number, wt: WT4, zoom: number, startYScale: number, halfH: number,
): number {
  const canvasDY = screenToCanvas(dx, dy, wt).y;
  const newHalfH = halfH * startYScale - canvasDY;
  let ys = Math.max(0.05, newHalfH / halfH);
  if (Math.abs(ys - 1.0) * halfH * zoom < IMG_YSCALE_SNAP_PX) {
    ys = 1.0;
  }
  return ys;
}

export function projectImgScale(
  gx: number, gy: number, startGX: number, startGY: number,
  startScale: number, cx: number, cy: number, wt: WT6,
): number {
  const csx = wt.a * cx + wt.c * cy + wt.tx;
  const csy = wt.b * cx + wt.d * cy + wt.ty;
  const dxRef = startGX - csx;
  const dyRef = startGY - csy;
  const distRef = Math.sqrt(dxRef * dxRef + dyRef * dyRef);
  let result: number;
  if (distRef <= 0) {
    result = startScale;
  } else {
    const curDist = ((gx - csx) * dxRef + (gy - csy) * dyRef) / distRef;
    result = Math.max(0.05, startScale * (curDist / distRef));
  }
  return result;
}
