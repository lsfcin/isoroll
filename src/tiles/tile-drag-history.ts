// History helpers: push pre-drag document state into canvas.tiles.history for Ctrl+Z.
import { MODULE_ID, CanvasEnv } from "../core";
import { DragState } from "./tile-drag";

function buildHistorySize(drag: DragState, o: Record<string, unknown>, fk: (k: string) => string): void {
  const bh = { w: drag.startW, h: drag.startH };
  switch (drag.type) {
    case "width": {
      o.width = drag.startW;
      break;
    }
    case "height": {
      o.height = drag.startH;
      break;
    }
    case "boundH": {
      o[fk("boundHeight")]     = drag.startBoundH;
      o[fk("boundHeightBase")] = bh;
      break;
    }
    case "elevation": {
      o.elevation = drag.startElev;
      break;
    }
    case "scale": {
      o.width                  = drag.startW;
      o.height                 = drag.startH;
      o[fk("boundHeight")]     = drag.startBoundH;
      o[fk("boundHeightBase")] = bh;
      break;
    }
    default: {
      break;
    }
  }
}

function buildHistoryPos(drag: DragState, o: Record<string, unknown>, fk: (k: string) => string, gs: number): void {
  switch (drag.type) {
    case "move": {
      o.x = drag.startDocX;
      o.y = drag.startDocY;
      break;
    }
    case "imgOffset": {
      o[fk("imageOffset")] = { x: drag.startImgOffX / gs, y: drag.startImgOffY / gs };
      break;
    }
    case "imgScale": {
      o[fk("imageScale")] = drag.startImgScale;
      break;
    }
    case "imgYScale": {
      o[fk("imageYScale")] = drag.startImgYScale;
      break;
    }
    default: {
      break;
    }
  }
}

function pushDragHistory(drag: DragState, tileId: string): void {
  const gs = CanvasEnv.gridSize();
  const o: Record<string, unknown> = { _id: tileId };
  const fk = (k: string) => `flags.${MODULE_ID}.${k}`;
  buildHistorySize(drag, o, fk);
  buildHistoryPos(drag, o, fk, gs);
  CanvasEnv.pushTilesHistory({ type: "update", data: [o], options: { isoroll: "gizmoDrag" } });
  console.debug(`[isoroll] storeDragHistory | type=${drag.type} tile=${tileId}`, o);
}

export function storeDragHistory(drag: DragState): void {
  const tileId = drag.tile.id;
  const skip   = !tileId || drag.type === "swapSide";
  if (!skip) {
    pushDragHistory(drag, tileId);
  }
}
