// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { MODULE_ID, canvasZoom, gridDistance, elevToCanvas, screenToCanvas, CanvasEnv } from "../core";
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

// Project screen delta onto the resize/elevation axis, snap, return new values.
// wt = canvas.app.stage.worldTransform; zoom = canvasZoom() (separate so callers can reuse).
export function projectDrag(
  drag: DragState, gx: number, gy: number,
): { tw: number; th: number; boundH: number; elev: number; docX: number; docY: number; imgOffX: number; imgOffY: number; imgScale: number; imgYScale: number } {
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const wt       = CanvasEnv.worldTransform();
  const zoom     = canvasZoom();
  const gridSize = CanvasEnv.gridSize();
  const gridDist = gridDistance();

  let tw = drag.startW, th = drag.startH, boundH = drag.startBoundH, elev = drag.startElev;
  let docX = drag.startDocX, docY = drag.startDocY;
  let imgOffX = drag.startImgOffX, imgOffY = drag.startImgOffY;
  let imgScale = drag.startImgScale;
  let imgYScale = drag.startImgYScale;
  switch (drag.type) {
    case "width": {
      const d = (dx * wt.a + dy * wt.b) / zoom;
      tw = Math.max(gridSize * 0.25, snapQuarterPx(drag.startW - d, gridSize));
      break;
    }
    case "height": {
      const d = (dx * wt.c + dy * wt.d) / zoom;
      th = Math.max(gridSize * 0.25, snapQuarterPx(drag.startH + d, gridSize));
      break;
    }
    case "boundH": {
      const delta = (-dy) / (zoom * gridSize);
      boundH = Math.max(0.25, snapQuarterUnits(drag.startBoundH + delta));
      break;
    }
    case "elevation": {
      // Screen up (dy < 0) = increase elevation; snap to integer feet
      const deltaFeet = (-dy) / (zoom * gridSize / gridDist);
      elev = Math.round(drag.startElev + deltaFeet);
      break;
    }
    case "scale": {
      // Project screen delta onto the canvas diagonal (+1,+1) — the SE direction.
      // Positive = dragging toward SE = growing. Scale both width and height proportionally.
      const d = (dx * wt.a + dy * wt.b + dx * wt.c + dy * wt.d) / (2 * zoom);
      const ratio = drag.startH > 0 ? drag.startW / drag.startH : 1;
      tw = Math.max(gridSize * 0.25, snapQuarterPx(drag.startW + d, gridSize));
      th = Math.max(gridSize * 0.25, snapQuarterPx(tw / ratio, gridSize));
      break;
    }
    case "move": {
      const { x: cdx, y: cdy } = screenToCanvas(dx, dy, wt);
      docX = snapQuarterPx(drag.startDocX + cdx, gridSize);
      docY = snapQuarterPx(drag.startDocY + cdy, gridSize);
      break;
    }
    case "imgOffset": {
      ({ x: imgOffX, y: imgOffY } = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY));
      break;
    }
    case "imgScale": {
      const heightDir   = currentProjection().heightDir;
      const elevPx = elevToCanvas(drag.startElev, gridSize, gridDist);
      const cx = drag.startDocX + heightDir.x * elevPx + drag.startImgOffX;
      const cy = drag.startDocY + heightDir.y * elevPx + drag.startImgOffY;
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

// All drag updates suppress Foundry's auto-store (isUndo:true). storeDragHistory() must be
// called once on pointerup to push the pre-drag original manually. This ensures one correct
// undo entry regardless of how many pointermove frames fired during the drag.
const DRAG_OPTS = { isoroll: "gizmoDrag", isUndo: true } as const;

export function commitDrag(drag: DragState, gx: number, gy: number): void {
  const { tw, th, boundH, elev, docX, docY, imgOffX, imgOffY, imgScale, imgYScale } = projectDrag(drag, gx, gy);
  switch (drag.type) {
    case "width":     void drag.tile.document.update({ width: tw },            DRAG_OPTS); break;
    case "height":    void drag.tile.document.update({ height: th },           DRAG_OPTS); break;
    case "boundH": {
      const tw2 = drag.tile.document.width ?? 0;
      const th2 = drag.tile.document.height ?? 0;
      void drag.tile.document.update({
        [`flags.${MODULE_ID}.boundHeight`]:     boundH,
        [`flags.${MODULE_ID}.boundHeightBase`]: { w: tw2, h: th2 },
      }, DRAG_OPTS);
      break;
    }
    case "elevation": void drag.tile.document.update({ elevation: elev },      DRAG_OPTS); break;
    case "scale": {
      const scaleMax  = Math.max(drag.startW, drag.startH);
      const newMax    = Math.max(tw, th);
      const newBoundH = scaleMax > 0 ? drag.startBoundH * newMax / scaleMax : drag.startBoundH;
      void drag.tile.document.update({
        width: tw, height: th,
        [`flags.${MODULE_ID}.boundHeight`]:     newBoundH,
        [`flags.${MODULE_ID}.boundHeightBase`]: { w: tw, h: th },
      }, DRAG_OPTS);
      break;
    }
    case "move":      void drag.tile.document.update({ x: docX, y: docY },     DRAG_OPTS); break;
    case "imgOffset": {
      const gridSize = CanvasEnv.gridSize();
      void drag.tile.document.update({ [`flags.${MODULE_ID}.imageOffset`]: { x: imgOffX / gridSize, y: imgOffY / gridSize } }, DRAG_OPTS);
      break;
    }
    case "imgScale":   void drag.tile.document.update({ [`flags.${MODULE_ID}.imageScale`]:  imgScale  }, DRAG_OPTS); break;
    case "imgYScale":  void drag.tile.document.update({ [`flags.${MODULE_ID}.imageYScale`]: imgYScale }, DRAG_OPTS); break;
    case "swapSide":   break; // handled via pointerdown, not drag
  }
}

// Push pre-drag document state to canvas.tiles.history so one Ctrl+Z restores correctly.
export function storeDragHistory(drag: DragState): void {
  const id = drag.tile.id; if (!id) return;
  const gs = CanvasEnv.gridSize();
  const o: Record<string, unknown> = { _id: id };
  const fk = (k: string) => `flags.${MODULE_ID}.${k}`;
  const bh = { w: drag.startW, h: drag.startH };
  switch (drag.type) {
    case "width":     o.width = drag.startW; break;
    case "height":    o.height = drag.startH; break;
    case "boundH":    o[fk("boundHeight")] = drag.startBoundH; o[fk("boundHeightBase")] = bh; break;
    case "elevation": o.elevation = drag.startElev; break;
    case "scale":     o.width = drag.startW; o.height = drag.startH; o[fk("boundHeight")] = drag.startBoundH; o[fk("boundHeightBase")] = bh; break;
    case "move":      o.x = drag.startDocX; o.y = drag.startDocY; break;
    case "imgOffset": o[fk("imageOffset")]  = { x: drag.startImgOffX / gs, y: drag.startImgOffY / gs }; break;
    case "imgScale":  o[fk("imageScale")]   = drag.startImgScale; break;
    case "imgYScale": o[fk("imageYScale")]  = drag.startImgYScale; break;
    case "swapSide":  return;
  }
  CanvasEnv.pushTilesHistory({ type: "update", data: [o], options: { isoroll: "gizmoDrag" } });
  console.debug(`[isoroll] storeDragHistory | type=${drag.type} tile=${id}`, o);
}
