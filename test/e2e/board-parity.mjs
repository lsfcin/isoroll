// Build a PARITY LADDER checkpoint board: offline reference | Foundry actual | the parity numbers.
//
// The working agreement (isoroll-content/ROADMAP.md § PARITY LADDER) is that Lucas sees a
// checkpoint only once its oracle is green, as one side-by-side he can glance at — never as a bug
// hunt. This is the script that makes that side-by-side, so a board is reproducible instead of
// hand-assembled once per checkpoint. The import itself comes from parity-fixture.mjs, the same
// code the specs run, so the board cannot show a scene the oracle never judged.
//
//   node test/e2e/board-parity.mjs l-room
//
// Needs a live Foundry, same as run.mjs.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { BOARD_DIR, captureCanvas } from "./board.mjs";
import { connect, deleteFixtureScenes } from "./helpers.mjs";
import { FIXTURES, importFixture } from "./parity-fixture.mjs";
import { compare, report } from "./parity.mjs";

/** Two PNGs side by side on white. */
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

/**
 * Camera zoom that draws a voxel at the size the offline reference draws it, so the two panes are
 * like-for-like and a size difference on the board is a real size difference. Derived, not tuned:
 * the reference spends `pxPerVoxel` px on a voxel, Foundry spends `pxPerGridUnit * zoom`.
 */
function matchingZoom(plan, metrics) {
  return plan.pxPerVoxel / metrics.pxPerGridUnit;
}

/**
 * Zoom that still fits the whole scene on screen. `rect` from dumpTileRects is already stage px
 * with zoom divided out, so the scene's on-screen extent at zoom z is just its bounds times z.
 * A board that crops is worse than a board at a different scale — the numbers judge the scale, the
 * picture judges the composition, and it cannot judge what it does not show.
 */
function fittingZoom(rects, viewport) {
  const boxes = rects.map((r) => r.rect).filter(Boolean);
  const width = Math.max(...boxes.map((b) => b.left + b.width)) - Math.min(...boxes.map((b) => b.left));
  const height = Math.max(...boxes.map((b) => b.top + b.height)) - Math.min(...boxes.map((b) => b.top));
  const fitX = viewport.width / width;
  const fitY = viewport.height / height;
  return 0.85 * Math.min(fitX, fitY);
}

async function build(name) {
  if (!FIXTURES[name]) {
    throw new Error(`unknown fixture ${name} — known: ${Object.keys(FIXTURES).join(", ")}`);
  }
  const { browser, page } = await connect();
  const loaded = await importFixture(page, name);
  const dir = join(BOARD_DIR, name);
  mkdirSync(dir, { recursive: true });

  const matched = matchingZoom(loaded.plan, loaded.metrics);
  const fits = fittingZoom(loaded.rects, page.viewportSize());
  await captureCanvas(page, join(dir, "actual.png"), Math.min(matched, fits));
  copyFileSync(loaded.referencePng, join(dir, "reference.png"));
  const result = compare(loaded.plan, loaded.rects, loaded.metrics.pxPerGridUnit);
  writeFileSync(join(dir, "parity.txt"), `${report(result)}\n`, "utf8");
  sideBySide(join(dir, "reference.png"), join(dir, "actual.png"), join(dir, "board.png"));

  await deleteFixtureScenes(page);
  await browser.close();
  console.log(`${dir}\n${report(result)}`);
}

await build(process.argv[2] ?? "one-cell");
