// Handle factory functions for VolumeGizmos: diamond, screen-circle, face-parallelogram.
import { getProjection } from "../transform/constants";
import { HandleType } from "./gizmos-drag";

export const HANDLE_SIZE = 10;
export const HALF        = HANDLE_SIZE / 2;
const BLACK              = 0x000000;

export const HANDLE_COLOR: Record<HandleType, number> = {
  width:     0xff4444,  // red    — X axis
  height:    0x44dd44,  // green  — Y axis
  boundH:    0x4488ff,  // blue   — Z axis
  elevation: 0x9900ff,  // purple — elevation
  scale:     0xff9829,  // Foundry orange — proportional scale (mirrors native corner handle)
  move:      0xff9829,  // Foundry orange — translate (mirrors native center handle)
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
export function makeElevHandle(color: number): PIXI.Container {
  const proj = getProjection(canvas.scene);
  const wrap = new PIXI.Container();
  wrap.rotation = proj.reverseRotation;
  wrap.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, BLACK, 1);
  g.beginFill(color, 0.9);
  g.drawCircle(0, 0, HALF * 0.9);
  g.endFill();
  wrap.addChild(g);
  wrap.eventMode = "static";
  wrap.cursor = "n-resize";
  return wrap;
}

// Plain canvas-space circle for translate — appears as an ellipse under isometric stage.
export function makeMoveHandle(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, 0x000000, 1);
  g.beginFill(color, 0.9);
  g.drawCircle(0, 0, HALF * 0.9);
  g.endFill();
  g.eventMode = "static";
  g.cursor = "move";
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
