// T3 golden — junction fixture renders pixel-identical to the approved golden.
import assert from "node:assert/strict";
import { loadFixture, createTiles, waitSlices } from "./helpers.mjs";
import { stabilize, restoreUI, compareGolden } from "./golden.mjs";

const GS = 100;
const TEX = "icons/svg/tower.svg";

function wall(c, r, wCells, hCells) {
  const w = wCells * GS;
  const h = hCells * GS;
  return { "texture.src": TEX, x: c * GS + w / 2, y: r * GS + h / 2, width: w, height: h, sort: 0 };
}

export default {
  name: "golden-junction",
  async run({ page }) {
    await loadFixture(page, { name: "fx-golden-junction" });
    await createTiles(page, [wall(10, 10, 4, 1), wall(14, 7, 1, 4), wall(12, 11, 1, 4)]);
    await waitSlices(page, 12);
    await stabilize(page, { x: 1300, y: 1050, scale: 0.55 });
    const result = await compareGolden(page, "junction");
    await restoreUI(page);
    if (result.status === "new") {
      console.log(`  NEW GOLDEN saved: ${result.goldenPath} — approve by committing`);
      return;
    }
    assert.equal(result.status, "pass", `golden mismatch: ${result.reason} (diff: ${result.diffPath ?? "-"})`);
  },
};
