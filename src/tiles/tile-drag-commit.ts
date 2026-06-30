// Commit helpers: apply drag results to TileDocument with undo-suppressed updates.
import { MODULE_ID, CanvasEnv } from "../core";
import { DragState, projectDrag } from "./tile-drag";

// All drag updates suppress Foundry's auto-store (isUndo:true). storeDragHistory() must be
// called once on pointerup to push the pre-drag original manually. This ensures one correct
// undo entry regardless of how many pointermove frames fired during the drag.
const DRAG_OPTS = { isoroll: "gizmoDrag", isUndo: true } as const;

type TileDoc = TileDocument;
type DragResult = ReturnType<typeof projectDrag>;

function commitSizeDrag(doc: TileDoc, drag: DragState, res: DragResult): void {
  switch (drag.type) {
    case "width": {
      void doc.update({ width: res.tw }, DRAG_OPTS);
      break;
    }
    case "height": {
      void doc.update({ height: res.th }, DRAG_OPTS);
      break;
    }
    case "boundH": {
      const tw2 = doc.width  ?? 0;
      const th2 = doc.height ?? 0;
      void doc.update({
        [`flags.${MODULE_ID}.boundHeight`]:     res.boundH,
        [`flags.${MODULE_ID}.boundHeightBase`]: { w: tw2, h: th2 },
      }, DRAG_OPTS);
      break;
    }
    case "elevation": {
      void doc.update({ elevation: res.elev }, DRAG_OPTS);
      break;
    }
    case "scale": {
      const scaleMax  = Math.max(drag.startW, drag.startH);
      const newMax    = Math.max(res.tw, res.th);
      const newBoundH = scaleMax > 0 ? drag.startBoundH * newMax / scaleMax : drag.startBoundH;
      void doc.update({
        width: res.tw, height: res.th,
        [`flags.${MODULE_ID}.boundHeight`]:     newBoundH,
        [`flags.${MODULE_ID}.boundHeightBase`]: { w: res.tw, h: res.th },
      }, DRAG_OPTS);
      break;
    }
    default: {
      break;
    }
  }
}

function commitPosDrag(doc: TileDoc, drag: DragState, res: DragResult): void {
  switch (drag.type) {
    case "move": {
      void doc.update({ x: res.docX, y: res.docY }, DRAG_OPTS);
      break;
    }
    case "imgOffset": {
      const gridSize = CanvasEnv.gridSize();
      void doc.update({
        [`flags.${MODULE_ID}.imageOffset`]: { x: res.imgOffX / gridSize, y: res.imgOffY / gridSize },
      }, DRAG_OPTS);
      break;
    }
    case "imgScale": {
      void doc.update({ [`flags.${MODULE_ID}.imageScale`]: res.imgScale }, DRAG_OPTS);
      break;
    }
    case "imgYScale": {
      void doc.update({ [`flags.${MODULE_ID}.imageYScale`]: res.imgYScale }, DRAG_OPTS);
      break;
    }
    case "swapSide": {
      break; // handled via pointerdown, not drag
    }
    default: {
      break;
    }
  }
}

export function commitDrag(drag: DragState, gx: number, gy: number): void {
  const res = projectDrag(drag, gx, gy);
  const doc = drag.tile.document;
  commitSizeDrag(doc, drag, res);
  commitPosDrag(doc, drag, res);
}
