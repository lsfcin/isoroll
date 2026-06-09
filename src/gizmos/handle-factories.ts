// Handle dispatch and tile-specific factories.
import { HandleType } from "../tiles/tile-drag";
import { canvasZoom } from "../util";
import {
  HALF, makeHandle, makeCircleHandle, makeSquareCounterHandle,
  makeMoveHandle, makeSwapHandle, makeFaceHandle,
} from "./handle-draw";
export const HANDLE_COLOR: Record<HandleType, number> = {
  width:     0xff9829,
  height:    0xff9829,
  boundH:    0xff9829,
  elevation: 0xff9829,
  scale:     0xff9829,
  move:      0xff9829,
  imgOffset: 0xffffff,
  imgScale:  0xffffff,
  imgYScale: 0xffffff,
  swapSide:  0xffffff,
};

// Dispatches the correct factory for a given handle type; used by VolumeGizmos.show().
export function makeHandleForType(
  type: HandleType, hDirX: number, hDirY: number,
): PIXI.Container | PIXI.Graphics {
  const color = HANDLE_COLOR[type];
  if (type === "elevation") return makeCircleHandle(color);
  if (type === "imgOffset") return makeCircleHandle(0xffffff, "move");
  if (type === "imgScale")  return makeSquareCounterHandle(0xffffff, "nesw-resize");
  if (type === "imgYScale") return makeSquareCounterHandle(0xffffff, "ns-resize");
  if (type === "swapSide")  return makeSwapHandle();
  if (type === "move")      return makeMoveHandle(color);
  if (type === "boundH") {
    const vLen = Math.sqrt(hDirX * hDirX + hDirY * hDirY);
    return makeFaceHandle(color, 0, HALF, (hDirX / vLen) * HALF * 2, (hDirY / vLen) * HALF * 2);
  }
  return makeHandle(color);
}

// Locates Foundry's rotation handle on the tile, builds an invisible event-absorbing circle on top.
// Returns null when the handle isn't found (e.g. tile not yet selected).
export function createRotateBlocker(tile: Tile, layer: PIXI.Container): PIXI.Graphics | null {
  type H = {
    children?: H[];
    getGlobalPosition?: () => { x: number; y: number };
    getBounds?: () => { x: number; y: number; width: number; height: number };
  };
  const handle = (tile as unknown as { controls?: H }).controls?.children?.[1]?.children?.[0] as H | undefined;
  if (!handle?.getGlobalPosition) return null;
  const gp  = handle.getGlobalPosition();
  const lp  = layer.toLocal(gp);
  const tw  = tile.document.width ?? 0;
  const bounds = handle.getBounds?.();
  const zoom   = canvasZoom();
  const r      = bounds ? Math.max(bounds.width, bounds.height) * 0.5 * 1.03 / zoom : 20;
  const g = new PIXI.Graphics();
  g.lineStyle(0);
  g.beginFill(0x000000, 0.001);
  g.drawCircle(0, 0, r);
  g.endFill();
  g.x = lp.x + tw / 2;
  g.y = lp.y;
  g.eventMode = "static";
  g.cursor    = "default";
  return g;
}
