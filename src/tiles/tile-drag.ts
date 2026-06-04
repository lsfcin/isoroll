// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { getProjection } from "../transform/constants";
import { MODULE_ID } from "../flags";
import { snapQuarterPx, snapQuarterUnits } from "../gizmos/mesh-corners";
import { canvasZoom, gridDistance, elevToCanvas, screenToCanvas } from "../util";
export { imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, clientToGlobal, snapQuarterPx, snapQuarterUnits } from "../gizmos/mesh-corners";

export type HandleType = "width" | "height" | "boundH" | "elevation" | "scale" | "move" | "imgOffset" | "imgScale" | "imgYScale" | "swapSide";

export interface DragState {
  type:           HandleType;
  tile:           Tile;
  startGX:        number;
  startGY:        number;
  startX:         number;
  startY:         number;
  startW:         number;
  startH:         number;
  startBoundH:    number;
  startElev:      number;
  startDocX:      number;
  startDocY:      number;
  startImgOffX:   number;
  startImgOffY:   number;
  startImgScale:  number;
  startImgYScale: number;
  startImgHalfH:  number;  // canvas px: half image height when imgYScale=1 (for snap calc)
}

// WeakMap key is PIXI.Container (Graphics extends Container; elevation handle is plain Container)
export const handleTypeMap = new WeakMap<PIXI.Container, HandleType>();

// Returns canvas-space positions for all handle anchors
export function handlePositions(
  tx: number, ty: number, tw: number, th: number,
  E: number, EH: number, hdx: number, hdy: number,
  imgBL?: { x: number; y: number } | null,
  imgTR?: { x: number; y: number } | null,
  imgBC?: { x: number; y: number } | null,
  imgTC?: { x: number; y: number } | null,
): Record<HandleType, { cx: number; cy: number }> {
  const seMidX = tx + tw + hdx * (E + EH) / 2;
  const seMidY = ty + th + hdy * (E + EH) / 2;
  return {
    width:     { cx: tx + hdx * E,              cy: ty + th / 2 + hdy * E },
    height:    { cx: tx + tw / 2 + hdx * E,     cy: ty + th + hdy * E },
    boundH:    { cx: tx + tw + hdx * EH,         cy: ty + th / 2 + hdy * EH },
    elevation: { cx: seMidX,                      cy: seMidY },
    scale:     { cx: tx + tw + hdx * E,           cy: ty + th + hdy * E },
    move:      { cx: tx + tw / 2 + hdx * E,       cy: ty + th / 2 + hdy * E },
    imgOffset: { cx: imgBL?.x ?? tx,              cy: imgBL?.y ?? (ty + th) },
    imgScale:  { cx: imgTR?.x ?? (tx + tw),       cy: imgTR?.y ?? ty },
    imgYScale: { cx: imgTC?.x ?? (tx + tw / 2),   cy: imgTC?.y ?? ty },
    swapSide:  { cx: imgBC?.x ?? (tx + tw / 2),   cy: imgBC?.y ?? (ty + th) },
  };
}

// Project screen delta onto the resize/elevation axis, snap, return new values.
// wt = canvas.app.stage.worldTransform (rotation+skew only); zoom separate.
// Screen-pixel snap zone for imgYScale to restore original proportion (1:1).
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
  if (Math.abs(ys - 1.0) * halfH * zoom < IMG_YSCALE_SNAP_PX) ys = 1.0;
  return ys;
}

export function projectImgScale(
  gx: number, gy: number, startGX: number, startGY: number,
  startScale: number, cx: number, cy: number, wt: WT6,
): number {
  const csx = wt.a * cx + wt.c * cy + wt.tx, csy = wt.b * cx + wt.d * cy + wt.ty;
  const dxRef = startGX - csx, dyRef = startGY - csy;
  const distRef = Math.sqrt(dxRef * dxRef + dyRef * dyRef);
  if (distRef <= 0) return startScale;
  const curDist = ((gx - csx) * dxRef + (gy - csy) * dyRef) / distRef;
  return Math.max(0.05, startScale * (curDist / distRef));
}

