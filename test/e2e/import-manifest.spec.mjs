// C4 e2e — import the real l-room manifest into a live Foundry scene via the public
// isoroll.importSceneManifest API; assert count round-trip (C2). Fixture copied from
// isoroll-content/output/manifests/l-room.manifest.json (source of truth lives there).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadFixture } from "./helpers.mjs";

const MANIFEST = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/l-room.manifest.json", import.meta.url)), "utf8"),
);

export default {
  name: "import-manifest",
  async run({ page }) {
    await loadFixture(page, { name: "fx-import-manifest", gridSize: 100 });

    const result = await page.evaluate(async (manifest) => {
      return globalThis.isoroll.importSceneManifest(manifest, {
        assetBase: "modules/isoroll/test/e2e/assets/kit",
      });
    }, MANIFEST);

    assert.ok(result && Array.isArray(result.tileIds) && Array.isArray(result.wallIds), "importSceneManifest must return {tileIds,wallIds}");
    assert.equal(result.tileIds.length, MANIFEST.tiles.length, "tileIds count must equal manifest.tiles.length");
    assert.equal(result.wallIds.length, MANIFEST.walls.length, "wallIds count must equal manifest.walls.length");

    const counts = await page.evaluate(() => ({
      tiles: canvas.scene.tiles.size,
      walls: canvas.scene.walls.size,
    }));
    assert.equal(counts.tiles, 34, `expected 34 tiles, got ${counts.tiles}`);
    assert.equal(counts.walls, 6, `expected 6 walls, got ${counts.walls}`);
  },
};
