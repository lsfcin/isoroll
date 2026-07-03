// B34 regression — toggling tileFlipped must keep the art's ground line (offset auto-mirrored
// on the form path); mirror is involutive so flip+unflip restores the original offset.
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices, dump } from "./helpers.mjs";

const GS = 100;
const CAL = { x: 1.2910096920610017, y: -1.470790561879958 };

function artStats(d, id) {
  const ss = d.filter((s) => s.tileId === id);
  const minX = Math.min(...ss.map((s) => s.bounds.x));
  const maxX = Math.max(...ss.map((s) => s.bounds.x + s.bounds.w));
  const maxY = Math.max(...ss.map((s) => s.bounds.y + s.bounds.h));
  return { cx: (minX + maxX) / 2, bottom: maxY, n: ss.length };
}

export default {
  name: "b34-flip-offset",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b34-flip", gridSize: GS });
    const [id] = await createTiles(page, [
      {
        "texture.src": "assets/wall.rembg.png",
        x: 10 * GS,
        y: 10 * GS + 2.5 * GS,
        width: GS,
        height: 5 * GS,
        sort: 0,
        flags: { isoroll: { presetEnabled: false, tileFlipped: false, imageOffset: CAL, imageScale: 1.106, imageYScale: 1.473, boundHeight: 3.25 } },
      },
    ]);
    await waitSlices(page, 5);
    const before = artStats(await dump(page), id);

    // Form-path flip: tileFlipped toggled WITHOUT touching imageOffset.
    await page.evaluate(async (tid) => {
      await canvas.scene.tiles.get(tid).update({ "flags.isoroll.tileFlipped": true });
      globalThis.isoroll.debugSlices(true);
      globalThis.isoroll.debugSlices(false);
    }, id);
    await page.waitForTimeout(600);
    const after = artStats(await dump(page), id);

    // Ground line must not move; horizontal center may shift slightly (asymmetric margins).
    assert.ok(Math.abs(after.bottom - before.bottom) < 3, `ground line moved ${Math.abs(after.bottom - before.bottom).toFixed(1)}px on flip`);
    assert.ok(Math.abs(after.cx - before.cx) < GS, `art center jumped ${Math.abs(after.cx - before.cx).toFixed(1)}px on flip`);

    // Involution: flip back restores the original offset.
    await page.evaluate(async (tid) => {
      await canvas.scene.tiles.get(tid).update({ "flags.isoroll.tileFlipped": false });
    }, id);
    await page.waitForTimeout(400);
    const off = await page.evaluate((tid) => canvas.scene.tiles.get(tid).getFlag("isoroll", "imageOffset"), id);
    assert.ok(Math.abs(off.x - CAL.x) < 1e-9 && Math.abs(off.y - CAL.y) < 1e-9, `offset not restored after flip+unflip: ${JSON.stringify(off)}`);
  },
};
