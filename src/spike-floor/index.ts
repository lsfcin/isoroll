// Spike facade — exposed on globalThis.isoroll.spike (src/core/module.ts) so the throwaway e2e
// (which cannot import .ts) can drive both prototypes and the shared measurement oracle.
// Loop 4b: floorSpecsFor = parseText(gridText) -> buildFloorTileSpecs(...) (both from this dir).
import { parseText } from "../assemble";
import type { View } from "../assemble";
import { buildFloorTileSpecs } from "./floor-tiles-proto";
import type { FloorTileSpec } from "./floor-tiles-proto";
import { buildBackgroundSpec } from "./bg-regen-proto";
import type { BgSpec } from "./bg-regen-proto";
import { syncAllTileFog } from "../render/iso-tile-fog-sync";

export { buildFloorTileSpecs } from "./floor-tiles-proto";
export type { FloorTileSpec } from "./floor-tiles-proto";
export { buildBackgroundSpec } from "./bg-regen-proto";
export type { BgSpec } from "./bg-regen-proto";
export {
  classifyFog,
  fogCoverage,
  countFloorTiles,
  countSlices,
  dumpFogSlices,
  buildComparisonTable,
} from "./measure";
export type { FogClass, FogRow, FogCoverage } from "./measure";

// parseText(gridText) -> buildFloorTileSpecs(...): e2e never constructs a Layout in-page.
export function floorSpecsFor(gridText: string, view: View, gs: number): FloorTileSpec[] {
  const layout = parseText(gridText);
  return buildFloorTileSpecs(layout, view, gs);
}

export function backgroundSpecFor(view: View, opts?: { yScale?: number }): BgSpec {
  return buildBackgroundSpec(view, opts);
}

export const syncFog = syncAllTileFog;
