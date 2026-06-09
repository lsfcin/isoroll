import type { P2, TileMeshCoord } from './coord-types.js';

/**
 * Normalised image coords [0,1]² → world coordinates.
 * Forward PIXI mesh transform: localPx = (img − anchor) × texDims, scaled, rotated, translated.
 */
export const toWorld = (mesh: TileMeshCoord): ((p: P2) => P2) => {
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const texW = mesh.texture?.width ?? 1, texH = mesh.texture?.height ?? 1;
  const absSx = Math.abs(mesh.scale.x), absSy = Math.abs(mesh.scale.y);
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  return (p: P2) => {
    const lx = (p.x - ax) * texW * absSx;
    const ly = (p.y - ay) * texH * absSy;
    return { x: mesh.x + cr * lx - sr * ly, y: mesh.y + sr * lx + cr * ly };
  };
};

/**
 * World coordinates → normalised image coords [0,1]².
 * Inverse of the PIXI mesh transform chain.
 */
export const fromWorld = (mesh: TileMeshCoord): ((p: P2) => P2) => {
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const texW = mesh.texture?.width ?? 1, texH = mesh.texture?.height ?? 1;
  const absSx = Math.abs(mesh.scale.x), absSy = Math.abs(mesh.scale.y);
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  return (p: P2) => {
    const dx = p.x - mesh.x, dy = p.y - mesh.y;
    const u =  cr * dx + sr * dy;
    const v = -sr * dx + cr * dy;
    return { x: ax + u / (texW * absSx), y: ay + v / (texH * absSy) };
  };
};
