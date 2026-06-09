// VIEWPORT ↔ WORLD: affine matrix inverse/forward.
import type { P2, AffineMatrix } from './coord-types.js';

/** Viewport (canvas element) pixels → world coordinates. */
export const toWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  const det = wt.a * wt.d - wt.b * wt.c;
  return (p: P2) => ({
    x: ((p.x - wt.tx) * wt.d - (p.y - wt.ty) * wt.c) / det,
    y: (-(p.x - wt.tx) * wt.b + (p.y - wt.ty) * wt.a) / det,
  });
};

/** World coordinates → viewport (canvas element) pixels. */
export const fromWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  return (p: P2) => ({
    x: wt.a * p.x + wt.c * p.y + wt.tx,
    y: wt.b * p.x + wt.d * p.y + wt.ty,
  });
};
