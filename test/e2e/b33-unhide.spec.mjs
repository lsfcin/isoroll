// B33 regression — un-hiding a tile must restore slice visibility (known OPEN: xfail).
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices, dump } from "./helpers.mjs";

const GS = 100;

export default {
  name: "b33-unhide",
  xfail: "B33",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b33-unhide" });
    await createTiles(page, [
      { "texture.src": "icons/svg/tower.svg", x: 10 * GS + GS, y: 10 * GS + GS, width: 2 * GS, height: 2 * GS, sort: 0 },
    ]);
    await waitSlices(page, 3); // 2+2-1 slices

    await page.evaluate(async () => {
      const tile = canvas.scene.tiles.contents[0];
      await tile.update({ hidden: true });
    });
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      const tile = canvas.scene.tiles.contents[0];
      await tile.update({ hidden: false });
    });
    await page.waitForTimeout(600);

    const d = await dump(page);
    const invisible = d.filter((s) => !s.visible);
    assert.equal(invisible.length, 0, `${invisible.length}/${d.length} slices still invisible after unhide`);
  },
};
