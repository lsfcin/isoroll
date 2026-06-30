// Drag and swap-side interaction logic for VolumeGizmos handles.
import { MODULE_ID, VolumeFlags, startPointerDrag } from "../core";
import { HandleType, DragState, commitDrag, storeDragHistory } from "./tile-drag";
import { WallManager } from "../walls";
import { clientToGlobal } from "../gizmos";

type Pt2 = { x: number; y: number };

export type HandleCtx = {
  tile: Tile; type: HandleType; pos: { cx: number; cy: number };
  heightDir: Pt2; keys: Set<string>;
  tx: number; ty: number; tw: number; th: number;
  boundH: number; elev: number; gridSize: number;
  imgOff: Pt2; imgScale: number; imgYScale: number; imgHalfH: number;
};

export function swapSide(tile: Tile): void {
  const tw = tile.document.width ?? 0;
  const th = tile.document.height ?? 0;
  const imgOff = VolumeFlags.getImageOffset(tile.document);
  const tileFlipped = VolumeFlags.getTileFlipped(tile.document);
  void tile.document.update({
    width: th, height: tw,
    [`flags.${MODULE_ID}.tileFlipped`]: !tileFlipped,
    [`flags.${MODULE_ID}.imageOffset`]: { x: -imgOff.y, y: -imgOff.x },
  });
}

export function beginDrag(
  type: HandleType, tile: Tile, gx: number, gy: number,
  tx: number, ty: number, tw: number, th: number,
  boundH: number, elev: number, docX: number, docY: number,
  imgOffX = 0, imgOffY = 0, imgScale = 1, imgYScale = 1, imgHalfH = 100,
): void {
  const drag: DragState = {
    type, tile, startGX: gx, startGY: gy, startX: tx, startY: ty,
    startW: tw, startH: th, startBoundH: boundH, startElev: elev,
    startDocX: docX, startDocY: docY,
    startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale,
    startImgYScale: imgYScale, startImgHalfH: imgHalfH,
  };
  if (type === "move") {
    WallManager.markWallDrag(tile.id);
  }
  startPointerDrag(
    drag,
    (d, e) => {
      const { x, y } = clientToGlobal(e.clientX, e.clientY);
      commitDrag(d, x, y);
    },
    (d, e) => {
      if (type === "move") {
        WallManager.clearWallDrag(tile.id);
      }
      const { x, y } = clientToGlobal(e.clientX, e.clientY);
      storeDragHistory(d);
      commitDrag(d, x, y);
    },
  );
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
  const docX = tileDoc.x ?? 0;
  const docY = tileDoc.y ?? 0;
  const imgOffX = ctx.imgOff.x * ctx.gridSize;
  const imgOffY = ctx.imgOff.y * ctx.gridSize;
  beginDrag(
    ctx.type, ctx.tile, e.global.x, e.global.y,
    ctx.tx, ctx.ty, ctx.tw, ctx.th, ctx.boundH, ctx.elev, docX, docY,
    imgOffX, imgOffY, ctx.imgScale, ctx.imgYScale, ctx.imgHalfH,
  );
}
