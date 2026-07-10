// e2e runner — executes regression specs against a live Foundry server; exit 1 on unexpected failure.
// XFAIL semantics: specs marked xfail (open KNOWN-BUGS) are expected to fail; a pass is
// reported as XPASS = the bug looks fixed — remove xfail and update KNOWN-BUGS (gate applies).
import { connect, deleteFixtureScenes, BASE_URL } from "./helpers.mjs";
import b32 from "./b32-junction.spec.mjs";
import b33 from "./b33-unhide.spec.mjs";
import b2 from "./b2-rescale.spec.mjs";
import b34 from "./b34-flip-offset.spec.mjs";
import b32real from "./b32-real-junction.spec.mjs";
import b35 from "./b35-stale-sync.spec.mjs";
import goldenJunction from "./golden-junction.spec.mjs";
import importManifest from "./import-manifest.spec.mjs";

const specs = [b32, b33, b2, b34, b35, b32real, goldenJunction, importManifest];

let browser;
let page;
try {
  ({ browser, page } = await connect());
} catch (e) {
  console.error(`Cannot reach Foundry at ${BASE_URL} — start it first:`);
  console.error("  node ~/FoundryVTT/resources/app/main.js --dataPath=$HOME/foundrydata-v14 &");
  console.error(String(e.message ?? e));
  process.exit(2);
}

let failed = 0;
let xpassed = 0;
for (const spec of specs) {
  const t0 = Date.now();
  try {
    await spec.run({ page });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (spec.xfail) {
      xpassed++;
      console.log(`XPASS ${spec.name} (${secs}s) — ${spec.xfail} looks FIXED: remove xfail, update KNOWN-BUGS`);
    } else {
      console.log(`PASS  ${spec.name} (${secs}s)`);
    }
  } catch (e) {
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (spec.xfail) {
      console.log(`XFAIL ${spec.name} (${secs}s) — known open bug ${spec.xfail}`);
    } else {
      failed++;
      console.error(`FAIL  ${spec.name} (${secs}s): ${e.message ?? e}`);
    }
  }
}

try {
  await deleteFixtureScenes(page);
} catch {
  console.warn("fixture cleanup skipped");
}
await browser.close();

console.log(`\ne2e summary: ${specs.length} specs, ${failed} failed, ${xpassed} xpass`);
process.exit(failed > 0 ? 1 : 0);
