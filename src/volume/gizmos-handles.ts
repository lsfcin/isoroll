// Handle factory functions for VolumeGizmos: diamond, screen-circle, face-parallelogram.
import { getProjection } from "../transform/constants";
import { HandleType } from "./gizmos-drag";

export const HANDLE_SIZE = 10;
export const HALF        = HANDLE_SIZE / 2;
const BLACK              = 0x000000;

export const HANDLE_COLOR: Record<HandleType, number> = {
  width:     0xff9829,
  height:    0xff9829,
  boundH:    0xff9829,
  elevation: 0xff9829,
  scale:     0xff9829,
  move:      0xff9829,
};

// Canvas-aligned square → appears as a diamond under the isometric stage transform.
export function makeHandle(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, BLACK, 1);
  g.beginFill(color, 0.9);
  g.drawRect(-HALF, -HALF, HANDLE_SIZE, HANDLE_SIZE);
  g.endFill();
  g.eventMode = "static";
  g.cursor = "pointer";
  return g;
}

// Full tile counter-transform applied → appears as a true circle in screen space.
export function makeElevHandle(color: number, cursor = "n-resize"): PIXI.Container {
  const proj = getProjection(canvas.scene);
  const wrap = new PIXI.Container();
  wrap.rotation = proj.reverseRotation;
  wrap.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, BLACK, 1);
  g.beginFill(color, 0.9);
  g.drawCircle(0, 0, HALF * 0.945);
  g.endFill();
  wrap.addChild(g);
  wrap.eventMode = "static";
  wrap.cursor = cursor;
  return wrap;
}

// Counter-transform applied → square appears as a true square in screen space.
export function makeSquareCounterHandle(color: number, cursor = "pointer"): PIXI.Container {
  const proj = getProjection(canvas.scene);
  const wrap = new PIXI.Container();
  wrap.rotation = proj.reverseRotation;
  wrap.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, BLACK, 1);
  g.beginFill(color, 0.9);
  g.drawRect(-HALF, -HALF, HANDLE_SIZE, HANDLE_SIZE);
  g.endFill();
  wrap.addChild(g);
  wrap.eventMode = "static";
  wrap.cursor = cursor;
  return wrap;
}

// Plain canvas-space circle for translate — appears as an ellipse under isometric stage.
export function makeMoveHandle(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, 0x000000, 1);
  g.beginFill(color, 0.9);
  g.drawCircle(0, 0, HALF * 0.945);
  g.endFill();
  g.eventMode = "static";
  g.cursor = "move";
  return g;
}

// Dispatches the correct factory for a given handle type; used by VolumeGizmos.show().
export function makeHandleForType(
  type: HandleType, hdx: number, hdy: number,
): PIXI.Container | PIXI.Graphics {
  const color = HANDLE_COLOR[type];
  if (type === "elevation") return makeElevHandle(color);
  if (type === "imgOffset") return makeElevHandle(0xffffff, "move");
  if (type === "imgScale")  return makeSquareCounterHandle(0xffffff, "nwse-resize");
  if (type === "move")      return makeMoveHandle(color);
  if (type === "boundH") {
    const vLen = Math.sqrt(hdx * hdx + hdy * hdy);
    return makeFaceHandle(color, 0, HALF, (hdx / vLen) * HALF * 2, (hdy / vLen) * HALF * 2);
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
  const zoom   = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
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

// Parallelogram that is a square in face-coordinate space (projected onto a box face).
// uH/vH: half-vectors along the two face axes, in canvas pixels.
export function makeFaceHandle(
  color: number, uHX: number, uHY: number, vHX: number, vHY: number,
): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, BLACK, 1);
  g.beginFill(color, 0.9);
  g.drawPolygon([
    -uHX - vHX, -uHY - vHY,
    +uHX - vHX, +uHY - vHY,
    +uHX + vHX, +uHY + vHY,
    -uHX + vHX, -uHY + vHY,
  ]);
  g.endFill();
  g.eventMode = "static";
  g.cursor = "pointer";
  return g;
}
