// Typed, null-safe reader of tile/token mesh geometry.
// Boundary file: the only place that reads tile.mesh/token.mesh properties directly.

export type MeshGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  skew: { x: number; y: number };
};

type RawMesh = {
  x?: number;
  y?: number;
  rotation?: number;
  texture?: { width: number; height: number };
  anchor?: { x: number; y: number };
  scale?: { x: number; y: number };
  skew?: { x: number; y: number };
};

export type Quad = { x: number; y: number }[];

// The four WORLD-space corners of a mesh's texture quad. Lifted out of draw/contour.ts so the
// dashed outline the user sees and the rects the parity oracle reports come from ONE derivation —
// a second copy of this math is how "the outline looks right but the numbers disagree" happens.
export function meshQuad(geo: MeshGeometry | null): Quad | null {
  let result: Quad | null = null;
  if (geo && geo.width !== 0 && geo.height !== 0) {
    const { anchor: a, scale: s } = geo;
    const cr = Math.cos(geo.rotation);
    const sr = Math.sin(geo.rotation);
    const local = [
      { x: -a.x * geo.width, y: -a.y * geo.height },
      { x: (1 - a.x) * geo.width, y: -a.y * geo.height },
      { x: (1 - a.x) * geo.width, y: (1 - a.y) * geo.height },
      { x: -a.x * geo.width, y: (1 - a.y) * geo.height },
    ];
    result = local.map((c) => ({
      x: geo.x + cr * (c.x * s.x) - sr * (c.y * s.y),
      y: geo.y + sr * (c.x * s.x) + cr * (c.y * s.y),
    }));
  }
  return result;
}

export type Rect = { left: number; top: number; width: number; height: number };

/** Axis-aligned bounds of a point cloud — shared by every "where did this land" measurement. */
export function boundsOf(xs: number[], ys: number[]): Rect {
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}

// Axis-aligned WORLD bounds of that quad — what a placement comparison actually needs.
export function meshBounds(geo: MeshGeometry | null): Rect | null {
  const quad = meshQuad(geo);
  let result: Rect | null = null;
  if (quad) {
    const xs = quad.map((p) => p.x);
    const ys = quad.map((p) => p.y);
    result = boundsOf(xs, ys);
  }
  return result;
}

export const MeshAccessor = {
  geometryOf(placeable: Tile | Token): MeshGeometry | null {
    const raw = (placeable as unknown as { mesh?: unknown }).mesh;
    const mesh = raw as RawMesh | null | undefined;
    let result: MeshGeometry | null = null;
    if (mesh?.texture && mesh.scale) {
      result = {
        x: mesh.x ?? 0,
        y: mesh.y ?? 0,
        width: mesh.texture.width,
        height: mesh.texture.height,
        anchor: mesh.anchor ?? { x: 0.5, y: 0.5 },
        scale: mesh.scale,
        rotation: mesh.rotation ?? 0,
        skew: mesh.skew ?? { x: 0, y: 0 },
      };
    }
    return result;
  },
};
