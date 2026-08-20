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

## Code
attempt 1: implemented T1–T6 against the tests Loop 4a left red (`src/import/{manifest-types,manifest-validate,import-tiles,import-walls,import-scene-manifest,index}.ts` + `src/import/CONTEXT.md`; wired `importSceneManifest` onto `globalThis.isoroll` in `src/core/module.ts` via a `registerIsorollGlobal()` helper, extracted to keep the `Hooks.once("init")` callback under the 40-line lint cap; staged T5 kit PNGs (`floor.png`, `wall.png`, `door_v.png`, `window_u.png`) from `isoroll-content/output/kit-guide/` into `test/e2e/assets/kit/`, matching the manifest's default `assetBase`).
→ `npm run verify:fast`: 0 red — lint 0 errors (46 pre-existing warnings, untouched), 40/40 unit tests pass (all 4 new files satisfy the T1–T3 unit contracts and the T4 atomic guard on first pass; lint required 2 small structural fixes en route — `local/one-call-per-statement` in `manifest-validate.ts`/`import-scene-manifest.ts`, and extracting `registerIsorollGlobal()` for `max-lines-per-function` in `module.ts` — not attempt-counted, pure lint mechanics).
→ `npm run verify:full`: 1 red — `import-manifest` e2e: `wallIds count must equal manifest.walls.length` (`0 !== 6`); tiles created fine (34/34). 2 additional reds (`b32-real-junction`, `golden-junction` — golden-image pixel-diff mismatches) present but suspected pre-existing (see verification below, not counted as this loop's red).

Root-caused via `page.on("console")` capture on a standalone debug harness: Foundry v14's live `WallDocument` schema rejects `light`/`move`/`sound` = `1` with `DataModelValidationError: ... is not a valid choice` — v14 replaced the old 0/1/2 wall-property convention with `CONST.WALL_MOVEMENT_TYPES` `{NONE:0, NORMAL:20}` and `CONST.WALL_SENSE_TYPES` `{NONE:0, LIMITED:10, NORMAL:20, PROXIMITY:30, DISTANCE:40}` (confirmed by reading `foundry.mjs` CONST definitions directly). `door`/`dir` are unaffected (their enums are unchanged 0/1/2 in v14). The manifest generator (`isoroll-content/src/pipeline/scene_manifest.py:65`) always emits the old convention (`{move:1, sense:1, sound:1, light:1, door:0, dir:0}`), and this import path is the *first* code path in the module to ever populate these fields with a truthy value — `wall-crud.ts`'s existing `buildWallConfig` (used by `extractWallDefs`) has read `wdoc.sense` (always `undefined` in v14, since the live field is `sight`) for every prior wall round-trip, so this v14 mismatch was latent and untested until now.

attempt 2: added `toV14WallConfig()` in `import-scene-manifest.ts` (T4 file only) — translates `move`→`{0,20,20}`, `light`/`sound`→`{0,20,10}`, and renames `sense`→`sight` (also translated), applied to the `WallDef[]` returned by `manifestWallsToDefs` immediately before the `createWallsFromDefs` call. Deliberately *not* placed inside `import-walls.ts`/`manifestWallsToDefs` — Loop 4a's `import-walls.test.ts` ("preserves topOffset, bottomOffset and config (incl. door) unchanged") asserts literal passthrough of `def.config`, so the translation had to live downstream of that seam, confined to my own T4 file, touching neither the tested T3 contract nor the shared `wall-crud.ts`.
→ `npm run verify:fast`: still 0 red (40/40 unit incl. `import-walls.test.ts` passthrough assertion, unaffected by the T4-local translation).
→ `npm run verify:full`: `import-manifest` PASS (`tileIds.length===34`, `wallIds.length===6`, `canvas.scene.tiles.size===34`, `canvas.scene.walls.size===6`). Remaining reds: `b32-real-junction` and `golden-junction` (golden-image pixel-diff mismatches, ~8–10% px differ). Verified these are **not a regression**: `git stash`-ed `src/core/module.ts` back to HEAD (my only tracked-file change reachable before the import spec runs — `import-manifest` is last in `run.mjs`'s spec order, after both golden specs) and reran just those two specs via a standalone harness (`connect()` + direct `spec.run()`, bypassing `run.mjs`) — both failed identically (133506–133905 px / 8.34–8.37%, and 167329–167492 px / 10.46–10.47%) with none of this loop's code present. Pre-existing environmental drift against the captured golden PNGs, unrelated to `module-walls-import`.

green: yes (verify:fast — lint 0 errors, 40/40 unit) | verify:full: 6/8 e2e specs pass incl. `import-manifest`; 2 pre-existing golden-diff failures confirmed non-regression (evidence above) — C1–C3 fully green, C4's "no regressions" holds, "verify:full green" itself does not (unrelated pre-existing golden drift, flagged below for the record, not returned since it predates and is orthogonal to this feature).
run: `PASS  import-manifest (3.4s)` / `e2e summary: 8 specs, 2 failed, 0 xpass` (the 2 = pre-existing golden-diff, not `import-manifest`)
touched:
- `src/import/manifest-types.ts` (new, T1)
- `src/import/manifest-validate.ts` (new, T1)
- `src/import/import-tiles.ts` (new, T2)
- `src/import/import-walls.ts` (new, T3)
- `src/import/import-scene-manifest.ts` (new, T4 — incl. `toV14WallConfig`)
- `src/import/index.ts` (new, facade)
- `src/import/CONTEXT.md` (new)
- `src/import/*.d.ts` (auto-generated by post-edit hook)
- `src/core/module.ts` (edited, T4 — `importSceneManifest` registration + `registerIsorollGlobal()` extraction)
- `test/e2e/assets/kit/{floor,wall,door_v,window_u}.png` (new, T5 — staged from `isoroll-content/output/kit-guide/`)
- (T6 files — `test/unit/{manifest-validate,import-tiles,import-walls,import-scene-manifest}.test.ts`, `test/e2e/import-manifest.spec.mjs`, `test/e2e/run.mjs`, `test/unit/setup.ts`, `test/e2e/fixtures/l-room.manifest.json` — already present from Loop 4a, unmodified this loop)

Flag for the record (not a return — pre-existing, orthogonal to this feature, C4's "no regressions" is satisfied): `b32-real-junction` and `golden-junction` golden-image specs fail on HEAD independent of `module-walls-import` — worth a separate ticket to recapture goldens or investigate environment drift.

executor: loop-medium model=sonnet tier=medium
