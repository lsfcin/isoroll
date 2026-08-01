// The bake's grid, the module's world, and the one turn between them.
//
// isoroll-content projects x = u - v, y = 0.5(u + v) - z (view_table.py `_DIMETRIC`); the module's
// stage projects x = a(X + Y), y = 0.5a(Y - X) - a*elev. Setting those equal gives Y = u, X = -v:
// the manifest's +u axis is the module's +y, its +v axis the module's -x. Importing (u,v) straight
// into (x,y) lays the scene out a quarter turn off, which no per-piece nudge can undo.
//
// Tiles and walls both cross this seam, so it is stated once here. `rows` (manifest chunk.rows)
// only slides the result back into positive world coordinates.

export type World = { x: number; y: number };

/** WORLD position of a bake-grid point. Continuous: pass u + l/2 for a box centre. */
export function cellToWorld(u: number, v: number, rows: number, gridSize: number): World {
  return { x: (rows - v) * gridSize, y: u * gridSize };
}
