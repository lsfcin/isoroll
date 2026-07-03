// B2 regression (partial) — grid size change must rescale tile POSITION like tokens/walls.
// XPASS finding 2026-07-02: the direct scene.update path is correct; B2's documented repro
// goes through the GridConfig dialog (preview/submit path), not covered here. B2 stays OPEN
// until a GridConfig-driven variant reproduces it; this spec guards the direct path.
import assert from "node:assert/strict";
import { loadFixture, createTiles } from "./helpers.mjs";

const GS = 100;

export default {
  name: "b2-rescale",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b2-rescale", gridSize: GS });
    await createTiles(page, [
      { "texture.src": "icons/svg/tower.svg", x: 5 * GS + GS / 2, y: 5 * GS + GS / 2, width: GS, height: GS, sort: 0 },
    ]);
    await page.waitForTimeout(600);

    const before = await page.evaluate(() => {
      const tile = canvas.scene.tiles.contents[0];
      return { x: tile.x, y: tile.y };
    });

    const NEW_GS = 150;
    await page.evaluate(async (gs) => {
      await canvas.scene.update({ grid: { size: gs } });
    }, NEW_GS);
    await page.waitForTimeout(1500);

    const after = await page.evaluate(() => {
      const tile = canvas.scene.tiles.contents[0];
      return { x: tile.x, y: tile.y };
    });

    const ratio = NEW_GS / GS;
    const tol = 1;
    assert.ok(
      Math.abs(after.x - before.x * ratio) <= tol && Math.abs(after.y - before.y * ratio) <= tol,
      `tile center (${before.x},${before.y}) -> (${after.x},${after.y}); expected (${before.x * ratio},${before.y * ratio})`,
    );
  },
};
