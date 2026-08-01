// One PARITY LADDER fixture, imported and judged — shared by the checkpoint specs and the board.
//
// Every checkpoint asks the same question of a bigger layout ("does Foundry put each sprite where
// isoroll-content put it?"), so the question is written once here and each spec only names its
// fixture. A checkpoint that needed its own assertions would be asking something else.
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { loadFixture } from "./helpers.mjs";
import { compare, loadPlan, report } from "./parity.mjs";

export const GRID = 100;

/** Baked by `iso-cli.py bake-scene --layout <layout> --out test/e2e/assets/<name> --preview`. */
export const FIXTURES = {
  "one-cell": { slug: "one-cell", tiles: 2 },
  "open-room": { slug: "open-room", tiles: 128 },
};

function paths(name) {
  const { slug } = FIXTURES[name];
  return {
    root: `modules/isoroll/test/e2e/assets/${name}`,
    manifest: `${slug}_sw_manifest.json`,
    plan: fileURLToPath(new URL(`./assets/${name}/manifests/${slug}_sw_plan.json`, import.meta.url)),
    reference: fileURLToPath(new URL(`./assets/${name}/preview/${slug}_SW.png`, import.meta.url)),
  };
}

/** Fresh scene, manifest imported, tile rects + the stage ruler read back off the live canvas. */
export async function importFixture(page, name) {
  const cp = paths(name);
  await loadFixture(page, { name: `fx-parity-${name}`, gridSize: GRID });
  const dump = await page.evaluate(
    async ({ root, manifest }) => {
      const parsed = await (await fetch(`${root}/manifests/${manifest}`)).json();
      await globalThis.isoroll.importSceneManifest(parsed, { assetBase: `${root}/kit/dimetric` });
      // Textures load asynchronously; a mesh quad is meaningless until they are in.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        rects: globalThis.isoroll.dumpTileRects(),
        metrics: globalThis.isoroll.dumpStageMetrics(),
        // WORLD-space endpoints of every Foundry wall the import created.
        walls: canvas.walls.placeables.map((w) => [...w.document.c]),
        manifestWalls: parsed.walls.length,
      };
    },
    { root: cp.root, manifest: cp.manifest },
  );
  return { ...cp, plan: loadPlan(cp.plan), referencePng: cp.reference, ...dump };
}

/** Every sprite present, once, at the size and place the offline renderer put it. */
export function assertParity(name, loaded) {
  const { plan, rects, metrics } = loaded;
  const expected = FIXTURES[name].tiles;
  assert.equal(plan.tiles.length, expected, `fixture changed: plan has ${plan.tiles.length} tiles`);
  assert.equal(rects.length, expected, `expected ${expected} tiles in Foundry, got ${rects.length}`);
  assert.equal(metrics.gridSize, GRID, `fixture grid changed: ${metrics.gridSize}`);

  const result = compare(plan, rects, metrics.pxPerGridUnit);
  assert.equal(result.missingMesh.length, 0, `tiles with no rendered mesh:\n${report(result)}`);
  assert.equal(result.missing.length, 0, `tiles the renderer placed but Foundry did not:\n${report(result)}`);
  assert.equal(result.extra.length, 0, `tiles Foundry has that the renderer does not:\n${report(result)}`);
  // Split by cause so a failure names itself: size is the mesh scale, flat vs tall separates a
  // grid-alignment error from an anchor error (a tall piece's anchor is far from its centre).
  assert.equal(result.sizeOffenders.length, 0, `sprite SIZE disagrees:\n${report(result)}`);
  assert.equal(result.flatOffenders.length, 0, `FLAT piece position disagrees:\n${report(result)}`);
  assert.equal(result.tallOffenders.length, 0, `TALL piece position disagrees:\n${report(result)}`);
  assert.equal(result.offenders.length, 0, `placement disagrees:\n${report(result)}`);
  return result;
}

const EDGE_TOLERANCE_PX = 0.5;

/** Is this world point inside the tile's footprint (document x/y = CENTRE in v14)? */
function insideFootprint(tile, point) {
  const halfW = tile.docWidth / 2 + EDGE_TOLERANCE_PX;
  const halfH = tile.docHeight / 2 + EDGE_TOLERANCE_PX;
  return (
    Math.abs(point.x - tile.docX) <= halfW && Math.abs(point.y - tile.docY) <= halfH
  );
}

/**
 * CP-4 — every wall segment lies on wall TILES.
 *
 * Deliberately NOT a restatement of the wall formula: that is the trap CP-1 fell into, where both
 * sides of a comparison shared a derivation and agreed on a wrong number. This checks the walls
 * against the tile placement CP-3 already proved, through the one thing they must share — the
 * ground they sit on. An identity import (no quarter turn) puts these samples on floor tiles or
 * off the layout entirely.
 */
export function assertWalls(loaded) {
  const { walls, manifestWalls, rects } = loaded;
  assert.equal(walls.length, manifestWalls, `expected ${manifestWalls} Foundry walls, got ${walls.length}`);

  const wallTiles = rects.filter((t) => t.boundHeight > 0);
  assert.ok(wallTiles.length > 0, "fixture has no wall tiles to check against");
  for (const [x1, y1, x2, y2] of walls) {
    // Walls in this DSL run along a grid axis, so a segment with BOTH coordinates changing is not
    // a wall — it is a box's diagonal. That is what reading the manifest's two corners as a
    // segment produces, and sampling alone cannot see it: a diagonal of a 12x1 run never leaves
    // the run's own wall cells.
    const axisAligned =
      Math.abs(x1 - x2) < EDGE_TOLERANCE_PX || Math.abs(y1 - y2) < EDGE_TOLERANCE_PX;
    assert.ok(axisAligned, `wall [${x1},${y1}]->[${x2},${y2}] runs along neither grid axis`);
    for (const t of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const point = { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
      const on = wallTiles.some((tile) => insideFootprint(tile, point));
      assert.ok(
        on,
        `wall [${x1},${y1}]->[${x2},${y2}] leaves its wall tiles at t=${t} (${point.x},${point.y})`,
      );
    }
  }
}

/** The runner's spec shape for one fixture. */
export function paritySpec(name) {
  return {
    name: `parity-${name}`,
    async run({ page }) {
      const loaded = await importFixture(page, name);
      assertParity(name, loaded);
      assertWalls(loaded);
    },
  };
}
