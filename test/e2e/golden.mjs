// Golden screenshot compare — deterministic canvas capture + pixelmatch diff (VERIFY.md I3).
// Missing golden: candidate saved as the golden ("NEW GOLDEN" — approve by committing it).
// Mismatch: actual + diff PNGs land in test/e2e/output/ (gitignored, agent-readable).
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(HERE, "goldens");
const OUTPUT_DIR = join(HERE, "output");

// Allow tiny AA jitter: per-pixel threshold + global diff-ratio budget.
const PIXEL_THRESHOLD = 0.12;
const MAX_DIFF_RATIO = 0.005;

// Fix camera + hide DOM UI so the capture depends only on canvas content.
export async function stabilize(page, view) {
  await page.evaluate(async (v) => {
    document.getElementById("interface")?.style.setProperty("display", "none");
    document.getElementById("ui-left")?.style.setProperty("display", "none");
    document.getElementById("ui-top")?.style.setProperty("display", "none");
    document.getElementById("ui-right")?.style.setProperty("display", "none");
    document.getElementById("ui-bottom")?.style.setProperty("display", "none");
    canvas.stage.eventMode = "none";
    await canvas.pan({ x: v.x, y: v.y, scale: v.scale });
  }, view);
  await page.waitForTimeout(800); // let PIXI settle a few frames
}

export async function restoreUI(page) {
  await page.evaluate(() => {
    for (const id of ["interface", "ui-left", "ui-top", "ui-right", "ui-bottom"]) {
      document.getElementById(id)?.style.removeProperty("display");
    }
    canvas.stage.eventMode = "static";
  });
}

export async function compareGolden(page, name) {
  mkdirSync(GOLDEN_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const actualPath = join(OUTPUT_DIR, `${name}.actual.png`);
  // Full-page clip, not element screenshot: Playwright's element stability wait
  // never settles on a continuously-rendering PIXI canvas.
  const viewport = page.viewportSize();
  await page.screenshot({ path: actualPath, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } });

  const goldenPath = join(GOLDEN_DIR, `${name}.png`);
  if (!existsSync(goldenPath)) {
    copyFileSync(actualPath, goldenPath);
    return { status: "new", goldenPath };
  }

  const golden = PNG.sync.read(readFileSync(goldenPath));
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (golden.width !== actual.width || golden.height !== actual.height) {
    return { status: "fail", reason: `size ${actual.width}x${actual.height} != golden ${golden.width}x${golden.height}` };
  }
  const diff = new PNG({ width: golden.width, height: golden.height });
  const diffPixels = pixelmatch(golden.data, actual.data, diff.data, golden.width, golden.height, {
    threshold: PIXEL_THRESHOLD,
  });
  const ratio = diffPixels / (golden.width * golden.height);
  if (ratio > MAX_DIFF_RATIO) {
    const diffPath = join(OUTPUT_DIR, `${name}.diff.png`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    return { status: "fail", reason: `${diffPixels} px differ (${(ratio * 100).toFixed(2)}%)`, diffPath, actualPath };
  }
  return { status: "pass", diffPixels };
}
