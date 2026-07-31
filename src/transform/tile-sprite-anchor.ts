// Baked-sprite placement: scale from the sprite's own pixel density, anchor on its origin pixel.
//
// A hand-placed tile's art is FITTED to its volume box — max(docW, docH, boundHeight) / max(texW,
// texH) — because nothing knows how many pixels of that PNG are one grid unit. A baked sprite does
// know: isoroll-content stamps `pxPerVoxel` (texture px per voxel) and `originPx` (where the
// piece's own world (0,0,0) sits inside the texture) into the manifest, and one voxel is one grid
// unit. So both quantities the box-fit was approximating are DATA here, and the fit is dropped.
//
// Both are SCREEN quantities, so both carry the projection's ground factor: a world px only spends
// `a` px of screen width. Leaving it out is what made imported sprites sqrt(5)/2 ~ 1.118x too big
// for their cells while the parity harness called sizes green — it scaled both sides by the same
// wrong number.
import { MODULE_ID } from "../core";
import type { IsoProjection } from "./constants";
import type { P2 } from "./coord-types";

export type SpriteMeta = {
  /** Texture px of the piece's own world (0,0,0) — isoroll-content kit.json `origin`. */
  originPx: P2;
  /** Texture px per voxel; a voxel is a grid unit. Manifest `pxPerVoxel`. */
  pxPerVoxel: number;
};

/**
 * `a` of the stage matrix = cos(rotation + skewY): stage px per world px along the screen
 * horizontal. Equivalently 1 / (counterFactor * sqrt2), since counterFactor is defined as
 * 1/(a*sqrt2) — the identity is pinned by test/unit/tile-sprite-anchor.test.ts for every preset.
 */
export function groundFactor(proj: IsoProjection): number {
  return Math.cos(proj.rotation + proj.skewY);
}

/**
 * Mesh scale for a baked sprite: one texture px covers `gridSize / pxPerVoxel` world px, and a
 * world px covers `a` screen px. Independent of the document's size and boundHeight — a sprite's
 * density does not change because its volume box was resized.
 */
export function spriteUniformScale(
  meta: SpriteMeta,
  gridSize: number,
  proj: IsoProjection,
): number {
  return (groundFactor(proj) * gridSize) / meta.pxPerVoxel;
}

/** PIXI anchor (texture UV) that puts the sprite's origin pixel on the mesh position. */
export function spriteAnchorUV(meta: SpriteMeta, texW: number, texH: number): P2 {
  return { x: meta.originPx.x / texW, y: meta.originPx.y / texH };
}

/**
 * WORLD point the origin pixel sits on: the footprint corner that projects HIGHEST on screen —
 * the `heightDir` corner, (+x, -y) for every built-in preset — at the tile's base.
 *
 * That is the corner the offline renderer measures `originPx` from: scene_plan.py lands each
 * sprite's origin on cam.pt(u0, v0, z0), and (u0, v0) is the topmost corner of the box's ground
 * diamond for any footprint, not only for a single cell.
 */
export function spriteOriginWorld(base: P2, docW: number, docH: number, heightDir: P2): P2 {
  return { x: base.x + (heightDir.x * docW) / 2, y: base.y + (heightDir.y * docH) / 2 };
}

type FlagDoc = { getFlag(scope: string, key: string): unknown };
type RawSprite = { originPx?: { x?: number; y?: number }; pxPerVoxel?: number };

/**
 * `flags.isoroll.sprite` as usable numbers, or null when the tile is not a baked sprite (the
 * hand-placed case) or the bake data is unusable — either way the caller falls back to the box fit.
 */
export function readSpriteMeta(doc: FlagDoc): SpriteMeta | null {
  const raw = doc.getFlag(MODULE_ID, "sprite") as RawSprite | undefined;
  const ppv = raw?.pxPerVoxel;
  const ox = raw?.originPx?.x;
  const oy = raw?.originPx?.y;
  const usable =
    typeof ppv === "number" && ppv > 0 && typeof ox === "number" && typeof oy === "number";
  return usable ? { originPx: { x: ox, y: oy }, pxPerVoxel: ppv } : null;
}
