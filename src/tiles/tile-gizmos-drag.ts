// Drag and swap-side interaction logic for VolumeGizmos handles.
import { MODULE_ID, VolumeFlags, startPointerDrag } from "../core";
import { HandleType, DragState, commitDrag, storeDragHistory } from "./tile-drag";
import { WallManager } from "../walls";
import { clientToGlobal } from "../gizmos";

type Pt2 = { x: number; y: number };

export type HandleCtx = {
  tile: Tile;
  type: HandleType;
  pos: { cx: number; cy: number };
  heightDir: Pt2;
  keys: Set<string>;
  tx: number;
  ty: number;
  tw: number;
  th: number;
  boundH: number;
  elev: number;
  gridSize: number;
  imgOff: Pt2;
  imgScale: number;
  imgYScale: number;
  imgHalfH: number;
};

// Doc/mesh values captured at drag start; see DragState for the start* mirror fields.
export type DragSnapshot = {
  tx: number;
  ty: number;
  tw: number;
  th: number;
  boundH: number;
  elev: number;
  docX: number;
  docY: number;
  imgOffX: number;
  imgOffY: number;
  imgScale: number;
  imgYScale: number;
  imgHalfH: number;
};

export function swapSide(tile: Tile): void {
  const tw = tile.document.width ?? 0;
  const th = tile.document.height ?? 0;
  const imgOff = VolumeFlags.getImageOffset(tile.document);
  const tileFlipped = VolumeFlags.getTileFlipped(tile.document);
  const mirroredOff = VolumeFlags.mirrorImageOffset(imgOff);
  void tile.document.update({
    width: th,
    height: tw,
    [`flags.${MODULE_ID}.tileFlipped`]: !tileFlipped,
    [`flags.${MODULE_ID}.imageOffset`]: mirroredOff,
  });
}

export function beginDrag(
  type: HandleType,
  tile: Tile,
  gx: number,
  gy: number,
  s: DragSnapshot,
): void {
  const drag: DragState = {
    type,
    tile,
    startGX: gx,
    startGY: gy,
    startX: s.tx,
    startY: s.ty,
    startW: s.tw,
    startH: s.th,
    startBoundH: s.boundH,
    startElev: s.elev,
    startDocX: s.docX,
    startDocY: s.docY,
    startImgOffX: s.imgOffX,
    startImgOffY: s.imgOffY,
    startImgScale: s.imgScale,
    startImgYScale: s.imgYScale,
    startImgHalfH: s.imgHalfH,
  };
  if (type === "move") {
    WallManager.markWallDrag(tile.id);
  }
  startPointerDrag(drag, _onDragMove, (d, e) => {
    if (type === "move") {
      WallManager.clearWallDrag(tile.id);
    }
    storeDragHistory(d);
    _onDragMove(d, e);
  });
}

function _onDragMove(d: DragState, e: { clientX: number; clientY: number }): void {
  const { x, y } = clientToGlobal(e.clientX, e.clientY);
  commitDrag(d, x, y);
}

export function handlePointerDown(
  ctx: HandleCtx,
  e: { stopPropagation(): void; global: Pt2 },
): void {
  e.stopPropagation();
  if (ctx.type === "swapSide") {
    swapSide(ctx.tile);
    return;
  }
  const tileDoc = ctx.tile.document;
  const snapshot: DragSnapshot = {
    tx: ctx.tx,
    ty: ctx.ty,
    tw: ctx.tw,
    th: ctx.th,
    boundH: ctx.boundH,
    elev: ctx.elev,
    docX: tileDoc.x ?? 0,
    docY: tileDoc.y ?? 0,
    imgOffX: ctx.imgOff.x * ctx.gridSize,
    imgOffY: ctx.imgOff.y * ctx.gridSize,
    imgScale: ctx.imgScale,
    imgYScale: ctx.imgYScale,
    imgHalfH: ctx.imgHalfH,
  };
  beginDrag(ctx.type, ctx.tile, e.global.x, e.global.y, snapshot);
}
