import type { P2, P3 } from './coord-types.js';
/**
 * ISO3D → world coordinates.
 * @param heightDir  elevation direction vector ({x:1, y:-1} for all built-in presets)
 * @param gridSize   canvas.grid.size — canvas pixels per grid unit
 * @param gridDist   canvas.grid.distance — world distance per grid unit
 */
export declare const toWorld: (heightDir: P2, gridSize: number, gridDist: number) => ((p: P3) => P2);
/**
 * World coordinates → ISO3D space, given a known elevation z.
 * (z cannot be recovered from the 2D world point alone — supply externally.)
 */
export declare const fromWorld: (heightDir: P2, gridSize: number, gridDist: number) => ((p: P2) => (z: number) => P3);
