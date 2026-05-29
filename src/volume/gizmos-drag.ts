// Pure drag-math helpers for VolumeGizmos: axis projection, snapping, handle positions.
import { getProjection } from "../transform/constants";
import { MODULE_ID } from "./flags";

export type HandleType = "width" | "height" | "boundH" | "elevation" | "scale";

export interface DragState {
  type:        HandleType;
  tile:        Tile;
  startGX:     number;
  startGY:     number;
  startX:      number;
  startY:      number;
  startW:      number;
  startH:      number;
  startBoundH: number;
  startElev:   number;
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

// Screen-right vector in canvas space for dimetric 2:1 is (+1, +1).
// Used to offset the elevation handle away from the SE vertical edge.
const ELEV_GAP = 5; // canvas px

// Returns canvas-space positions for all handle anchors
export function handlePositions(
  tx: number, ty: number, tw: number, th: number,
  E: number, EH: number, hdx: number, hdy: number,
): Record<HandleType, { cx: number; cy: number }> {
  // Midpoint of SE vertical edge (rightmost visible vertical)
  const seMidX = tx + tw + hdx * (E + EH) / 2;
  const seMidY = ty + th + hdy * (E + EH) / 2;
  return {
    width:     { cx: tx + hdx * E,            cy: ty + th / 2 + hdy * E },
    height:    { cx: tx + tw / 2 + hdx * E,   cy: ty + th + hdy * E },
    boundH:    { cx: tx + tw + hdx * EH,       cy: ty + th / 2 + hdy * EH },
    elevation: { cx: seMidX,                    cy: seMidY },
    // SE_base corner — proportional scale (mirrors Foundry's native corner handle)
    scale:     { cx: tx + tw + hdx * E,         cy: ty + th + hdy * E },
  };
}

export function clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

// Project screen delta onto the resize/elevation axis, snap, return new values.
// m = canvas.app.stage.worldTransform (rotation+skew only); zoom separate.
export function projectDrag(
  drag: DragState, gx: number, gy: number,
): { tw: number; th: number; boundH: number; elev: number } {
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const m    = canvas.app!.stage.worldTransform;
  const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
  const gs   = canvas.grid?.size ?? 100;
  const gd   = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;

  let tw = drag.startW, th = drag.startH, boundH = drag.startBoundH, elev = drag.startElev;
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
  }
  return { tw, th, boundH, elev };
}

// Commit drag result to document
export function commitDrag(drag: DragState, gx: number, gy: number): void {
  const { tw, th, boundH, elev } = projectDrag(drag, gx, gy);
  switch (drag.type) {
    case "width":     void drag.tile.document.update({ width: tw }); break;
    case "height":    void drag.tile.document.update({ height: th }); break;
    case "boundH":    void drag.tile.document.setFlag(MODULE_ID, "boundHeight", boundH); break;
    case "elevation": void drag.tile.document.update({ elevation: elev }); break;
    case "scale":     void drag.tile.document.update({ width: tw, height: th }); break;
  }
}