export function projectDrag(
  drag: DragState, gx: number, gy: number,
): { tw: number; th: number; boundH: number; elev: number; docX: number; docY: number; imgOffX: number; imgOffY: number; imgScale: number; imgYScale: number } {
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const wt    = canvas.app!.stage.worldTransform;
  const zoom = canvasZoom();
  const gs   = canvas.grid?.size ?? 100;
  const gd   = gridDistance();

  let tw = drag.startW, th = drag.startH, boundH = drag.startBoundH, elev = drag.startElev;
  let docX = drag.startDocX, docY = drag.startDocY;
  let imgOffX = drag.startImgOffX, imgOffY = drag.startImgOffY;
  let imgScale = drag.startImgScale;
  let imgYScale = drag.startImgYScale;
  switch (drag.type) {
    case "width": {
      const d = (dx * wt.a + dy * wt.b) / zoom;
      tw = Math.max(gs * 0.25, snapQuarterPx(drag.startW - d, gs));
      break;
    }
    case "height": {
      const d = (dx * wt.c + dy * wt.d) / zoom;
      th = Math.max(gs * 0.25, snapQuarterPx(drag.startH + d, gs));
      break;
    }
    case "boundH": {
      const delta = (-dy) / (zoom * gs);
      boundH = Math.max(0.25, snapQuarterUnits(drag.startBoundH + delta));
      break;
    }
    case "elevation": {
      // Screen up (dy < 0) = increase elevation; snap to integer feet
      const deltaFeet = (-dy) / (zoom * gs / gd);
      elev = Math.round(drag.startElev + deltaFeet);
      break;
    }
    case "scale": {
      // Project screen delta onto the canvas diagonal (+1,+1) — the SE direction.
      // Positive = dragging toward SE = growing. Scale both width and height proportionally.
      const d = (dx * wt.a + dy * wt.b + dx * wt.c + dy * wt.d) / (2 * zoom);
      const ratio = drag.startH > 0 ? drag.startW / drag.startH : 1;
      tw = Math.max(gs * 0.25, snapQuarterPx(drag.startW + d, gs));
      th = Math.max(gs * 0.25, snapQuarterPx(tw / ratio, gs));
      break;
    }
    case "move": {
      const { x: cdx, y: cdy } = screenToCanvas(dx, dy, wt);
      docX = snapQuarterPx(drag.startDocX + cdx, gs);
      docY = snapQuarterPx(drag.startDocY + cdy, gs);
      break;
    }
    case "imgOffset": {
      ({ x: imgOffX, y: imgOffY } = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY));
      break;
    }
    case "imgScale": {
      const { x: hdx, y: hdy } = getProjection(canvas.scene).heightDir;
      const E2 = elevToCanvas(drag.startElev, gs, gd);
      const cx = drag.startDocX + hdx * E2 + drag.startImgOffX;
      const cy = drag.startDocY + hdy * E2 + drag.startImgOffY;
      imgScale = projectImgScale(gx, gy, drag.startGX, drag.startGY, drag.startImgScale, cx, cy, wt);
      break;
    }
    case "imgYScale": {
      imgYScale = projectImgYScale(dx, dy, wt, zoom, drag.startImgYScale, drag.startImgHalfH);
      break;
    }
  }
  return { tw, th, boundH, elev, docX, docY, imgOffX, imgOffY, imgScale, imgYScale };
}

// Commit drag result to document
export function commitDrag(drag: DragState, gx: number, gy: number): void {
  const { tw, th, boundH, elev, docX, docY, imgOffX, imgOffY, imgScale, imgYScale } = projectDrag(drag, gx, gy);
  switch (drag.type) {
    case "width":     void drag.tile.document.update({ width: tw }); break;
    case "height":    void drag.tile.document.update({ height: th }); break;
    case "boundH":    void drag.tile.document.setFlag(MODULE_ID, "boundHeight", boundH); break;
    case "elevation": void drag.tile.document.update({ elevation: elev }); break;
    case "scale":     void drag.tile.document.update({ width: tw, height: th }); break;
    case "move":      void drag.tile.document.update({ x: docX, y: docY }); break;
    case "imgOffset":  { const gs = canvas.grid?.size ?? 100; void drag.tile.document.setFlag(MODULE_ID, "imageOffset", { x: imgOffX / gs, y: imgOffY / gs }); break; }
    case "imgScale":   void drag.tile.document.setFlag(MODULE_ID, "imageScale",  imgScale); break;
    case "imgYScale":  void drag.tile.document.setFlag(MODULE_ID, "imageYScale", imgYScale); break;
    case "swapSide":   break; // handled via pointerdown, not drag
  }
}
