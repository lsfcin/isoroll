// Checkpoint board — capture the Foundry canvas for a fixture and write it next to the offline
// reference render, with the parity numbers. This is what Lucas looks at per PARITY-LADDER
// checkpoint: reference | actual | numbers, no hunting.
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BOARD_DIR = join(HERE, "output", "boards");

/** Hide UI + unpause + frame the tiles, then screenshot just the canvas area. */
export async function captureCanvas(page, outPath, scale = 0.6) {
  await page.evaluate(async (z) => {
    if (globalThis.game?.paused && globalThis.game.user?.isGM) {
      await globalThis.game.togglePause(false);
    }
    for (const id of ["pause", "interface", "ui-left", "ui-top", "ui-right", "ui-bottom", "notifications"]) {
      document.getElementById(id)?.style.setProperty("display", "none");
    }
    const tiles = canvas.tiles.placeables;
    const xs = tiles.map((t) => t.document.x);
    const ys = tiles.map((t) => t.document.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    await canvas.pan({ x: cx, y: cy, scale: z });
  }, scale);
  await page.waitForTimeout(1200);
  mkdirSync(dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  await page.evaluate(() => {
    for (const id of ["pause", "interface", "ui-left", "ui-top", "ui-right", "ui-bottom", "notifications"]) {
      document.getElementById(id)?.style.removeProperty("display");
    }
  });
}

/** Write <name>/reference.png, actual.png and parity.txt into the board dir. */
export function writeBoard(name, referencePng, parityText) {
  const dir = join(BOARD_DIR, name);
  mkdirSync(dir, { recursive: true });
  copyFileSync(referencePng, join(dir, "reference.png"));
  writeFileSync(join(dir, "parity.txt"), parityText, "utf8");
  return dir;
}
