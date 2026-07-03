// B32 regression — tile-slice z-ordering at L/T junctions: no cross-tile ties, no depth violations, stable across move-and-return.
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices, dump, crossTileTies, zOrderViolations, normalize } from "./helpers.mjs";

const GS = 100;
const TEX = "icons/svg/tower.svg";

// v14 tile doc x/y = CENTER. Cell (c, r) top-left is (c*GS, r*GS).
function wall(c, r, wCells, hCells) {
  const w = wCells * GS;
  const h = hCells * GS;
  return { "texture.src": TEX, x: c * GS + w / 2, y: r * GS + h / 2, width: w, height: h, sort: 0 };
}

export default {
  name: "b32-junction",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b32-junction" });
    // L junction: horizontal 4x1 wall + vertical 1x4 wall meeting at its east end,
    // T junction: vertical 1x4 wall abutting the horizontal wall from the south.
    await createTiles(page, [
      wall(10, 10, 4, 1), // A: cols 10-13, row 10
      wall(14, 7, 1, 4), // B: col 14, rows 7-10 (L with A's east end)
      wall(12, 11, 1, 4), // C: col 12, rows 11-14 (T against A from below)
    ]);
    await waitSlices(page, 12); // 3 walls x (4+1-1) slices

    const d1 = await dump(page);
    assert.equal(crossTileTies(d1).length, 0, `cross-tile zIndex ties: ${JSON.stringify(crossTileTies(d1)[0] ?? "")}`);
    assert.equal(zOrderViolations(d1).length, 0, `depth/zIndex violations: ${JSON.stringify(zOrderViolations(d1)[0] ?? "")}`);

    // Move wall A two cells east — assert AT THE MOVED POSITION (B35: a stale sync kept
    // the old cells here and this spec masked it by only checking after moving back).
    const before = normalize(d1);
    const movedId = await page.evaluate(async (dx) => {
      const tile = canvas.scene.tiles.contents[0];
      await tile.update({ x: tile.x + dx });
      return tile.id;
    }, 2 * GS);
    await page.waitForTimeout(600);
    const dMoved = await dump(page);
    assert.equal(crossTileTies(dMoved).length, 0, "ties at moved position");
    assert.equal(zOrderViolations(dMoved).length, 0, "violations at moved position");
    const beforeCells = before.filter((s) => s.tileId === movedId);
    const movedCells = normalize(dMoved).filter((s) => s.tileId === movedId);
    for (let i = 0; i < movedCells.length; i++) {
      assert.equal(movedCells[i].col, beforeCells[i].col + 2, `slice[${i}] cell col not updated after move (stale faces, B35)`);
    }

    await page.evaluate(async (dx) => {
      const tile = canvas.scene.tiles.contents[0];
      await tile.update({ x: tile.x - dx });
    }, 2 * GS);
    await page.waitForTimeout(600);

    const d2 = await dump(page);
    assert.equal(crossTileTies(d2).length, 0, "ties after move-and-return");
    assert.equal(zOrderViolations(d2).length, 0, "violations after move-and-return");
    assert.deepEqual(normalize(d2), before, "dump changed after move-and-return");
  },
};
