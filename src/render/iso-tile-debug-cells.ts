// iso-tile-debug-cells.ts — per-cell slice marker rendering for debugSlices mode.
// Markers are currently disabled (visual clutter); the labels in iso-tile-debug-paint carry
// the cell association. Full marker implementation lives in git history (pre 2026-07-02).
import type { SliceDebugParams } from "./iso-tile-debug";

export function drawCellMarkers(_wc: PIXI.Container, _p: SliceDebugParams): void {
  // intentionally empty — see header note
}
