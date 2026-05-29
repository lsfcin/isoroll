// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { getProjection } from "../transform/constants";
import { MODULE_ID } from "./flags";

export type HandleType = "width" | "height" | "boundH";

export interface DragState {
  type:       HandleType;
  tile:       Tile;
  startGX:    number;
  startGY:    number;
  startX:     number;
  startY:     number;
  startW:     number;
  startH:     number;
  startBoundH: number;
}

export const handleTypeMap = new WeakMap<PIXI.Graphics, HandleType>();

export function snapQuarterPx(canvasPx: number, gridSize: number): number {
  const q = gridSize * 0.25;
  return Math.round(canvasPx / q) * q;
}

export function snapQuarterUnits(units: number): number {
  return Math.round(units * 4) / 4;
}

// Returns canvas-space positions for the 3 handle anchors
export function handlePositions(
  tx: number, ty: number, tw: number, th: number,
  E: number, EH: number, hdx: number, hdy: number,
): Record<HandleType, { cx: number; cy: number }> {
  return {
    width:  { cx: tx + hdx * E,            cy: ty + th / 2 + hdy * E },  // midpoint NW–SW (front-left edge)
    height: { cx: tx + tw / 2 + hdx * E,   cy: ty + th + hdy * E },      // midpoint SW–SE (front-bottom edge)
    boundH: { cx: tx + tw / 2 + hdx * EH,  cy: ty + th / 2 + hdy * EH }, // center of top face
  };
}

export function clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

// Project screen delta onto the resize axis, snap, return new dimensions.
// m = canvas.app.stage.worldTransform (rotation+skew only); zoom separate.
export function projectDrag(
  drag: DragState, gx: number, gy: number,
): { tw: number; th: number; boundH: number } {
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const m    = canvas.app!.stage.worldTransform;
  const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
  const gs   = canvas.grid?.size ?? 100;

  let tw = drag.startW, th = drag.startH, boundH = drag.startBoundH;
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
  }
  return { tw, th, boundH };
}

// Move handles to preview position during drag (no document write)
export function previewHandles(
  drag: DragState, gx: number, gy: number,
  sets: Map<string, PIXI.Container>,
  typeMap: WeakMap<PIXI.Graphics, HandleType>,
): void {
  const container = sets.get(drag.tile.id);
  if (!container) return;

  const { tw, th, boundH } = projectDrag(drag, gx, gy);
  const proj    = getProjection(canvas.scene);
  const gs      = canvas.grid?.size ?? 100;
  const gd      = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
  const elev    = (drag.tile.document as unknown as { elevation?: number }).elevation ?? 0;
  const E       = elev * gs / gd;
  const EH      = E + boundH * gs;
  const { x: hdx, y: hdy } = proj.heightDir;

  const pos = handlePositions(drag.startX, drag.startY, tw, th, E, EH, hdx, hdy);
  for (const child of container.children) {
    const g    = child as PIXI.Graphics;
    const type = typeMap.get(g);
    if (!type) continue;
    g.x = pos[type].cx;
    g.y = pos[type].cy;
  }
}

// Commit drag result to document
export function commitDrag(drag: DragState, gx: number, gy: number): void {
  const { tw, th, boundH } = projectDrag(drag, gx, gy);
  switch (drag.type) {
    case "width":  void drag.tile.document.update({ width: tw }); break;
    case "height": void drag.tile.document.update({ height: th }); break;
    case "boundH": void drag.tile.document.setFlag(MODULE_ID, "boundHeight", boundH); break;
  }
}
