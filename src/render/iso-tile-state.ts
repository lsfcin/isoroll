// iso-tile-state.ts — shared registries for live tile slices and their slice-cut state.
// Split from iso-tile-renderer so fog-sync/debug/occluder can import without cycles.
import type { SliceState } from "./iso-tile-geom";

export const tileSlices = new Map<string, PIXI.Sprite[]>();
export const tileSliceCuts = new Map<string, SliceState>();
