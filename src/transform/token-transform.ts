// Token counter-transform: refreshToken hook handler.

import { MODULE_ID, VolumeFlags, gridDistance, elevToCanvas } from "../core";
import { CanvasTransform } from "./stage-transform";
import { MutMeshLike as MeshLike, EPS } from "./tile-transform";

const tokenBase = new WeakMap<object, { x: number; y: number }>();

function _applyMeshScaleAndRotation(
  mesh: MeshLike,
  reverseRotation: number,
  counterFactor: number,
  ratio: number,
  docW: number,
  docH: number,
  texW: number,
  texH: number,
  imgScl: number,
  imgYScl: number,
): void {
  if (Math.abs(mesh.rotation - reverseRotation) > EPS) {
    mesh.rotation = reverseRotation;
  }
  if (mesh.skew && (mesh.skew.x !== 0 || mesh.skew.y !== 0)) {
    mesh.skew.set(0, 0);
  }
  const anchorXOff = Math.abs(mesh.anchor ? mesh.anchor.x - 0.5 : 0);
  const anchorYOff = Math.abs(mesh.anchor ? mesh.anchor.y - 0.5 : 0);
  if (mesh.anchor && (anchorXOff > EPS || anchorYOff > EPS)) {
    mesh.anchor.set(0.5, 0.5);
  }
  const maxDoc    = Math.max(docW, docH);
  const maxTex    = Math.max(texW, texH);
  const uniform   = maxDoc / maxTex * imgScl;
  const targetSX  = uniform * counterFactor;
  const targetSY  = uniform * ratio * counterFactor * imgYScl;
  const scaleXOff = Math.abs(mesh.scale.x - targetSX);
  const scaleYOff = Math.abs(mesh.scale.y - targetSY);
  if (scaleXOff > EPS || scaleYOff > EPS) {
    mesh.scale.set(targetSX, targetSY);
  }
}

function _applyMeshTransform(
  token: Token,
  mesh: MeshLike,
  flags?: Record<string, boolean>,
): void {
  const gridSize = canvas.grid?.size ?? 100;
  const proj     = CanvasTransform.effectiveProjection();
  const { reverseRotation, ratio, counterFactor } = proj;
  const heightDir = proj.heightDir;
  const docW     = (token.document.width  ?? 1) * gridSize;
  const docH     = (token.document.height ?? 1) * gridSize;
  const imgScl   = VolumeFlags.getImageScale(token.document);
  const imgYScl  = VolumeFlags.getImageYScale(token.document);
  const texW     = mesh.texture?.width || 1;
  const texH     = mesh.texture?.height || 1;

  // Re-apply counter-transform — _refreshMesh() resets scale/anchor on animation frames.
  _applyMeshScaleAndRotation(mesh, reverseRotation, counterFactor, ratio, docW, docH, texW, texH, imgScl, imgYScl);

  // Capture natural base when _refreshPosition() ran (Foundry reset mesh.x to center).
  if (!flags || flags["refreshPosition"]) {
    tokenBase.set(token, { x: mesh.x, y: mesh.y });
  }
  const base     = tokenBase.get(token) ?? { x: mesh.x, y: mesh.y };
  const gridDist = gridDistance();
  const elev     = (token.document as unknown as { elevation?: number }).elevation ?? 0;
  const elevPx   = elevToCanvas(elev, gridSize, gridDist);
  const imgOff   = VolumeFlags.getImageOffset(token.document);
  mesh.x = base.x + heightDir.x * elevPx + imgOff.x * gridSize;
  mesh.y = base.y + heightDir.y * elevPx + imgOff.y * gridSize;
}

export function onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
  if (CanvasTransform.effectiveEnabled()) {
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) {
      // Reset mesh to native Foundry state: undo counter-transform rotation, scale, and
      // elevation/imageOffset position that may have been left by a prior transformToken=false refresh.
      type HasRefresh = { _refreshRotation(): void; _refreshSize(): void; _refreshPosition(): void };
      const t = token as unknown as HasRefresh;
      t._refreshRotation?.();
      t._refreshSize?.();
      t._refreshPosition?.();
      // Keep tokenBase current so switching back to transformToken=false uses the right center.
      const m = token.mesh as unknown as MeshLike | null | undefined;
      if (m) {
        tokenBase.set(token, { x: m.x, y: m.y });
      }
    } else {
      const mesh = token.mesh as unknown as MeshLike | null | undefined;
      if (mesh) {
        _applyMeshTransform(token, mesh, flags);
      }
    }
  }
}
