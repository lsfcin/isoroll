// Build a PARITY LADDER checkpoint board: offline reference | Foundry actual | the parity numbers.
//
// The working agreement (isoroll-content/ROADMAP.md § PARITY LADDER) is that Lucas sees a
// checkpoint only once its oracle is green, as one side-by-side he can glance at — never as a bug
// hunt. This is the script that makes that side-by-side, so a board is reproducible instead of
// hand-assembled once per checkpoint.
//
//   node test/e2e/board-parity.mjs cp2-one-cell
//
// Needs a live Foundry (same as run.mjs). The spec that proves the checkpoint stays in run.mjs;
// this only draws the picture.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { BOARD_DIR, captureCanvas } from "./board.mjs";
import { connect, deleteFixtureScenes, loadFixture } from "./helpers.mjs";
import { compare, loadPlan, report } from "./parity.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GRID = 100;

const CHECKPOINTS = {
  "cp2-one-cell": {
    fixture: "fx-parity-one-cell",
    root: "modules/isoroll/test/e2e/assets/one-cell",
    plan: "assets/one-cell/manifests/one-cell_sw_plan.json",
    manifest: "one-cell_sw_manifest.json",
    reference: "assets/one-cell/preview/one-cell_SW.png",
  },
};

/**
 * Camera zoom that draws a voxel at the same size the offline reference does, so the two panes are
 * like-for-like and a size difference on the board is a real size difference. Derived, not tuned:
 * the reference spends `pxPerVoxel` px on a voxel, Foundry spends `pxPerGridUnit * zoom`.
 */
function matchingZoom(plan, metrics) {
  return plan.pxPerVoxel / metrics.pxPerGridUnit;
}

/** Two PNGs side by side on white, each scaled to fit a common height. */
function sideBySide(leftPath, rightPath, outPath) {
  const left = PNG.sync.read(readFileSync(leftPath));
  const right = PNG.sync.read(readFileSync(rightPath));
  const height = Math.max(left.height, right.height);
  const out = new PNG({ width: left.width + right.width, height });
  out.data.fill(0xff);
  PNG.bitblt(left, out, 0, 0, left.width, left.height, 0, 0);
  PNG.bitblt(right, out, 0, 0, right.width, right.height, left.width, 0);
  writeFileSync(outPath, PNG.sync.write(out));
}

async function build(name) {
  const cp = CHECKPOINTS[name];
  if (!cp) {
    throw new Error(`unknown checkpoint ${name} — known: ${Object.keys(CHECKPOINTS).join(", ")}`);
  }
  const plan = loadPlan(join(HERE, cp.plan));
  const { browser, page } = await connect();
  await loadFixture(page, { name: cp.fixture, gridSize: GRID });
  const dump = await page.evaluate(
    async ({ root, manifest }) => {
      const parsed = await (await fetch(`${root}/manifests/${manifest}`)).json();
      await globalThis.isoroll.importSceneManifest(parsed, { assetBase: `${root}/kit/dimetric` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        rects: globalThis.isoroll.dumpTileRects(),
        metrics: globalThis.isoroll.dumpStageMetrics(),
      };
    },
    { root: cp.root, manifest: cp.manifest },
  );

  const dir = join(BOARD_DIR, name);
  mkdirSync(dir, { recursive: true });
  const zoom = matchingZoom(plan, dump.metrics);
  await captureCanvas(page, join(dir, "actual.png"), zoom);
  copyFileSync(join(HERE, cp.reference), join(dir, "reference.png"));
  const result = compare(plan, dump.rects, dump.metrics.pxPerGridUnit);
  writeFileSync(join(dir, "parity.txt"), `${report(result)}\n`, "utf8");
  sideBySide(join(dir, "reference.png"), join(dir, "actual.png"), join(dir, "board.png"));

  await deleteFixtureScenes(page);
  await browser.close();
  console.log(`${dir}\n${report(result)}`);
}

await build(process.argv[2] ?? "cp2-one-cell");
