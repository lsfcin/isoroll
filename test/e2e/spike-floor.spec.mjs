// THROWAWAY spike e2e — measures floor-as-iso-tiles (proto a) vs background-regen (proto b) per
// .loop/floor-fog-spike/3-arch.md. Self-contained by design: NOT imported by run.mjs, NOT part of
// verify:full. Run directly: `node test/e2e/spike-floor.spec.mjs` against a live Foundry.
// Whole spike (this file + src/spike-floor/ + the module.ts wire) is reverted at Loop 6.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, loadFixture, createTiles, waitSlices } from "./helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GS = 100;
const GRID_TEXT = readFileSync(join(__dirname, "../unit/assets/l-room.txt"), "utf-8");

async function run({ page }) {
  await loadFixture(page, { name: "fx-spike-floor" });
  // loadFixture hardcodes tokenVision:false/fog:false — this spike needs both on, set directly
  // (helpers.mjs is shared by every regression spec and stays out of this throwaway's file scope).
  await page.evaluate(async () => {
    await canvas.scene.update({ tokenVision: true, fog: { exploration: true } });
  });

  // (a) floor-as-iso-tiles
  const specs = await page.evaluate(
    ({ text, view, gs }) => globalThis.isoroll.spike.floorSpecsFor(text, view, gs),
    { text: GRID_TEXT, view: "SW", gs: GS },
  );
  await createTiles(page, specs);
  await waitSlices(page, specs.length);

  // Viewer token inside the long floor run (rows v=1..3) — region A.
  const tokenId = await page.evaluate(async ({ gs }) => {
    const [doc] = await canvas.scene.createEmbeddedDocuments("Token", [
      { name: "spike-viewer", x: 2 * gs, y: 2 * gs, sight: { enabled: true, range: 3 } },
    ]);
    canvas.tokens.get(doc.id)?.control({ releaseOthers: true });
    return doc.id;
  }, { gs: GS });
  await page.waitForTimeout(300);
  await page.evaluate(() => globalThis.isoroll.spike.syncFog());
  await page.waitForTimeout(300);

  const rowsA = await page.evaluate(() => globalThis.isoroll.spike.dumpFogSlices());
  const covA = await page.evaluate((r) => globalThis.isoroll.spike.fogCoverage(r), rowsA);
  assert.ok(covA.visible > 0, "region A: expected some visible slices while token is present");
  assert.ok(covA.unseen > 0, "region A: expected some unseen slices out of the 3-cell sight range");

  // Move the token to the short leg (rows v=4..6) — region A now EXPLORED, not visible (tint darkened).
  await page.evaluate(async ({ id, gs }) => {
    await canvas.tokens.get(id).document.update({ x: 1 * gs, y: 5 * gs });
  }, { id: tokenId, gs: GS });
  await page.waitForTimeout(300);
  await page.evaluate(() => globalThis.isoroll.spike.syncFog());
  await page.waitForTimeout(300);
  const rowsB = await page.evaluate(() => globalThis.isoroll.spike.dumpFogSlices());
  const covB = await page.evaluate((r) => globalThis.isoroll.spike.fogCoverage(r), rowsB);
  assert.ok(covB.explored > 0, "after move: expected region A slices now explored (darkened)");

  // (b) background regen — latency + fog-participation proxy (expected gap: bg has 0 fog rows).
  const bgSpec = await page.evaluate((v) => globalThis.isoroll.spike.backgroundSpecFor(v), "SW");
  const t0 = Date.now();
  await page.evaluate((spec) => canvas.scene.update(spec), bgSpec);
  await page.waitForTimeout(300);
  const bgSwapLatencyMs = Date.now() - t0;
  const rowsAfterBg = await page.evaluate(() => globalThis.isoroll.spike.dumpFogSlices());
  const fogParticipation = rowsAfterBg.length - rowsB.length; // extra rows the bg contributed, if any

  const table = await page.evaluate(
    ({ a, b }) => globalThis.isoroll.spike.buildComparisonTable(a, b),
    {
      a: { tileCount: specs.length, sliceCount: rowsA.length, fog: covB, darkenedFraction: covB.darkenedFraction, shot: "n/a" },
      b: { bgSwapLatencyMs, fogParticipation, note: "background does not participate in the fog-tile stack" },
    },
  );

  const outDir = join(__dirname, "output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "spike-floor.json"), JSON.stringify(table, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { browser, page } = await connect();
  try {
    await run({ page });
    console.log("PASS spike-floor (throwaway)");
  } finally {
    await browser.close();
  }
}

export default { name: "spike-floor", run };
