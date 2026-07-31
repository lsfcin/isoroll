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
export declare function groundFactor(proj: IsoProjection): number;
/**
 * Mesh scale for a baked sprite: one texture px covers `gridSize / pxPerVoxel` world px, and a
 * world px covers `a` screen px. Independent of the document's size and boundHeight — a sprite's
 * density does not change because its volume box was resized.
 */
export declare function spriteUniformScale(meta: SpriteMeta, gridSize: number, proj: IsoProjection): number;
/** PIXI anchor (texture UV) that puts the sprite's origin pixel on the mesh position. */
export declare function spriteAnchorUV(meta: SpriteMeta, texW: number, texH: number): P2;
/**
 * WORLD point the origin pixel sits on: the footprint corner that projects HIGHEST on screen —
 * the `heightDir` corner, (+x, -y) for every built-in preset — at the tile's base.
 *
 * That is the corner the offline renderer measures `originPx` from: scene_plan.py lands each
 * sprite's origin on cam.pt(u0, v0, z0), and (u0, v0) is the topmost corner of the box's ground
 * diamond for any footprint, not only for a single cell.
 */
export declare function spriteOriginWorld(base: P2, docW: number, docH: number, heightDir: P2): P2;
type FlagDoc = {
    getFlag(scope: string, key: string): unknown;
};
/**
 * `flags.isoroll.sprite` as usable numbers, or null when the tile is not a baked sprite (the
 * hand-placed case) or the bake data is unusable — either way the caller falls back to the box fit.
 */
export declare function readSpriteMeta(doc: FlagDoc): SpriteMeta | null;
export {};
