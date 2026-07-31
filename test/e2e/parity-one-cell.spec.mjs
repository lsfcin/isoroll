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

    const rects = await page.evaluate(async (root) => {
      const manifest = await (await fetch(`${root}/manifests/one-cell_sw_manifest.json`)).json();
      await globalThis.isoroll.importSceneManifest(manifest, { assetBase: `${root}/kit/dimetric` });
      // Textures load asynchronously; the mesh quad is meaningless until they are in.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return globalThis.isoroll.dumpTileRects();
    }, ROOT);

    assert.equal(rects.length, plan.tiles.length, `expected ${plan.tiles.length} tiles, got ${rects.length}`);

    const result = compare(plan, rects, GRID);
    assert.equal(result.missingMesh.length, 0, `tiles with no rendered mesh:\n${report(result)}`);
    assert.equal(result.missing.length, 0, `tiles the renderer placed but Foundry did not:\n${report(result)}`);
    assert.equal(result.extra.length, 0, `tiles Foundry has that the renderer does not:\n${report(result)}`);

    // What CP-1 establishes: the harness works, sizes are right, and flat pieces sit where the
    // offline renderer says. Sizes come from the manifest's sizePx at the sprite's own density, so
    // a mismatch here means the tile rect no longer tracks the bake.
    assert.equal(result.sizeOffenders.length, 0, `sprite SIZE disagrees:\n${report(result)}`);
    assert.equal(result.flatOffenders.length, 0, `FLAT piece position disagrees:\n${report(result)}`);

    // KNOWN GAP, owned by CP-2 — not a passing condition, a pinned defect.
    // A tall piece is anchored by its texture CENTRE at the cell centre, while the offline renderer
    // anchors by the piece's own world (0,0,0) origin (originPx in the manifest). The taller the
    // sprite, the further apart those are, so the wall lands ~149px low. Pinned exactly so it
    // cannot drift while CP-2 is pending; CP-2 deletes this block and asserts 0 instead.
    const KNOWN_TALL_GAP = { dx: 10.31, dy: 148.67 };
    for (const o of result.tallOffenders) {
      assert.ok(
        Math.abs(o.dx - KNOWN_TALL_GAP.dx) < 2 && Math.abs(o.dy - KNOWN_TALL_GAP.dy) < 2,
        `tall-piece offset CHANGED from the pinned CP-2 gap (dx ${KNOWN_TALL_GAP.dx} dy ${KNOWN_TALL_GAP.dy}):\n${report(result)}`,
      );
    }
  },
};
