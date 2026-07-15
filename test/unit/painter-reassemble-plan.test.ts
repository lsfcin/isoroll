// T5 — unit seam for src/painter/reassemble-plan.ts (3-arch.md painter-mvp-1, the C6 seam).
// This IS the pin 3-arch.md points to for PIN D1 ("the model's internal attr encoding is NOT
// frozen ... the T5 plan-unit test is the pin, not this prose"): l-room -> {6 floor tiles, wall
// boxes, 24 slices}. Counts hand-verified by running massing() on the v2 l-room fixture directly
// (see comment below) — this file is the source of truth for those numbers, not a copy of
// spike-floor's or any other module's magic numbers.
//
// gs is NOT a parameter of buildReassemblePlan per 3-arch.md ("buildReassemblePlan(model,view)")
// — it is sourced internally via CanvasEnv.gridSize(), which reads the already-stubbed
// `canvas.grid.size` global from test/unit/setup.ts (size: 100). That is what keeps this module
// "fully unit-testable" per 3-arch.md despite depending on CanvasEnv.
//
// wallDefs' ax/ay anchor-to-frameTile math is NOT pinned here: 3-arch.md's own prose shows
// wallBoxesToDefs's output being consumed by reassemble-apply.ts (createWallsFromDefs(frameTile,
// ...)), and frameTile only exists once floor tiles are actually created in Foundry — an
// integration-time fact, not something buildReassemblePlan can resolve purely. Only the WallDef
// shape and count (one WallDef per wall Box, mirroring the "wallBoxesToDefs" name — no merging
// described anywhere for walls, unlike the explicit floor merge) are pinned; the anchor formula
// is reassemble-apply.ts's e2e territory (Loop 5).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { massing } from "../../src/assemble/massing";
import { parseTextV2 } from "../../src/assemble/layout-dsl-v2";
import { buildReassemblePlan } from "../../src/painter/reassemble-plan";
import { PainterModel } from "../../src/painter/model";

const FIXTURE_PATH = join(__dirname, "assets/dsl-v2/dsl_v2_lroom.txt");

function loadLRoomLayout() {
  const text = readFileSync(FIXTURE_PATH, "utf-8");
  const layout = parseTextV2(text, "l-room-v2");
  expect(layout.errors).toEqual([]);
  return layout;
}

function loadLRoomModel(): PainterModel {
  return new PainterModel(loadLRoomLayout());
}

describe("buildReassemblePlan — l-room baseline (3-arch.md C6 pin)", () => {
  it("emits exactly 6 merged floor tiles (not one per cell)", () => {
    const plan = buildReassemblePlan(loadLRoomModel(), "SW");
    expect(plan.floorTileData).toHaveLength(6);
  });

  it("slices == 24 (the per-cell floor-voxel count the perf gate budgets against)", () => {
    // Hand-verified: parsing dsl_v2_lroom.txt and running massing() directly gives floor boxes
    // with run-lengths [6,6,6,2,2,2] (rows v=1..3 the 6-wide leg, v=4..6 the 2-wide leg) -> sum=24.
    // This mirrors the same fixture's known per-cell-equivalent count in
    // test/unit/spike-floor-tiles.test.ts ("merge-sanity: per-cell equivalent count is 24").
    const plan = buildReassemblePlan(loadLRoomModel(), "SW");
    expect(plan.slices).toBe(24);
  });

  it("floor tile widths sum to the same 24-slice count, each tile height == gs (100)", () => {
    const plan = buildReassemblePlan(loadLRoomModel(), "SW");
    const gs = 100;
    const perCellEquivalent = plan.floorTileData.reduce((sum, t) => sum + t.width / gs, 0);
    expect(perCellEquivalent).toBe(24);
    for (const tile of plan.floorTileData) {
      expect(tile.height).toBe(gs);
      expect(tile.width % gs).toBe(0);
    }
  });

  it("wall boxes are present: one WallDef per massing() wall Box for this fixture", () => {
    // Self-consistent pin (not a hardcoded magic number): independently re-derive the wall box
    // count from massing() on the same fixture, so this test stays correct even if the DSL or
    // massing()'s wall algorithm changes the l-room's wall-cell count later.
    const layout = loadLRoomLayout();
    const expectedWallBoxCount = massing(layout).filter((b) => b.kind === "wall").length;

    const plan = buildReassemblePlan(new PainterModel(layout), "SW");
    expect(plan.wallDefs.length).toBe(expectedWallBoxCount);
    expect(plan.wallDefs.length).toBeGreaterThan(0);
  });

  it("every WallDef has the shape createWallsFromDefs expects (ax/ay/bx/by/topOffset/bottomOffset/config)", () => {
    const plan = buildReassemblePlan(loadLRoomModel(), "SW");
    for (const def of plan.wallDefs) {
      expect(typeof def.ax).toBe("number");
      expect(typeof def.ay).toBe("number");
      expect(typeof def.bx).toBe("number");
      expect(typeof def.by).toBe("number");
      expect(typeof def.topOffset).toBe("number");
      expect(typeof def.bottomOffset).toBe("number");
      expect(typeof def.config).toBe("object");
    }
  });
});
