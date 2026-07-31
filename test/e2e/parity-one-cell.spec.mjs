// CP-1 of the PARITY LADDER — the smallest fixture that can show a placement bug: one wall cell
// and one floor cell. A floor is flat (boundHeight 0), a wall is tall (boundHeight 2), which is the
// pair that separates "position is wrong" from "size is wrong".
//
// Assets: isoroll-content `iso-cli.py bake-scene --layout src/pipeline/layouts/one-cell.txt`.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadFixture } from "./helpers.mjs";
import { compare, loadPlan, report } from "./parity.mjs";

const ROOT = "modules/isoroll/test/e2e/assets/one-cell";
const GRID = 100;

export default {
  name: "parity-one-cell",
  async run({ page }) {
    const plan = loadPlan(
      fileURLToPath(new URL("./assets/one-cell/manifests/one-cell_sw_plan.json", import.meta.url)),
    );
    await loadFixture(page, { name: "fx-parity-one-cell", gridSize: GRID });

    const dump = await page.evaluate(async (root) => {
      const manifest = await (await fetch(`${root}/manifests/one-cell_sw_manifest.json`)).json();
      await globalThis.isoroll.importSceneManifest(manifest, { assetBase: `${root}/kit/dimetric` });
      // Textures load asynchronously; the mesh quad is meaningless until they are in.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { rects: globalThis.isoroll.dumpTileRects(), metrics: globalThis.isoroll.dumpStageMetrics() };
    }, ROOT);
    const { rects, metrics } = dump;

    assert.equal(rects.length, plan.tiles.length, `expected ${plan.tiles.length} tiles, got ${rects.length}`);
    assert.equal(metrics.gridSize, GRID, `fixture grid changed: ${metrics.gridSize}`);

    const result = compare(plan, rects, metrics.pxPerGridUnit);
    assert.equal(result.missingMesh.length, 0, `tiles with no rendered mesh:\n${report(result)}`);
    assert.equal(result.missing.length, 0, `tiles the renderer placed but Foundry did not:\n${report(result)}`);
    assert.equal(result.extra.length, 0, `tiles Foundry has that the renderer does not:\n${report(result)}`);

    // Sizes come from the sprite's own density (flags.isoroll.sprite.pxPerVoxel) through the
    // projection, so a mismatch here means the mesh scale no longer tracks the bake.
    assert.equal(result.sizeOffenders.length, 0, `sprite SIZE disagrees:\n${report(result)}`);
    assert.equal(result.flatOffenders.length, 0, `FLAT piece position disagrees:\n${report(result)}`);

    // CP-2: a TALL piece lands where the offline renderer put it too. It used to miss by
    // (dx 10.3, dy 148.7) because the module anchored the texture's CENTRE on the volume box's
    // centre while the bake anchors the piece's own world (0,0,0) — `originPx` — on the cell's
    // top corner. The taller the sprite, the further apart those two are.
    assert.equal(result.tallOffenders.length, 0, `TALL piece position disagrees:\n${report(result)}`);
    assert.equal(result.offenders.length, 0, `placement disagrees:\n${report(result)}`);
  },
};
