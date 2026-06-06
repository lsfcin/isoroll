// Token counter-transform: refreshToken hook handler.
import { MODULE_ID, VolumeFlags } from "../flags";
import { CanvasTransform } from "./stage-transform";
import { MutMeshLike as MeshLike, EPS } from "./tile-transform";
import { gridDistance, elevToCanvas } from "../util";
const tokenBase = new WeakMap<object, { x: number; y: number }>();

export function onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
  if (!CanvasTransform.effectiveEnabled()) return;
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
    if (m) tokenBase.set(token, { x: m.x, y: m.y });
    return;
  }
  const mesh = token.mesh as unknown as MeshLike | null | undefined;
  if (!mesh) return;
  const gs   = canvas.grid?.size ?? 100;
  const proj = CanvasTransform.effectiveProjection();
  const { reverseRotation, ratio, counterFactor, heightDir: { x: hdx, y: hdy } } = proj;
  const docW = (token.document.width  ?? 1) * gs;
  const docH = (token.document.height ?? 1) * gs;
  const imgScl  = VolumeFlags.getImageScale(token.document);
  const imgYScl = VolumeFlags.getImageYScale(token.document);

  // Re-apply counter-transform — _refreshMesh() resets scale/anchor on animation frames.
  // Guards avoid setting PIXI dirty when the value is already correct, breaking any
  // feedback loop where setting a property re-triggers refreshToken.
  if (Math.abs(mesh.rotation - reverseRotation) > EPS) mesh.rotation = reverseRotation;
  if (mesh.skew && (mesh.skew.x !== 0 || mesh.skew.y !== 0)) mesh.skew.set(0, 0);
  if (mesh.anchor && (Math.abs(mesh.anchor.x - 0.5) > EPS || Math.abs(mesh.anchor.y - 0.5) > EPS)) {
    mesh.anchor.set(0.5, 0.5);
  }
  const texW = mesh.texture?.width || 1, texH = mesh.texture?.height || 1;
  const uniform  = Math.max(docW, docH) / Math.max(texW, texH) * imgScl;
  const targetSX = uniform * counterFactor, targetSY = uniform * ratio * counterFactor * imgYScl;
  if (Math.abs(mesh.scale.x - targetSX) > EPS || Math.abs(mesh.scale.y - targetSY) > EPS) {
    mesh.scale.set(targetSX, targetSY);
  }

  // Capture natural base when _refreshPosition() ran (Foundry reset mesh.x to center).
  // Do NOT capture on refreshMesh-only frames — mesh.x already has our offset at that point.
  // On elevation/flag changes (no refreshPosition), reuse cached base with updated E.
  if (!flags || flags["refreshPosition"]) {
    tokenBase.set(token, { x: mesh.x, y: mesh.y });
  }
  const base  = tokenBase.get(token) ?? { x: mesh.x, y: mesh.y };
  const gd    = gridDistance();
  const elev  = (token.document as unknown as { elevation?: number }).elevation ?? 0;
  const E     = elevToCanvas(elev, gs, gd);
  const imgOff = VolumeFlags.getImageOffset(token.document);
  mesh.x = base.x + hdx * E + imgOff.x * gs;
  mesh.y = base.y + hdy * E + imgOff.y * gs;
}
