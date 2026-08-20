// T3 — measurement oracle. ONE classifier (classifyFog) shared by vitest + e2e (via the
// isoroll.spike global) so fog-state numbers can never diverge between the two test layers.
// dumpZOrderJSON() carries visible+alpha but NOT tint, so it cannot tell explored from visible
// (both visible:true) — this module's dumpFogSlices() is the correction: it reads tint too.
// Both symbols come through the render facade: EXPLORED_TINT and tileSlices.
import { EXPLORED_TINT, tileSlices } from "../render";
import type { FloorTileSpec } from "./floor-tiles-proto";

export type FogClass = "unseen" | "explored" | "visible";

export type FogRow = {
  tileId: string;
  slice: number;
  visible: boolean;
  alpha: number;
  tint: number;
};

export type FogCoverage = {
  unseen: number;
  explored: number;
  visible: number;
  total: number;
  darkenedFraction: number;
};

// Truth table: !visible -> unseen; visible && tint===EXPLORED_TINT(0x808080) -> explored;
// visible && tint===0xffffff -> visible. Source: src/render/fog-apply.applyTileFog + fog-state.applyNonVisibleFog.
export function classifyFog(r: { visible: boolean; tint: number }): FogClass {
  let result: FogClass = "visible";
  if (!r.visible) {
    result = "unseen";
  } else if (r.tint === EXPLORED_TINT) {
    result = "explored";
  }
  return result;
}

export function fogCoverage(rows: FogRow[]): FogCoverage {
  let unseen = 0;
  let explored = 0;
  let visible = 0;
  for (const row of rows) {
    const cls = classifyFog(row);
    if (cls === "unseen") {
      unseen++;
    } else if (cls === "explored") {
      explored++;
    } else {
      visible++;
    }
  }
  const total = rows.length;
  const darkenedFraction = total > 0 ? (unseen + explored) / total : 0;
  return { unseen, explored, visible, total, darkenedFraction };
}

export function countFloorTiles(specs: FloorTileSpec[]): number {
  return specs.length;
}

export function countSlices(dump: unknown[]): number {
  return dump.length;
}

// In-page reader (browser only): walks tileSlices (slices[0] carries fog state; syncAllTileFog
// broadcasts it to peers — see iso-tile-fog-sync.ts) and returns one row per slice.
export function dumpFogSlices(): FogRow[] {
  const rows: FogRow[] = [];
  for (const [tileId, slices] of tileSlices.entries()) {
    slices.forEach((sprite, i) => {
      rows.push({
        tileId,
        slice: i,
        visible: sprite.visible,
        alpha: sprite.alpha,
        tint: sprite.tint as unknown as number,
      });
    });
  }
  return rows;
}

export function buildComparisonTable(
  protoA: Record<string, unknown>,
  protoB: Record<string, unknown>,
): Record<string, unknown>[] {
  return [
    { proto: "a", ...protoA },
    { proto: "b", ...protoB },
  ];
}
