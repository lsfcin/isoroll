// Loop 5 user-test scenario for module-walls-import (see 5-user.md).
// Chains the real path: fresh scene → globalThis.isoroll.importSceneManifest with the actual
// l-room manifest fixture → asserts tile/wall/door counts, the flags round-trip (C1), and a
// movement-blocking observation for the imported walls. Not part of the committed suite
// (test/e2e/run.mjs) — ad hoc verification artifact for the loop-engineering flow, run once
// against the live Foundry server already used by verify:full.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connect, loadFixture, deleteFixtureScenes } from "../../test/e2e/helpers.mjs";

const MANIFEST = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../test/e2e/fixtures/l-room.manifest.json", import.meta.url)), "utf8"),
);

const { browser, page } = await connect();
try {
  await loadFixture(page, { name: "fx-loop5-walls-import", gridSize: 100 });

  const result = await page.evaluate(async (manifest) => {
    return globalThis.isoroll.importSceneManifest(manifest, {
      assetBase: "modules/isoroll/test/e2e/assets/kit",
    });
  }, MANIFEST);

  assert.equal(result.tileIds.length, MANIFEST.tiles.length, "tileIds count must equal manifest.tiles.length");
  assert.equal(result.wallIds.length, MANIFEST.walls.length, "wallIds count must equal manifest.walls.length");

  const state = await page.evaluate((ids) => {
    const tile0 = canvas.scene.tiles.get(ids.tileIds[0]);
    const wallDocs = ids.wallIds.map((id) => canvas.scene.walls.get(id));
    return {
      sceneTiles: canvas.scene.tiles.size,
      sceneWalls: canvas.scene.walls.size,
      tile0Flags: tile0?.flags?.isoroll,
      doorCount: wallDocs.filter((w) => w.door).length,
      wallSegments: wallDocs.map((w) => w.c),
    };
  }, result);

  assert.equal(state.sceneTiles, 34, `expected 34 tiles, got ${state.sceneTiles}`);
  assert.equal(state.sceneWalls, 6, `expected 6 walls, got ${state.sceneWalls}`);

  const manifestDoorCount = MANIFEST.walls.filter((w) => w.config.door !== 0).length;
  assert.equal(
    state.doorCount,
    manifestDoorCount,
    `door wall count mismatch: manifest ${manifestDoorCount}, created ${state.doorCount}`,
  );

  assert.equal(state.tile0Flags?.boundHeight, MANIFEST.tiles[0].boundHeight, "tile0 boundHeight flag mismatch");
  assert.equal(state.tile0Flags?.imageOffset?.x, MANIFEST.tiles[0].imageOffset[0], "tile0 imageOffset.x flag mismatch");
  assert.equal(state.tile0Flags?.imageOffset?.y, MANIFEST.tiles[0].imageOffset[1], "tile0 imageOffset.y flag mismatch");

  // Wall-blocking observation: helpers.mjs's "Oracles" section is explicitly JSON-only
  // ("no vision" — helpers.mjs:126), so the harness exposes no ready-made vision/collision
  // oracle. This calls Foundry's own public collision API directly (CONFIG.Canvas.polygonBackends
  // .move.testCollision, same class the module's canvas layer already uses) — a read-only
  // observation, not new production infrastructure.
  const collision = await page.evaluate((segments) => {
    const [x0, y0, x1, y1] = segments[0];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const crossesWall = CONFIG.Canvas.polygonBackends.move.testCollision(
      { x: mx - nx * 20, y: my - ny * 20 },
      { x: mx + nx * 20, y: my + ny * 20 },
      { type: "move", mode: "any" },
    );
    const xs = segments.flatMap(([a, b, c, d]) => [a, c]);
    const ys = segments.flatMap(([a, b, c, d]) => [b, d]);
    const farX = Math.min(...xs) - 1000;
    const farY = Math.min(...ys) - 1000;
    const openField = CONFIG.Canvas.polygonBackends.move.testCollision(
      { x: farX, y: farY },
      { x: farX + 40, y: farY },
      { type: "move", mode: "any" },
    );
    return { crossesWall, openField };
  }, state.wallSegments);

  assert.equal(collision.crossesWall, true, "movement ray crossing an imported wall must collide");
  assert.equal(collision.openField, false, "movement ray far from any imported wall must not collide");

  console.log(
    "Loop5 user-test PASS:",
    JSON.stringify(
      {
        tileIds: result.tileIds.length,
        wallIds: result.wallIds.length,
        sceneTiles: state.sceneTiles,
        sceneWalls: state.sceneWalls,
        doorCount: state.doorCount,
        tile0Flags: state.tile0Flags,
        collision,
      },
      null,
      2,
    ),
  );
} finally {
  await deleteFixtureScenes(page);
  await browser.close();
}
