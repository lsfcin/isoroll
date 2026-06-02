// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { getProjection } from "../transform/constants";
import { MODULE_ID } from "./flags";

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

export function snapQuarterPx(canvasPx: number, gridSize: number): number {
  const q = gridSize * 0.25;
  return Math.round(canvasPx / q) * q;
}

export function snapQuarterUnits(units: number): number {
  return Math.round(units * 4) / 4;
}

// lxSign: -1 left, 0 center, +1 right.  lySign: -1 top, 0 middle, +1 bottom.
function meshCorner(tile: Tile, lxSign: number, lySign: number): { x: number; y: number } | null {
  type M = { x: number; y: number; rotation: number; scale: { x: number; y: number }; texture?: { width: number; height: number }; anchor?: { x: number; y: number } };
  const mesh = tile.mesh as unknown as M | null | undefined;
  if (!mesh?.texture) return null;
  const texW = mesh.texture.width, texH = mesh.texture.height;
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const sx = Math.abs(mesh.scale.x), sy = mesh.scale.y;  // abs so flipped image corners stay correct
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  const lx = (lxSign < 0 ? -ax : lxSign > 0 ? 1 - ax : 0.5 - ax) * texW;
  const ly = (lySign < 0 ? -ay : lySign > 0 ? 1 - ay : 0.5 - ay) * texH;
  return { x: mesh.x + cr*(lx*sx) - sr*(ly*sy), y: mesh.y + sr*(lx*sx) + cr*(ly*sy) };
}
export function imageBLCorner(tile: Tile) { return meshCorner(tile, -1, +1); }
export function imageTRCorner(tile: Tile) { return meshCorner(tile, +1, -1); }
export function imageBCCorner(tile: Tile) { return meshCorner(tile,  0, +1); }
export function imageTCCorner(tile: Tile) { return meshCorner(tile,  0, -1); }

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

export function clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

// Project screen delta onto the resize/elevation axis, snap, return new values.
// m = canvas.app.stage.worldTransform (rotation+skew only); zoom separate.
// Screen-pixel snap zone for imgYScale to restore original proportion (1:1).
const IMG_YSCALE_SNAP_PX = 12;

export function projectDrag(
  drag: DragState, gx: number, gy: number,
): { tw: number; th: number; boundH: number; elev: number; docX: number; docY: number; imgOffX: number; imgOffY: number; imgScale: number; imgYScale: number } {
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const m    = canvas.app!.stage.worldTransform;
  const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
  const gs   = canvas.grid?.size ?? 100;
  const gd   = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;

  let tw = drag.startW, th = drag.startH, boundH = drag.startBoundH, elev = drag.startElev;
  let docX = drag.startDocX, docY = drag.startDocY;
  let imgOffX = drag.startImgOffX, imgOffY = drag.startImgOffY;
  let imgScale = drag.startImgScale;
  let imgYScale = drag.startImgYScale;
  switch (drag.type) {
    case "width": {
      const d = (dx * m.a + dy * m.b) / zoom;
      tw = Math.max(gs * 0.25, snapQuarterPx(drag.startW - d, gs));
      break;
    }
    case "height": {
      const d = (dx * m.c + dy * m.d) / zoom;
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
      const d = (dx * m.a + dy * m.b + dx * m.c + dy * m.d) / (2 * zoom);
      const ratio = drag.startH > 0 ? drag.startW / drag.startH : 1;
      tw = Math.max(gs * 0.25, snapQuarterPx(drag.startW + d, gs));
      th = Math.max(gs * 0.25, snapQuarterPx(tw / ratio, gs));
      break;
    }
    case "move": {
      const det = m.a * m.d - m.b * m.c;
      const cdx = (dx * m.d - dy * m.c) / det;
      const cdy = (-dx * m.b + dy * m.a) / det;
      docX = snapQuarterPx(drag.startDocX + cdx, gs);
      docY = snapQuarterPx(drag.startDocY + cdy, gs);
      break;
    }
    case "imgOffset": {
      const det = m.a * m.d - m.b * m.c;
      imgOffX = drag.startImgOffX + (dx * m.d - dy * m.c) / det;
      imgOffY = drag.startImgOffY + (-dx * m.b + dy * m.a) / det;
      break;
    }
    case "imgScale": {
      // Mesh center in canvas space; convert to screen to get reference direction
      const { x: hdx, y: hdy } = getProjection(canvas.scene).heightDir;
      const E2 = drag.startElev * gs / gd;
      const cx = drag.startDocX + hdx * E2 + drag.startImgOffX;
      const cy = drag.startDocY + hdy * E2 + drag.startImgOffY;
      const csx = m.a * cx + m.c * cy + m.tx, csy = m.b * cx + m.d * cy + m.ty;
      const dxRef = drag.startGX - csx, dyRef = drag.startGY - csy;
      const distRef = Math.sqrt(dxRef*dxRef + dyRef*dyRef);
      if (distRef > 0) {
        const curDist = ((gx - csx) * dxRef + (gy - csy) * dyRef) / distRef;
        imgScale = Math.max(0.05, drag.startImgScale * (curDist / distRef));
      }
      break;
    }
    case "imgYScale": {
      // Project screen delta onto canvas-Y axis via inverse matrix
      const det = m.a * m.d - m.b * m.c;
      const canvasDY = (-dx * m.b + dy * m.a) / det;
      // Top-center handle: drag up (canvasDY < 0) = top moves up = image taller
      const baseHalfH = drag.startImgHalfH;
      const newHalfH = baseHalfH * drag.startImgYScale - canvasDY;
      imgYScale = Math.max(0.05, newHalfH / baseHalfH);
      // Snap to 1.0 when handle is within IMG_YSCALE_SNAP_PX screen pixels of original proportion
      if (Math.abs(imgYScale - 1.0) * baseHalfH * zoom < IMG_YSCALE_SNAP_PX) imgYScale = 1.0;
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
