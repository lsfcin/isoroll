import type { P2 } from './coord-types.js';

/** Grid units → world pixel coordinates. */
export const toWorld = (gridSize: number): ((p: P2) => P2) => {
  return (p: P2) => ({ x: p.x * gridSize, y: p.y * gridSize });
};

/** World pixel coordinates → grid units. */
export const fromWorld = (gridSize: number): ((p: P2) => P2) => {
  return (p: P2) => ({ x: p.x / gridSize, y: p.y / gridSize });
};
