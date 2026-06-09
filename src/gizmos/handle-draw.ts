// PIXI drawing primitives for gizmo handles.
import { currentProjection } from "../transform/constants";
import { BLACK } from "../draw/constants";
export const HANDLE_SIZE = 9;
export const HALF        = HANDLE_SIZE / 2;

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
export function makeCircleHandle(color: number, cursor = "n-resize"): PIXI.Container {
  const proj = currentProjection();
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
  const proj = currentProjection();
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

// Counter-transformed square with two swap triangles (◀/▶) for the mirror-tile action.
export function makeSwapHandle(): PIXI.Container {
  const proj = currentProjection();
  const wrap = new PIXI.Container();
  wrap.rotation = proj.reverseRotation;
  wrap.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
  const S = HANDLE_SIZE * 0.7;
  const g = new PIXI.Graphics();
  g.lineStyle(0); g.beginFill(0xff0000, 0.01);
  g.drawRect(-S, -S, S * 2, S * 2); g.endFill();
  // hl = 5× original S*0.3; hh unchanged; dir=+1 → ◀ (tip left), dir=-1 → ▶ (tip right)
  const ay = S * 0.38, hh = S * 0.33, hl = S * 1.275;
  for (const [ys, dir] of [[-ay, +1], [ay, -1]] as [number, 1|-1][]) {
    const tip  = dir * (-S * 0.7);
    const base = tip + dir * hl;
    g.lineStyle(0.5, 0x000000, 1); g.beginFill(0xffffff, 1);
    g.drawPolygon([tip, ys,  base, ys - hh,  base, ys + hh]);
    g.endFill();
  }
  wrap.addChild(g);
  wrap.eventMode = "static";
  wrap.cursor = "pointer";
  return wrap;
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
