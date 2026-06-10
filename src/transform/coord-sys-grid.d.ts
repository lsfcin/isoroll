import type { P2 } from './coord-types.js';
/** Grid units → world pixel coordinates. */
export declare const toWorld: (gridSize: number) => ((p: P2) => P2);
/** World pixel coordinates → grid units. */
export declare const fromWorld: (gridSize: number) => ((p: P2) => P2);
