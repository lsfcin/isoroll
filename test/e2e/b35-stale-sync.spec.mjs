// B35 regression — stale slice sync: (H1) moved tiles must adopt fresh depth cells without
// a manual rebuild; (H2) creating/deleting a tile must refresh every peer's band (no ties).
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices, dump, crossTileTies, zOrderViolations } from "./helpers.mjs";

const GS = 100;
const TEX = "icons/svg/tower.svg";

function wall(c, r, wCells, hCells) {
  const w = wCells * GS;
  const h = hCells * GS;
  return { "texture.src": TEX, x: c * GS + w / 2, y: r * GS + h / 2, width: w, height: h, sort: 0 };
}

export default {
  name: "b35-stale-sync",
  async run({ page }) {
    await loadFixture(page, { name: "fx-b35-stale" });
    const [hId] = await createTiles(page, [
      wall(10, 10, 4, 1), // horizontal wall
      wall(15, 7, 1, 4), // vertical wall, apart
    ]);
    await waitSlices(page, 8);

    // H1: move the horizontal wall so it forms a junction with the vertical one — the
    // moved tile's depth cells must be its NEW cells, and the junction must be clean.
    await page.evaluate(
      async ({ id, gs }) => {
        const tile = canvas.scene.tiles.get(id);
        await tile.update({ x: 11 * gs + (4 * gs) / 2, y: 7 * gs + gs / 2 });
      },
      { id: hId, gs: GS },
    );
    await page.waitForTimeout(600);
    const d1 = await dump(page);
    const hRows = new Set(d1.filter((s) => s.tileId === hId).map((s) => s.row));
    assert.ok(hRows.has(7), `moved wall still reports old rows: ${[...hRows]} (stale faces)`);
    assert.equal(crossTileTies(d1).length, 0, "ties after move into junction");
    assert.equal(zOrderViolations(d1).length, 0, `violations after move: ${JSON.stringify(zOrderViolations(d1)[0] ?? "")}`);

    // H2: adding a third tile shifts peer ranks — all bands must refresh, still no ties.
    await createTiles(page, [wall(11, 8, 1, 3)]);
    await page.waitForTimeout(800);
    const d2 = await dump(page);
    assert.equal(crossTileTies(d2).length, 0, "ties after peer-set change (stale bands)");
    assert.equal(zOrderViolations(d2).length, 0, "violations after peer-set change");
  },
};
