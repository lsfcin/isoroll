// Footprint math for tiles and tokens.
// Reads via CanvasEnv + currentProjection — no raw canvas.* after Phase 3.
// After Phase 3: volume-box.ts receives geometry as param (purely functional).

export type P2 = { x: number; y: number };
export type P3 = { x: number; y: number; z: number };
export type BoxVerts = P3[];

export const IsoGeometry = {
  tileVerts(_tile: Tile): BoxVerts { throw new Error("not implemented"); },
  tokenVerts(_token: Token): BoxVerts { throw new Error("not implemented"); },
  footprint(_placeable: Tile | Token): P2[] { throw new Error("not implemented"); },
};
