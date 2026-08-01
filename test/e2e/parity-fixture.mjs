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

/** The runner's spec shape for one fixture. */
export function paritySpec(name) {
  return {
    name: `parity-${name}`,
    async run({ page }) {
      const loaded = await importFixture(page, name);
      assertParity(name, loaded);
    },
  };
}
