// T1 — the OFFLINE twin of test/e2e/parity-one-cell.spec.mjs: does the placement rule reproduce
// isoroll-content's plan, on paper, before Foundry is even started?
//
// It composes the same three pieces the live path does — import-tiles (which cell goes where),
// tile-sprite-anchor (how big the sprite is and which texel is pinned) — and projects the result
// with the stage matrix PIXI builds from the projection preset. What it CANNOT check is that
// Foundry and PIXI then do what this model says; that is exactly what the e2e spec is for. What it
// buys is that a placement bug is caught in 40ms instead of needing a live server, and that the
// three CP-2 causes (density scale, origin anchor, grid turn) can never come back silently.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { manifestTileToData } from "../../src/import/import-tiles";
import type { ManifestTile } from "../../src/import/manifest-types";
import { DIMETRIC_2_1 } from "../../src/transform/constants";
import { spriteOriginWorld, spriteUniformScale } from "../../src/transform/tile-sprite-anchor";

const ASSETS = new URL("../e2e/assets/one-cell/manifests/", import.meta.url);
const GRID = 100;
const TOLERANCE_PX = 1.5;

type PlanTile = { asset: string; u: number; v: number; left: number; top: number };
type Plan = { pxPerVoxel: number; tiles: PlanTile[] };

function load<T>(name: string): T {
  const path = new URL(name, ASSETS);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

// PIXI Transform.updateLocalTransform for canvas.app.stage at zoom 1 — the projection as the
// renderer composes it, not as this test wishes it were.
function stagePoint(p: { x: number; y: number }): { x: number; y: number } {
  const { rotation, skewX, skewY } = DIMETRIC_2_1;
  const a = Math.cos(rotation + skewY);
  const b = Math.sin(rotation + skewY);
  const c = -Math.sin(rotation - skewX);
  const d = Math.cos(rotation - skewX);
  return { x: a * p.x + c * p.y, y: b * p.x + d * p.y };
}

/** Where the sprite's top-left lands in stage space, by the module's own rules. */
function spriteTopLeft(t: ManifestTile, rows: number): { x: number; y: number } {
  const data = manifestTileToData(t, GRID, "base", rows) as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const originPx = t.originPx as [number, number];
  const meta = { originPx: { x: originPx[0], y: originPx[1] }, pxPerVoxel: t.pxPerVoxel };
  const uniform = spriteUniformScale(meta, GRID, DIMETRIC_2_1);
  const base = { x: data.x, y: data.y };
  const world = spriteOriginWorld(base, data.width, data.height, DIMETRIC_2_1.heightDir);
  const stage = stagePoint(world);
  return { x: stage.x - originPx[0] * uniform, y: stage.y - originPx[1] * uniform };
}

describe("placement parity — one-cell fixture, offline", () => {
  const plan = load<Plan>("one-cell_sw_plan.json");
  const manifest = load<{ chunk: { rows: number }; tiles: ManifestTile[] }>(
    "one-cell_sw_manifest.json",
  );
  const rows = manifest.chunk.rows;
  // Same conversion the e2e comparator uses: both sides are SCREEN px, so the ratio is the
  // projected size of a grid unit over the baked size of a voxel.
  const scale = spriteUniformScale(
    { originPx: { x: 0, y: 0 }, pxPerVoxel: plan.pxPerVoxel },
    GRID,
    DIMETRIC_2_1,
  );

  it("puts every sprite where the offline renderer put it, relative to the first", () => {
    const anchorPlan = plan.tiles[0];
    const anchorActual = spriteTopLeft(manifest.tiles[0], rows);
    for (let i = 0; i < plan.tiles.length; i++) {
      const row = plan.tiles[i];
      const actual = spriteTopLeft(manifest.tiles[i], rows);
      const dx = actual.x - anchorActual.x - (row.left - anchorPlan.left) * scale;
      const dy = actual.y - anchorActual.y - (row.top - anchorPlan.top) * scale;
      expect(Math.abs(dx), `${row.asset}@${row.u},${row.v} dx`).toBeLessThan(TOLERANCE_PX);
      expect(Math.abs(dy), `${row.asset}@${row.u},${row.v} dy`).toBeLessThan(TOLERANCE_PX);
    }
  });

  it("pairs the plan and the manifest tile for tile — a reordering would fake the test above", () => {
    for (let i = 0; i < plan.tiles.length; i++) {
      const row = plan.tiles[i];
      const tile = manifest.tiles[i];
      expect(tile.asset).toBe(`${row.asset}.png`);
      expect([tile.u, tile.v]).toEqual([row.u, row.v]);
    }
  });
});
