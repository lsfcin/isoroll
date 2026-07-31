// T1 — the OFFLINE twin of the parity e2e specs: does the placement rule reproduce
// isoroll-content's plan, on paper, before Foundry is even started?
//
// It composes the same pieces the live path does — import-tiles (which cell goes where, and how
// much ground it covers) and tile-sprite-anchor (how big the sprite is, which texel is pinned) —
// and projects the result with the stage matrix PIXI builds from the projection preset. What it
// CANNOT check is that Foundry and PIXI then do what this model says; that is what the e2e specs
// are for. What it buys is a placement bug caught in 40ms with no server, and three causes that
// can never come back silently: density scale, origin anchor, grid turn.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { manifestTileToData } from "../../src/import/import-tiles";
import type { ManifestTile } from "../../src/import/manifest-types";
import { DIMETRIC_2_1 } from "../../src/transform/constants";
import { spriteOriginWorld, spriteUniformScale } from "../../src/transform/tile-sprite-anchor";

const GRID = 100;
const TOLERANCE_PX = 1.5;
// Same fixtures the e2e specs run: 1 cell (CP-1/CP-2), then a whole flat layer (CP-3).
const FIXTURES = ["one-cell", "l-room"];

type PlanTile = { asset: string; u: number; v: number; left: number; top: number };
type Plan = { pxPerVoxel: number; tiles: PlanTile[] };
type Manifest = { chunk: { rows: number }; tiles: ManifestTile[] };

function load<T>(fixture: string, kind: string): T {
  const path = new URL(
    `../e2e/assets/${fixture}/manifests/${fixture}_sw_${kind}.json`,
    import.meta.url,
  );
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

describe.each(FIXTURES)("placement parity — %s fixture, offline", (fixture) => {
  const plan = load<Plan>(fixture, "plan");
  const manifest = load<Manifest>(fixture, "manifest");
  const rows = manifest.chunk.rows;
  // Same conversion the e2e comparator uses: both sides are SCREEN px, so the ratio is the
  // projected size of a grid unit over the baked size of a voxel.
  const scale = spriteUniformScale(
    { originPx: { x: 0, y: 0 }, pxPerVoxel: plan.pxPerVoxel },
    GRID,
    DIMETRIC_2_1,
  );

  // The two files are NOT in the same order — the plan is sorted into painter order, the manifest
  // follows massing order — so they pair by identity, exactly as test/e2e/parity.mjs does.
  const keyOf = (asset: string, u: number, v: number) => `${asset}@${u},${v}`;
  const byKey = new Map(manifest.tiles.map((t) => [keyOf(t.asset, t.u, t.v), t]));

  it("gives every plan row exactly one manifest tile to pair with", () => {
    expect(byKey.size).toBe(manifest.tiles.length);
    expect(manifest.tiles.length).toBe(plan.tiles.length);
    for (const row of plan.tiles) {
      expect(
        byKey.has(keyOf(`${row.asset}.png`, row.u, row.v)),
        keyOf(row.asset, row.u, row.v),
      ).toBe(true);
    }
  });

  it("puts every sprite where the offline renderer put it, relative to the first", () => {
    const tileFor = (row: PlanTile) =>
      byKey.get(keyOf(`${row.asset}.png`, row.u, row.v)) as ManifestTile;
    const anchorPlan = plan.tiles[0];
    const anchorActual = spriteTopLeft(tileFor(anchorPlan), rows);
    for (const row of plan.tiles) {
      const actual = spriteTopLeft(tileFor(row), rows);
      const dx = actual.x - anchorActual.x - (row.left - anchorPlan.left) * scale;
      const dy = actual.y - anchorActual.y - (row.top - anchorPlan.top) * scale;
      expect(Math.abs(dx), `${row.asset}@${row.u},${row.v} dx`).toBeLessThan(TOLERANCE_PX);
      expect(Math.abs(dy), `${row.asset}@${row.u},${row.v} dy`).toBeLessThan(TOLERANCE_PX);
    }
  });
});
