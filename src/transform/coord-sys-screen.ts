// SCREEN ↔ WORLD: browser window pixels via viewport affine inverse.
import type { P2, AffineMatrix } from './coord-types.js';
import { toWorld as vpToWorld, fromWorld as worldToVp } from './coord-sys-viewport.js';

const getCanvasRect = (): DOMRect =>
  (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();

/** Screen (browser window) pixels → world coordinates. */
export const toWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  const rect = getCanvasRect();
  const vpFn = vpToWorld(wt);
  return (p: P2) => vpFn({ x: p.x - rect.left, y: p.y - rect.top });
};

/** World coordinates → screen (browser window) pixels. */
export const fromWorld = (wt: AffineMatrix): ((p: P2) => P2) => {
  const rect = getCanvasRect();
  const vpFn = worldToVp(wt);
  return (p: P2) => {
    const vp = vpFn(p);
    return { x: vp.x + rect.left, y: vp.y + rect.top };
  };
};
