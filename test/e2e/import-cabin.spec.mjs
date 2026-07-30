// e2e — import the CABIN manifest (isoroll-content's PLAYABLE fixture) into a live Foundry scene
// for every one of the 8+1 views, and assert the seam actually round-trips: counts match the
// manifest, every wall the layout describes exists as a Foundry wall, and the wall total is a
// property of the SCENE, not of the view.
//
// Assets are baked by:  iso-cli.py bake-scene --layout src/pipeline/layouts/cabin.txt \
//                         --out <this repo>/test/e2e/assets/cabin
// Sprite sets are per projection family (4 dimetric views share one set, 4 cardinal another), so
// assetBase points at the family directory the manifest was baked against.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadFixture } from "./helpers.mjs";

const VIEWS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "TOP"];
const FAMILY = { N: "cardinal", E: "cardinal", S: "cardinal", W: "cardinal", TOP: "top" };
const ASSET_ROOT = "modules/isoroll/test/e2e/assets/cabin/kit";

function manifestFor(view) {
  const url = new URL(`./assets/cabin/manifests/cabin_${view.toLowerCase()}_manifest.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

function familyOf(view) {
  return FAMILY[view] ?? "dimetric";
}

export default {
  name: "import-cabin",
  async run({ page }) {
    const wallTotals = new Set();

    for (const view of VIEWS) {
      const manifest = manifestFor(view);
      await loadFixture(page, { name: `fx-cabin-${view}`, gridSize: 100 });

      const result = await page.evaluate(
        async ({ m, base }) => globalThis.isoroll.importSceneManifest(m, { assetBase: base }),
        { m: manifest, base: `${ASSET_ROOT}/${familyOf(view)}` },
      );

      assert.ok(result?.tileIds && result?.wallIds, `${view}: importSceneManifest returned nothing`);
      assert.equal(result.tileIds.length, manifest.tiles.length, `${view}: tile count`);
      assert.equal(result.wallIds.length, manifest.walls.length, `${view}: wall count`);

      const counts = await page.evaluate(() => ({
        tiles: canvas.scene.tiles.size,
        walls: canvas.scene.walls.size,
      }));
      assert.equal(counts.tiles, manifest.tiles.length, `${view}: tiles in scene`);
      assert.equal(counts.walls, manifest.walls.length, `${view}: walls in scene`);

      // The wall RUNS differ per rotation (the merge is axis-ordered: 9 runs from one side, 11
      // from another), but the number of wall CELLS they cover cannot — it is the same cabin seen
      // from another side. Two things have to be undone before comparing: anchors are normalized
      // PER AXIS (ax over cols, ay over rows) and a rotation swaps cols/rows, so de-normalize
      // through the manifest's own chunk dims; and a run's cell count is its AREA, not its
      // perimeter — summing the two spans instead of multiplying them just counts runs.
      const { cols, rows } = manifest.chunk;
      const cells = manifest.walls.map(
        (w) => Math.abs(w.bx - w.ax) * cols * Math.abs(w.by - w.ay) * rows,
      );
      const total = cells.reduce((a, b) => a + b, 0);
      wallTotals.add(Math.round(total * 1e6) / 1e6);
    }

    assert.equal(
      wallTotals.size,
      1,
      `wall cells must not depend on the view, got ${[...wallTotals].join(", ")}`,
    );
    // Tied to the layout itself, not just to itself: cabin.txt has 51 wall voxels on the ground
    // level (isoroll-content test_cabin_golden.py asserts the same number from the Python side).
    assert.equal([...wallTotals][0], 51, "wall cells must round-trip from the layout");
  },
};
