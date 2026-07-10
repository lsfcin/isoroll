## Carry
slug: module-walls-import | branch: feature/module-walls-import | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (Foundry server ALREADY RUNNING at localhost:30000 — do NOT restart it; log at scratchpad foundry.log)
criticality: normal | verdict: standard
criteria:
  C1 — programmatic import API `isoroll.importSceneManifest(manifest, {sceneId?})`: given a scene manifest JSON (shape: {scene, view, pxPerVoxel, tiles[{piece,asset,facing,u,v,boundHeight,imageOffset,pxPerVoxel}], walls[WallDef-shaped]}), creates Foundry tiles (with `flags.isoroll.boundHeight`/`imageOffset` set from manifest, texture = kit asset) and walls via the existing `createWallsFromDefs` (`src/walls/wall-crud.ts`)
  C2 — counts round-trip: created wall documents == manifest walls length (l-room fixture: 6); created tiles == manifest tiles length (34); door entries in manifest become door walls
  C3 — malformed manifest (missing keys, anchor outside [0,1]², unknown facing) → graceful error (notification/throw with message), zero partial documents created
  C4 — e2e: import the real l-room manifest into a live Foundry scene; `verify:full` green (no regressions in existing B-spec/golden suites)
tasks:
  T1 — manifest types + pure structural validator (mirror wall_schema.py + wall-types.d.ts) — src/import/manifest-types.ts, src/import/manifest-validate.ts — medium
  T2 — pure tile-data mapping (u,v→x,y at grid size; flags.isoroll.boundHeight+imageOffset; texture.src=staged kit asset) — src/import/import-tiles.ts — high
  T3 — manifest wall[] → WallDef[] for createWallsFromDefs incl. scene-normalized→tile-relative anchor contract + door config — src/import/import-walls.ts — high
  T4 — orchestrator importSceneManifest(validate-first, atomic) + register on isoroll global — src/import/import-scene-manifest.ts, src/core/module.ts — high
  T5 — stage kit PNGs under Foundry Data so texture.src resolves (simplest path; Loop 3 confirms) — kit assets → foundrydata modules path — medium
  T6 — unit tests (T1/T2/T3) + e2e spec import real l-room + register in run.mjs — test/unit/*, test/e2e/import-manifest.spec.mjs, test/e2e/run.mjs — medium
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/walls/CONTEXT.md, /mnt/workspace/core/skills/foundry.md (+ subfiles as needed), /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ contract)

## Tests
| test file | covers | asserts |
|-----------|--------|---------|
| `test/unit/manifest-validate.test.ts` | C3, T1 `validateManifest` | clean manifest → `[]`; anchor coord OOB, missing coord field, config value OOB [0,2], unknown config key, tile missing required field, unknown facing, negative/non-int u, imageOffset component OOB [0,1] → each ≥1 error |
| `test/unit/import-tiles.test.ts` | C1, T2 `manifestTileToData` | `x=(u+.5)*g, y=(v+.5)*g` (fixed case + fc property over u,v,g), `width=height=g, rotation=0`; `texture.src=assetBase+"/"+asset`; `flags.isoroll.{boundHeight,baseElevation:0,presetEnabled:true}`; `imageOffset` stored DIRECT as `{x,y}` (Deferred #2, no unit conversion) |
| `test/unit/import-walls.test.ts` | C1/C2, T3 `manifestWallsToDefs` | frame-independence property (Deferred #1): `defToCanvas(frameA,defA) === defToCanvas(frameB,defB)` for two structurally different frame tiles, fc over wall+cols+rows+g; l-room wall[0] denormalizes to canvas `[0,0,500,100]` at cols=rows=8,g=100; `topOffset`/`bottomOffset`/`config` (incl. `door`) pass through unchanged; 1:1 order-preserving map |
| `test/unit/import-scene-manifest.test.ts` | C3, T4 atomic guard | malformed manifest (`bx=5`, OOB) → `importSceneManifest` rejects AND mocked `scene().createEmbeddedDocuments` has **zero** calls |
| `test/e2e/import-manifest.spec.mjs` (registered in `run.mjs`) | C2/C4 | real l-room manifest (`test/e2e/fixtures/l-room.manifest.json`, copied from `isoroll-content/output/manifests/`) imported via `isoroll.importSceneManifest(manifest,{assetBase})` → `result.{tileIds,wallIds}` lengths == manifest `tiles`/`walls` lengths; `canvas.scene.tiles.size===34 && canvas.scene.walls.size===6` |

red-run: 5 failed as expected | wrong-failures: none
- 4 unit files: `Cannot find module '../../src/import/<name>'` (src/import/ does not exist yet — missing implementation, not a test bug; `npx vitest run` confirms 21 pre-existing tests still pass unaffected).
- e2e spec (run standalone against the live server, not via full `run.mjs`): `globalThis.isoroll.importSceneManifest is not a function` — confirms `isoroll` global exists (debug-only stub per arch) but the API isn't wired yet.
- `npm run lint` still 0 errors (46 pre-existing warnings, untouched).

Setup notes for Loop 4b:
- Added `ui.notifications` stub to `test/unit/setup.ts` (validate-before-write path calls `ui.notifications?.error(...)` per arch step 1) so pure-logic unit tests don't crash on an undeclared global.
- Added `test/e2e/fixtures/l-room.manifest.json` (copy of `isoroll-content/output/manifests/l-room.manifest.json`) so the e2e spec is self-contained inside this repo.
- The Foundry world `isoroll-test` was **not active** at session start (server was up but sitting at the setup screen — no world had been launched this boot). Activated it via the `/setup` UI's `worldLaunch` control (non-destructive, no process restart — port/PID unchanged); server now serves `/join` → `isoroll-test`. If it goes idle again before Loop 5, relaunch the same way — do not restart the Foundry process.
- T5 (kit asset staging) is still open; the e2e spec's count assertions do not require assets to be physically staged (Foundry stores `texture.src` without resolving the file), but the P2 human-eyeball checkpoint does.

executor: loop-medium model=sonnet tier=medium
