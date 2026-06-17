// Typed, null-safe reader of tile/token mesh geometry.
// Replaces all `as unknown as MeshLike` casts across overlays/gizmos after Phase 3.

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

export const MeshAccessor = {
  geometryOf(_placeable: Tile | Token): MeshGeometry | null {
    throw new Error("not implemented");
  },
};
