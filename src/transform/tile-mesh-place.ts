// Where a tile's mesh sits and how big it is — the geometry half of the tile counter-transform.
//
// Split out of tile-transform.ts (now hooks only) when the baked-sprite path landed, because a tile
// is placed by ONE of two rules and they disagree about everything: hand-placed art is FITTED to
// the volume box and centred on it, while a baked sprite is scaled by its own pixel density and
// pinned by its origin pixel (tile-sprite-anchor.ts). Keeping both in the hook file put three
// concerns in one place and pushed it against the line cap.
import { VolumeFlags, gridDistance, elevToCanvas } from "../core";
import type { IsoProjection } from "./constants";
import { transformCoord, P2 } from "./coord-map";
import { CanvasTransform } from "./stage-transform";
import {
  readSpriteMeta,
  spriteAnchorUV,
  spriteOriginWorld,
  spriteUniformScale,
  type SpriteMeta,
} from "./tile-sprite-anchor";

export type MutMeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { x: number; y: number; set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

export const EPS = 1e-6;

/** Fallback density: nothing knows how many texture px are a grid unit, so fit the volume box. */
function boxFitUniform(mesh: MutMeshLike, docW: number, docH: number, docBoundH: number): number {
  const texW = mesh.texture?.width || 1;
  const texH = mesh.texture?.height || 1;
  const maxDoc = Math.max(docW, docH, docBoundH);
  const maxTex = Math.max(texW, texH);
  return maxDoc / maxTex;
}

/** Undo the stage transform: reverse rotation, no skew, `uniform` scaled by the projection. */
function applyTileCounter(
  mesh: MutMeshLike,
  docRotationDeg: number,
  uniform: number,
  imgYScale: number,
  proj: IsoProjection,
): void {
  const { reverseRotation, ratio, counterFactor } = proj;
  const targetRot = (docRotationDeg * Math.PI) / 180 + reverseRotation;
  if (Math.abs(mesh.rotation - targetRot) > EPS) {
    mesh.rotation = targetRot;
  }
  if (mesh.skew) {
    const skewNonZero = mesh.skew.x !== 0 || mesh.skew.y !== 0;
    if (skewNonZero) {
      mesh.skew.set(0, 0);
    }
  }
  const sx = uniform * counterFactor;
  const sy = uniform * ratio * counterFactor * imgYScale;
  const absSx = Math.abs(mesh.scale.x);
  const diffX = Math.abs(absSx - sx);
  const diffY = Math.abs(mesh.scale.y - sy);
  // Use abs on scale.x so a flipped tile (scale.x < 0) still passes as "correct magnitude".
  if (diffX > EPS || diffY > EPS) {
    mesh.scale.set(sx, sy);
  }
}

/** Box-fit pivot: the texel currently sitting on `baseCenterWorld`, found through the live mesh. */
function setMeshAnchor(mesh: MutMeshLike, baseCenterWorld: P2): void {
  if (mesh.anchor) {
    mesh.anchor.set(0.5, 0.5);
  }
  const anchorUV = transformCoord(baseCenterWorld, "WORLD", "IMAGE", { mesh }) as P2;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const anchorX = clamp(anchorUV.x);
  const anchorY = clamp(anchorUV.y);
  if (mesh.anchor) {
    mesh.anchor.set(anchorX, anchorY);
  }
}

/** Sprite pivot: the origin pixel the offline renderer measured, straight from the bake data. */
function setSpriteAnchor(mesh: MutMeshLike, sprite: SpriteMeta): void {
  const texW = mesh.texture?.width || 1;
  const texH = mesh.texture?.height || 1;
  const uv = spriteAnchorUV(sprite, texW, texH);
  if (mesh.anchor) {
    mesh.anchor.set(uv.x, uv.y);
  }
}

/** Scale + rotation for both paths; returns nothing, mutates the mesh. */
function scaleMesh(
  tile: Tile,
  mesh: MutMeshLike,
  sprite: SpriteMeta | null,
  gridSize: number,
  proj: IsoProjection,
): void {
  const doc = tile.document;
  const boundH = VolumeFlags.getEffectiveTileHeight(doc) * gridSize;
  const imgScale = VolumeFlags.getImageScale(doc);
  const imgYScale = VolumeFlags.getImageYScale(doc);
  let uniform = 0;
  if (sprite) {
    uniform = spriteUniformScale(sprite, gridSize, proj);
  } else {
    uniform = boxFitUniform(mesh, doc.width ?? 0, doc.height ?? 0, boundH);
  }
  applyTileCounter(mesh, doc.rotation ?? 0, uniform * imgScale, imgYScale, proj);
  const imgFlipped = VolumeFlags.getTileFlipped(doc);
  // applyTileCounter sets scale.x > 0; negate only if still positive after that.
  if (imgFlipped && mesh.scale.x > 0) {
    mesh.scale.x = -mesh.scale.x;
  }
}

/** The WORLD point the mesh's pivot lands on, pivot set as a side effect. */
function anchorMesh(
  tile: Tile,
  mesh: MutMeshLike,
  sprite: SpriteMeta | null,
  base: P2,
  proj: IsoProjection,
): P2 {
  const doc = tile.document;
  const heightDir = proj.heightDir;
  let world = base;
  if (sprite) {
    setSpriteAnchor(mesh, sprite);
    world = spriteOriginWorld(base, doc.width ?? 0, doc.height ?? 0, heightDir);
  } else {
    // Box fit wants the texture's geometric centre on the 3D box centre, so it has to park the
    // mesh there first and read back which UV that made land on the base — hence the two writes.
    const gridSize = canvas.grid?.size ?? 100;
    const boundH = VolumeFlags.getEffectiveTileHeight(doc) * gridSize;
    mesh.x = base.x + heightDir.x * (boundH / 2);
    mesh.y = base.y + heightDir.y * (boundH / 2);
    setMeshAnchor(mesh, base);
  }
  return world;
}

export function applyMeshTransform(tile: Tile, mesh: MutMeshLike): void {
  const gridSize = canvas.grid?.size ?? 100;
  const gridDist = gridDistance();
  const doc = tile.document;
  const tileDoc = doc as unknown as { elevation?: number };
  const elevPx = elevToCanvas(tileDoc.elevation ?? 0, gridSize, gridDist);
  const proj = CanvasTransform.effectiveProjection();
  const heightDir = proj.heightDir;
  const sprite = readSpriteMeta(doc);
  scaleMesh(tile, mesh, sprite, gridSize, proj);

  const baseCenterWorld: P2 = {
    x: (doc.x ?? 0) + heightDir.x * elevPx,
    y: (doc.y ?? 0) + heightDir.y * elevPx,
  };
  const anchorWorld = anchorMesh(tile, mesh, sprite, baseCenterWorld, proj);
  const imgOffWorld = VolumeFlags.getImageOffset(doc);
  mesh.x = anchorWorld.x + imgOffWorld.x * gridSize;
  mesh.y = anchorWorld.y + imgOffWorld.y * gridSize;
}
