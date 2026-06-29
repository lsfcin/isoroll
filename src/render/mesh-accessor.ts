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
  x?: number; y?: number; rotation?: number;
  texture?: { width: number; height: number };
  anchor?: { x: number; y: number };
  scale?: { x: number; y: number };
  skew?: { x: number; y: number };
};

export const MeshAccessor = {
  geometryOf(placeable: Tile | Token): MeshGeometry | null {
    const raw = (placeable as unknown as { mesh?: unknown }).mesh;
    const mesh = raw as RawMesh | null | undefined;
    let result: MeshGeometry | null = null;
    if (mesh?.texture && mesh.scale) {
      result = {
        x:        mesh.x        ?? 0,
        y:        mesh.y        ?? 0,
        width:    mesh.texture.width,
        height:   mesh.texture.height,
        anchor:   mesh.anchor   ?? { x: 0.5, y: 0.5 },
        scale:    mesh.scale,
        rotation: mesh.rotation ?? 0,
        skew:     mesh.skew     ?? { x: 0, y: 0 },
      };
    }
    return result;
  },
};
