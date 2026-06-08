import type { P2, P3, AffineMatrix, TileMeshCoord } from "./coord-types";

// ── VIEWPORT ↔ SCREEN ────────────────────────────────────────────────────────

/** Screen (browser window) → viewport (canvas element) pixels. */
export function screenToViewport(p: P2): P2 {
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: p.x - rect.left, y: p.y - rect.top };
}

/** Viewport (canvas element) → screen (browser window) pixels. */
export function viewportToScreen(p: P2): P2 {
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: p.x + rect.left, y: p.y + rect.top };
}

// ── WORLD ↔ VIEWPORT ─────────────────────────────────────────────────────────

/** World coordinates → viewport (canvas element) pixels. */
export function worldToViewport(p: P2, wt: AffineMatrix): P2 {
  return { x: wt.a * p.x + wt.c * p.y + wt.tx, y: wt.b * p.x + wt.d * p.y + wt.ty };
}

/** Viewport (canvas element) pixels → world coordinates. */
export function viewportToWorld(p: P2, wt: AffineMatrix): P2 {
  const det = wt.a * wt.d - wt.b * wt.c;
  return {
    x: ( (p.x - wt.tx) * wt.d - (p.y - wt.ty) * wt.c) / det,
    y: (-(p.x - wt.tx) * wt.b + (p.y - wt.ty) * wt.a) / det,
  };
}

/** World delta (no translation) → viewport delta. */
export function worldDeltaToViewport(dx: number, dy: number, wt: AffineMatrix): P2 {
  return { x: wt.a * dx + wt.c * dy, y: wt.b * dx + wt.d * dy };
}

/** Viewport delta (no translation) → world delta. */
export function viewportDeltaToWorld(dx: number, dy: number, wt: AffineMatrix): P2 {
  const det = wt.a * wt.d - wt.b * wt.c;
  return { x: (dx * wt.d - dy * wt.c) / det, y: (-dx * wt.b + dy * wt.a) / det };
}

// ── WORLD ↔ SCREEN (composition) ─────────────────────────────────────────────

/** Screen → world (convenience: screen → viewport → world). */
export function screenToWorld(p: P2, wt: AffineMatrix): P2 {
  return viewportToWorld(screenToViewport(p), wt);
}

/** World → screen (convenience: world → viewport → screen). */
export function worldToScreen(p: P2, wt: AffineMatrix): P2 {
  return viewportToScreen(worldToViewport(p, wt));
}

// ── WORLD ↔ IMAGE ─────────────────────────────────────────────────────────────

/**
 * Transform a world point to normalised image coordinates [0,1]² for a tile mesh.
 *
 * Inverse of the PIXI mesh transform chain:
 *   world = mesh.pos + rotate(r) × scale × ((img - anchor) × texDims)
 * Inverse:
 *   delta = world - mesh.pos
 *   unrotated = rotate(-r) × delta
 *   localPx = unrotated / scale
 *   img = anchor + localPx / texDims
 */
export function worldToImage(p: P2, mesh: TileMeshCoord): P2 {
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const texW = mesh.texture?.width  ?? 1;
  const texH = mesh.texture?.height ?? 1;
  const absSx = Math.abs(mesh.scale.x);
  const absSy = Math.abs(mesh.scale.y);
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  const dx = p.x - mesh.x, dy = p.y - mesh.y;
  const u =  cr * dx + sr * dy;
  const v = -sr * dx + cr * dy;
  return { x: ax + u / (texW * absSx), y: ay + v / (texH * absSy) };
}

/**
 * Transform a normalised image coordinate [0,1]² to world space for a tile mesh.
 *
 * Forward PIXI mesh transform chain:
 *   localPx = (img - anchor) × texDims
 *   scaled  = localPx × scale
 *   rotated = rotate(r) × scaled
 *   world   = mesh.pos + rotated
 */
export function imageToWorld(p: P2, mesh: TileMeshCoord): P2 {
  const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
  const texW = mesh.texture?.width  ?? 1;
  const texH = mesh.texture?.height ?? 1;
  const absSx = Math.abs(mesh.scale.x);
  const absSy = Math.abs(mesh.scale.y);
  const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
  const lx = (p.x - ax) * texW * absSx;
  const ly = (p.y - ay) * texH * absSy;
  return { x: mesh.x + cr * lx - sr * ly, y: mesh.y + sr * lx + cr * ly };
}

// ── WORLD ↔ GRID ──────────────────────────────────────────────────────────────

/** World pixel coordinates → grid units. */
export function worldToGrid(p: P2, gridSize: number): P2 {
  return { x: p.x / gridSize, y: p.y / gridSize };
}

/** Grid units → world pixel coordinates. */
export function gridToWorld(p: P2, gridSize: number): P2 {
  return { x: p.x * gridSize, y: p.y * gridSize };
}

// ── ISO3D ↔ WORLD ─────────────────────────────────────────────────────────────

/**
 * Project an ISO3D point to world space.
 * @param p      3D point: x/y in world-pixel footprint, z in grid-distance units
 * @param hDir   heightDir from IsoProjection  ({x:1, y:-1} for all built-in presets)
 * @param gs     canvas.grid.size (px per grid unit)
 * @param gd     grid distance per grid unit (canvas.grid.distance)
 */
export function iso3DToWorld(p: P3, hDir: P2, gs: number, gd: number): P2 {
  const E = p.z * gs / gd;
  return { x: p.x + hDir.x * E, y: p.y + hDir.y * E };
}

/**
 * Back-project a world point to ISO3D space given a known elevation z.
 * (z cannot be recovered from the 2D world point alone — supply it externally.)
 */
export function worldToIso3D(p: P2, z: number, hDir: P2, gs: number, gd: number): P3 {
  const E = z * gs / gd;
  return { x: p.x - hDir.x * E, y: p.y - hDir.y * E, z };
}

/**
 * Elevation value in grid-distance units → canvas pixel offset along heightDir.
 * Equivalent to elevToCanvas() in util.ts; provided here for completeness.
 */
export function elevationToWorldOffset(z: number, gs: number, gd: number): number {
  return z * gs / gd;
}
