// B32/B34 field fixture — the Calibration-scene wall junction with REAL art (wall.rembg.png),
// correct calibrations, fractional-free placement: oracle assertions + golden.
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices, dump, crossTileTies, zOrderViolations } from "./helpers.mjs";
import { stabilize, restoreUI, compareGolden } from "./golden.mjs";

const GS = 40;
const CAL = { x: 1.2910096920610017, y: -1.470790561879958 };
const MIRROR_CAL = { x: -CAL.y, y: -CAL.x };

function wall(cx, cy, w, h, flip) {
  return {
    "texture.src": "assets/wall.rembg.png",
    x: cx,
    y: cy,
    width: w,
    height: h,
    sort: 0,
    flags: {
      isoroll: {
        presetEnabled: false,
        tileFlipped: flip,
        imageOffset: flip ? MIRROR_CAL : CAL,
        imageScale: 1.106,
        imageYScale: 1.473,
        boundHeight: 3.25,
      },
    },
  };
}

export default {
  name: "b32-real-junction",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b32-real", gridSize: GS, width: 2000, height: 1600 });
    // L-corner: horizontal wall (flipped) meeting a vertical wall.
    await createTiles(page, [
      wall(320, 260, 5 * GS, GS, true), // E-W: cols 5.5-10.5ish, row 6
      wall(420, 300, GS, 5 * GS, false), // N-S: col 10, rows 5-10
    ]);
    await waitSlices(page, 10);

    const d = await dump(page);
    assert.equal(crossTileTies(d).length, 0, "cross-tile zIndex ties on real-art junction");
    assert.equal(zOrderViolations(d).length, 0, `depth violations: ${JSON.stringify(zOrderViolations(d)[0] ?? "")}`);

    await stabilize(page, { x: 400, y: 240, scale: 1.6 });
    const result = await compareGolden(page, "junction-real");
    await restoreUI(page);
    if (result.status === "new") {
      console.log(`  NEW GOLDEN saved: ${result.goldenPath} — approve by committing`);
      return;
    }
    assert.equal(result.status, "pass", `golden mismatch: ${result.reason} (diff: ${result.diffPath ?? "-"})`);
  },
};
