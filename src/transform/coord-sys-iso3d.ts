// ISO3D ↔ WORLD: 3D isometric space with elevation via heightDir.
import type { P2, P3 } from './coord-types.js';

/**
 * ISO3D → world coordinates.
 * @param heightDir  elevation direction vector ({x:1, y:-1} for all built-in presets)
 * @param gridSize   canvas.grid.size — canvas pixels per grid unit
 * @param gridDist   canvas.grid.distance — world distance per grid unit
 */
export const toWorld = (heightDir: P2, gridSize: number, gridDist: number): ((p: P3) => P2) => {
  return (p: P3) => {
    const elevPx = p.z * gridSize / gridDist;
    return { x: p.x + heightDir.x * elevPx, y: p.y + heightDir.y * elevPx };
  };
};

/**
 * World coordinates → ISO3D space, given a known elevation z.
 * (z cannot be recovered from the 2D world point alone — supply externally.)
 */
export const fromWorld = (heightDir: P2, gridSize: number, gridDist: number): ((p: P2) => (z: number) => P3) => {
  return (p: P2) => (z: number) => {
    const elevPx = z * gridSize / gridDist;
    return { x: p.x - heightDir.x * elevPx, y: p.y - heightDir.y * elevPx, z };
  };
};
