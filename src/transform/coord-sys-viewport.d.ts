import type { P2, AffineMatrix } from './coord-types.js';
/** Viewport (canvas element) pixels → world coordinates. */
export declare const toWorld: (wt: AffineMatrix) => ((p: P2) => P2);
/** World coordinates → viewport (canvas element) pixels. */
export declare const fromWorld: (wt: AffineMatrix) => ((p: P2) => P2);
