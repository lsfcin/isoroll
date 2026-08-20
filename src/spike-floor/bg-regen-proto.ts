// T2 — spike prototype (b): pure builder mapping a view to a scene-background update payload
// for the ASSEMBLED scene image (transformBackground/backgroundYScale). Pure view->file map, no I/O.
import type { View } from "../assemble";

export type BgSpec = {
  "background.src": string;
  "flags.isoroll.transformBackground": boolean;
  "flags.isoroll.backgroundYScale": number;
};

// Assembled PNGs are copied into the module's own e2e assets (mirroring the kit/ convention in
// floor-tiles-proto.ts) so Foundry can serve them at modules/isoroll/test/e2e/assets/assembled/*.png.
// Loop 4b must place l-room_{SW,SE,NE,NW}.png there (source: isoroll-content/output/assembled/).
export function buildBackgroundSpec(view: View, opts?: { yScale?: number }): BgSpec {
  return {
    "background.src": `modules/isoroll/test/e2e/assets/assembled/l-room_${view}.png`,
    "flags.isoroll.transformBackground": true,
    "flags.isoroll.backgroundYScale": opts?.yScale ?? 1,
  };
}
