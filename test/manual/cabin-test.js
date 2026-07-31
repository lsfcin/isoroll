// Manual test setup — builds the cabin test scene from scratch in a live world.
// Paste the WHOLE file into the Foundry F12 console as GM. Re-run any time; it replaces the scene.
// Assets are committed under test/e2e/assets/cabin (baked by isoroll-content's `iso-cli.py
// bake-scene`), so nothing has to be generated first.

const VIEW = "sw"; // n ne e se s sw w nw top — change and re-run to see another view

const FAMILY = { n: "cardinal", e: "cardinal", s: "cardinal", w: "cardinal", top: "top" }[VIEW] ?? "dimetric";
const ROOT = "modules/isoroll/test/e2e/assets/cabin";

// 1. Fresh scene with the isometric transform enabled. gridSize 100 matches the bake.
for (const old of game.scenes.filter((s) => s.name === "cabin-test")) await old.delete();
const scene = await Scene.create({
  name: "cabin-test",
  width: 4000,
  height: 3000,
  padding: 0,
  backgroundColor: "#3a3a3a",
  grid: { type: 1, size: 100 },
  flags: { isoroll: { enabled: true } },
});
await scene.activate();
await new Promise((r) => setTimeout(r, 1500));

// 2. Import the baked cabin: tiles + real Foundry walls (vision/fog work off these).
const manifest = await (await fetch(`${ROOT}/manifests/cabin_${VIEW}_manifest.json`)).json();
const result = await isoroll.importSceneManifest(manifest, { assetBase: `${ROOT}/kit/${FAMILY}` });

// 3. A token to walk, parked OUTSIDE the south door so it is visible before you move it.
const actor =
  game.actors.find((a) => a.name === "Cabin Tester") ??
  (await Actor.create({ name: "Cabin Tester", type: "npc" })); // dnd5e; use any type your system has
await scene.createEmbeddedDocuments("Token", [
  {
    name: "Cabin Tester",
    actorId: actor.id,
    x: 350,
    y: 800,
    width: 1,
    height: 1,
    disposition: 1,
    sight: { enabled: true, range: 30 },
    flags: { isoroll: { boundHeight: 2 } },
  },
]);

// 4. Frame the building.
const xs = canvas.tiles.placeables.map((t) => t.document.x);
const ys = canvas.tiles.placeables.map((t) => t.document.y);
await canvas.pan({
  x: (Math.min(...xs) + Math.max(...xs)) / 2,
  y: (Math.min(...ys) + Math.max(...ys)) / 2,
  scale: 0.5,
});

console.log(`cabin ${VIEW}: ${result.tileIds.length} tiles, ${result.wallIds.length} walls`);
