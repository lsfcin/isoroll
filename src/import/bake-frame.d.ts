export type World = {
    x: number;
    y: number;
};
/** WORLD position of a bake-grid point. Continuous: pass u + l/2 for a box centre. */
export declare function cellToWorld(u: number, v: number, rows: number, gridSize: number): World;
