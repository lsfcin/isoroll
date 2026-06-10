import type { P2, AffineMatrix } from './coord-types.js';
/** Screen (browser window) pixels → world coordinates. */
export declare const toWorld: (wt: AffineMatrix) => ((p: P2) => P2);
/** World coordinates → screen (browser window) pixels. */
export declare const fromWorld: (wt: AffineMatrix) => ((p: P2) => P2);
