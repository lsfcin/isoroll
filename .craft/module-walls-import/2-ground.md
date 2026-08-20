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

## Ground
branch-created: feature/module-walls-import base: main
paths: 10/10 ok | missing: none
test-cmd-runs: yes

executor: loop-low model=haiku tier=low
