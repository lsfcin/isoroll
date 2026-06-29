// Mesh corner, snap, and client-to-canvas coordinate helpers for gizmo placement.
import type { MeshLike } from "../draw";
import { CanvasEnv } from "../core";

export type MeshHolder = { mesh: unknown };

function meshCorner(h: MeshHolder, lxSign: number, lySign: number): { x: number; y: number } | null {
  const mesh = h.mesh as MeshLike | null | undefined;
  let result: { x: number; y: number } | null;
  if (!mesh?.texture) {
    result = null;
  } else {
    const texW = mesh.texture.width;
    const texH = mesh.texture.height;
    const ax = mesh.anchor?.x ?? 0.5;
    const ay = mesh.anchor?.y ?? 0.5;
    const sx = Math.abs(mesh.scale.x);
    const sy = mesh.scale.y;  // abs so flipped image corners stay correct
    const cr = Math.cos(mesh.rotation);
    const sr = Math.sin(mesh.rotation);
    const lx = (lxSign < 0 ? -ax : lxSign > 0 ? 1 - ax : 0.5 - ax) * texW;
    const ly = (lySign < 0 ? -ay : lySign > 0 ? 1 - ay : 0.5 - ay) * texH;
    result = { x: mesh.x + cr*(lx*sx) - sr*(ly*sy), y: mesh.y + sr*(lx*sx) + cr*(ly*sy) };
  }
  return result;
}

export function imageBottomLeft(h: MeshHolder) {
  return meshCorner(h, -1, +1);
}
export function imageTopRight(h: MeshHolder) {
  return meshCorner(h, +1, -1);
}
export function imageBottomCenter(h: MeshHolder) {
  return meshCorner(h,  0, +1);
}
export function imageTopCenter(h: MeshHolder) {
  return meshCorner(h,  0, -1);
}

export function snapQuarterPx(canvasPx: number, gridSize: number): number {
  const q = gridSize * 0.25;
  return Math.round(canvasPx / q) * q;
}

export function snapQuarterUnits(units: number): number {
  return Math.round(units * 4) / 4;
}

export function clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
  const appView = CanvasEnv.appView();
  const rect = appView.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}
