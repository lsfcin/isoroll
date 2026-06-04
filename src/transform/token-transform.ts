// Token counter-transform: refreshToken hook handler.
import { getProjection } from "./constants";
import { MODULE_ID, VolumeFlags } from "../flags";

type MeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { x: number; y: number; set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

const EPS = 1e-6;
const tokenBase = new WeakMap<object, { x: number; y: number }>();

export function onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
  if (!VolumeFlags.isSceneEnabled()) return;
  if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
  const mesh = token.mesh as unknown as MeshLike | null | undefined;
  if (!mesh) return;
  const gs   = canvas.grid?.size ?? 100;
  const proj = getProjection(canvas.scene);
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
  const gd    = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
  const elev  = (token.document as unknown as { elevation?: number }).elevation ?? 0;
  const E     = elev * gs / gd;
  const imgOff = VolumeFlags.getImageOffset(token.document);
  mesh.x = base.x + hdx * E + imgOff.x * gs;
  mesh.y = base.y + hdy * E + imgOff.y * gs;
}
