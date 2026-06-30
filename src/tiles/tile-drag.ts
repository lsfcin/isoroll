// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { canvasZoom, gridDistance, elevToCanvas, screenToCanvas, CanvasEnv } from "../core";
import { currentProjection } from "../transform";

import { snapQuarterPx, snapQuarterUnits, projectImgOffset, projectImgYScale, projectImgScale } from "../gizmos";

export { IMG_YSCALE_SNAP_PX } from "../gizmos";

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
  elevPx: number, elevTopPx: number, heightDirX: number, heightDirY: number,
  imgBL?: { x: number; y: number } | null,
  imgTR?: { x: number; y: number } | null,
  imgBC?: { x: number; y: number } | null,
  imgTC?: { x: number; y: number } | null,
): Record<HandleType, { cx: number; cy: number }> {
  const seMidX = tx + tw + heightDirX * (elevPx + elevTopPx) / 2;
  const seMidY = ty + th + heightDirY * (elevPx + elevTopPx) / 2;
  return {
    width:     { cx: tx + heightDirX * elevTopPx,          cy: ty + th / 2 + heightDirY * elevTopPx },
    height:    { cx: tx + tw / 2 + heightDirX * elevTopPx, cy: ty + th + heightDirY * elevTopPx },
    boundH:    { cx: tx + tw + heightDirX * elevTopPx,  cy: ty + th / 2 + heightDirY * elevTopPx },
    elevation: { cx: seMidX,                            cy: seMidY },
    scale:     { cx: tx + tw + heightDirX * elevTopPx,     cy: ty + th + heightDirY * elevTopPx },
    move:      { cx: tx + tw / 2 + heightDirX * elevPx, cy: ty + th / 2 + heightDirY * elevPx },
    imgOffset: { cx: imgBL?.x ?? tx,                    cy: imgBL?.y ?? (ty + th) },
    imgScale:  { cx: imgTR?.x ?? (tx + tw),             cy: imgTR?.y ?? ty },
    imgYScale: { cx: imgTC?.x ?? (tx + tw / 2),         cy: imgTC?.y ?? ty },
    swapSide:  { cx: imgBC?.x ?? (tx + tw / 2),         cy: imgBC?.y ?? (ty + th) },
  };
}

type DragResult = {
  tw: number; th: number; boundH: number; elev: number;
  docX: number; docY: number;
  imgOffX: number; imgOffY: number; imgScale: number; imgYScale: number;
};

type Wt = PIXI.Matrix;

function applyScaleDrag(
  drag: DragState, dx: number, dy: number,
  wt: Wt, zoom: number, gridSize: number, r: DragResult,
): void {
  // Project screen delta onto the canvas diagonal (+1,+1) — the SE direction.
  const d     = (dx * wt.a + dy * wt.b + dx * wt.c + dy * wt.d) / (2 * zoom);
  const ratio = drag.startH > 0 ? drag.startW / drag.startH : 1;
  const snpW  = snapQuarterPx(drag.startW + d, gridSize);
  r.tw = Math.max(gridSize * 0.25, snpW);
  const snpH  = snapQuarterPx(r.tw / ratio, gridSize);
  r.th = Math.max(gridSize * 0.25, snpH);
}

function applySizeDrag(
  drag: DragState, dx: number, dy: number,
  wt: Wt, zoom: number, gridSize: number, gridDist: number,
  r: DragResult,
): void {
  switch (drag.type) {
    case "width": {
      const d   = (dx * wt.a + dy * wt.b) / zoom;
      const snp = snapQuarterPx(drag.startW - d, gridSize);
      r.tw = Math.max(gridSize * 0.25, snp);
      break;
    }
    case "height": {
      const d   = (dx * wt.c + dy * wt.d) / zoom;
      const snp = snapQuarterPx(drag.startH + d, gridSize);
      r.th = Math.max(gridSize * 0.25, snp);
      break;
    }
    case "boundH": {
      const delta = (-dy) / (zoom * gridSize);
      const snp   = snapQuarterUnits(drag.startBoundH + delta);
      r.boundH = Math.max(0.25, snp);
      break;
    }
    case "elevation": {
      // Screen up (dy < 0) = increase elevation; snap to integer feet
      const deltaFeet = (-dy) / (zoom * gridSize / gridDist);
      r.elev = Math.round(drag.startElev + deltaFeet);
      break;
    }
    case "scale": {
      applyScaleDrag(drag, dx, dy, wt, zoom, gridSize, r);
      break;
    }
    default: {
      break;
    }
  }
}

function applyPosDrag(
  drag: DragState, dx: number, dy: number, gx: number, gy: number,
  wt: Wt, zoom: number, gridSize: number, gridDist: number,
  r: DragResult,
): void {
  switch (drag.type) {
    case "move": {
      const { x: cdx, y: cdy } = screenToCanvas(dx, dy, wt);
      r.docX = snapQuarterPx(drag.startDocX + cdx, gridSize);
      r.docY = snapQuarterPx(drag.startDocY + cdy, gridSize);
      break;
    }
    case "imgOffset": {
      const off = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY);
      r.imgOffX = off.x;
      r.imgOffY = off.y;
      break;
    }
    case "imgScale": {
      const proj   = currentProjection();
      const hDir   = proj.heightDir;
      const elevPx = elevToCanvas(drag.startElev, gridSize, gridDist);
      const cx     = drag.startDocX + hDir.x * elevPx + drag.startImgOffX;
      const cy     = drag.startDocY + hDir.y * elevPx + drag.startImgOffY;
      r.imgScale = projectImgScale(gx, gy, drag.startGX, drag.startGY, drag.startImgScale, cx, cy, wt);
      break;
    }
    case "imgYScale": {
      r.imgYScale = projectImgYScale(dx, dy, wt, zoom, drag.startImgYScale, drag.startImgHalfH);
      break;
    }
    default: {
      break;
    }
  }
}

// Project screen delta onto the resize/elevation axis, snap, return new values.
// wt = canvas.app.stage.worldTransform; zoom = canvasZoom() (separate so callers can reuse).
export function projectDrag(drag: DragState, gx: number, gy: number): DragResult {
  const dx       = gx - drag.startGX;
  const dy       = gy - drag.startGY;
  const wt       = CanvasEnv.worldTransform();
  const zoom     = canvasZoom();
  const gridSize = CanvasEnv.gridSize();
  const gridDist = gridDistance();
  const r: DragResult = {
    tw: drag.startW, th: drag.startH,
    boundH: drag.startBoundH, elev: drag.startElev,
    docX: drag.startDocX, docY: drag.startDocY,
    imgOffX: drag.startImgOffX, imgOffY: drag.startImgOffY,
    imgScale: drag.startImgScale, imgYScale: drag.startImgYScale,
  };
  applySizeDrag(drag, dx, dy, wt, zoom, gridSize, gridDist, r);
  applyPosDrag(drag, dx, dy, gx, gy, wt, zoom, gridSize, gridDist, r);
  return r;
}

// Re-export commit and history helpers so existing importers of this module are unaffected.
export { commitDrag } from "./tile-drag-commit";
export { storeDragHistory } from "./tile-drag-history";
