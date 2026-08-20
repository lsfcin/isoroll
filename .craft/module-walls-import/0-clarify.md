## Carry
slug: module-walls-import | branch: feature/module-walls-import | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (Foundry server ALREADY RUNNING at localhost:30000 — do NOT restart it; log at scratchpad foundry.log)
criticality: normal | verdict: standard
criteria:
  C1 — programmatic import API `isoroll.importSceneManifest(manifest, {sceneId?})`: given a scene manifest JSON (shape: {scene, view, pxPerVoxel, tiles[{piece,asset,facing,u,v,boundHeight,imageOffset,pxPerVoxel}], walls[WallDef-shaped]}), creates Foundry tiles (with `flags.isoroll.boundHeight`/`imageOffset` set from manifest, texture = kit asset) and walls via the existing `createWallsFromDefs` (`src/walls/wall-crud.ts`)
  C2 — counts round-trip: created wall documents == manifest walls length (l-room fixture: 6); created tiles == manifest tiles length (34); door entries in manifest become door walls
  C3 — malformed manifest (missing keys, anchor outside [0,1]², unknown facing) → graceful error (notification/throw with message), zero partial documents created
  C4 — e2e: import the real l-room manifest into a live Foundry scene; `verify:full` green (no regressions in existing B-spec/golden suites)
tasks: <filled by Loop 1>
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/walls/CONTEXT.md, /mnt/workspace/core/skills/foundry.md (+ subfiles as needed), /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ contract)

## Clarify
intent: import a content-pipeline scene manifest into Foundry — walls + tiles created programmatically — closing the generate→play seam (program P2, second half).
motivation: with export-manifest SHIPPED (content repo), this makes "generate a scene → play it in Foundry" real for the gray l-room; unblocks P4/P6/P7.
refs: manifest fixture (real, freshly generated): /mnt/workspace/code/isoroll-content/output/manifests/l-room.manifest.json; kit assets: /mnt/workspace/code/isoroll-content/output/kit-guide/{floor,wall,door_u,door_v,window_u,window_v,stair}.png + kit.json; import surface: src/walls/wall-crud.ts (createWallsFromDefs, applyWallDefs), wall-types.ts (WallDef), wall-coords.ts (defToCanvas anchors [0,1]²); exporter twin: isoroll-content/src/pipeline/scene_manifest.py + src/cli/wall_schema.py.
scope-files: new `src/import/` (or walls-adjacent) module + registration in module.ts; `test/` unit + e2e additions; asset staging decision (kit PNGs must be reachable under Foundry Data — copy step or configurable path; Loop 3 decides, keep simplest).
expected-result: in live Foundry, a scene shows the gray l-room (34 tiles placed on grid, 6 walls registered, doors as door walls); `verify:fast` + `verify:full` green.
ambition: solid
criticality: normal tolerance: visual polish of placement (exact pixel anchoring) may be refined in P4; wrong COUNTS or crashes are not tolerable.
innovation: none — mechanical seam per ROADMAP-content-gen delegation table (row `module-walls-import`, depends on export-manifest: SHIPPED).
verdict: standard
keep-trail: yes (pilot part 2 — routing audit)
note: WallDef manifest fields were validated against wall-types.d.ts by the exporter; trust but re-validate at import (C3).
note-server: Foundry v14 server ALREADY RUNNING at http://localhost:30000 (302 on probe). Build symlink: /home/lucas/foundrydata-v14/Data/modules/isoroll. `npm run build` after changes.

executor: orchestrator (Fable session, plan-approved) model=claude-fable-5 tier=max
