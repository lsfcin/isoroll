# Loop 5 — User Test — dsl-v2-ts-twin

## Carry
slug: dsl-v2-ts-twin | branch: loop/dsl-v2-ts-twin (base feature/ts-assembler) | root: code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (needs Foundry at localhost:30000 — Loop 5 only if server up, else skip note)
criticality: normal | verdict: standard
criteria:
  C1 TS parser twin — parses SAME DSL v2 fixtures as Python (level blocks, attr grids side/type/wmat/fh, roof:/stair: group lines authoritative, R/S derived+validated, voxel-exclusivity + stair-incl∈{2.5,5} validation)
  C2 golden twin — TS parse output (levels, groups, massing GRP-box list) matches Python goldens structure-exact on all fixtures (round-trip toDsl==fixture + hand-derived group spans + error-class parity)
  C3 manifest consumption — module import path consumes v2 manifest fields: tile elevation from level/z0, WallDef.dir from opening side, boundHeight from z-run height; existing walls-import stays green
  C4 `npm run verify:fast` fully green (lint + unit suites)
tasks:
  T1 — copy 5 v2 fixtures → test/unit/assets/dsl-v2/*.txt — low
  T2 — extend types (Level, Group, Box.z0, kind "GRP", MARKERS/ROOF_FORMS/STAIR_TYPES/ENCLOSE) → src/assemble/types.ts — medium
  T3 — port layout-groups.ts (grpBaseData/grpCellVoxels/diagSolid, rig.frag geometry) → src/assemble/layout-groups.ts — high
  T4 — port v2 parser+validate (parseText dispatches to v2 on `level N:`; ports layout_parse.py v2 + layout_dsl_v2.py) → src/assemble/layout-parse.ts (+layout-dsl-v2.ts if over line-gate) — high
  T5 — port massing v2 (Box.z0 default 0 + one GRP box per group cell) → src/assemble/massing.ts — medium
  T6 — port serialize (toDsl round-trip) → src/assemble/layout-serialize.ts — medium
  T7 — manifest consumption C3 (ManifestTile.z, ManifestWall.dir, boundHeight z-run) → src/import/{manifest-types,import-tiles,import-walls}.ts — medium
  T8 — facade + CONTEXT + ROADMAP line → src/assemble/index.ts, src/assemble/CONTEXT.md, ROADMAP.md — low
context: code/CONTEXT.md, code/isoroll-module/CONTEXT.md, code/isoroll-module/SPECS.md, code/isoroll-module/src/CONTEXT.md
BRANCH WARNING: base loop/dsl-v2-ts-twin on feature/ts-assembler (verified: carries assembler 5efcbdb + walls-import f1c7d64). Do NOT branch off current dirty feature/floor-fog-spike working tree (uncommitted M to src/assemble/*, module.ts, ROADMAP.md; untracked load.ts/load.d.ts NOT on the base — do not depend on them). Loop 2 must set those aside before branching.
keep-trail: yes

## User Test

scenario: As the module developer, I want proof — not just unit-test assertions — that the TS DSL
v2 twin actually agrees with the real Python pipeline shipped in isoroll-content, and that a
parsed v2 layout's group geometry genuinely flows through the module's manifest-import path into
Foundry Tile/Wall creation data. I take the 5 frozen v2 fixtures, run them through BOTH the live
Python pipeline (isoroll-content/src/pipeline/layout_parse.py + layout_massing.py, unmodified,
imported fresh — not the hand-derived PIN-5 values baked into the existing unit tests) and the TS
twin (parseTextV2 + massing), and diff the two structurally. Then I take one parsed layout's GRP
massing box and a synthetic wall-run box and push them through the actual manifest-consumption
functions (manifestTileToData, manifestWallsToDefs) to confirm z/dir/boundHeight really land where
C3 claims they do.

script: test/e2e/dsl-v2-twin-scenario.test.ts (oracle: .loop/dsl-v2-ts-twin/py_dsl_v2_dump.py,
config: vitest.scenario.config.ts — kept outside vitest.config.ts's default include so it never
runs inside `npm run verify:fast`/C4, per keep-trail:yes)
run: `npx vitest run --config vitest.scenario.config.ts`

Pre-check: fixture identity. Diffed all 5 module fixtures (test/unit/assets/dsl-v2/*.txt) against
the content repo's committed goldens (isoroll-content/test/fixtures/golden/*.txt) — byte-identical,
all 5. Confirms T1 copied verbatim, no drift.

e2e-cmd check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:30000` → connection failed
(curl exit, no HTTP code) — Foundry is NOT running at localhost:30000. Per instruction, did NOT
start the server; `npm run verify:full` is skipped this loop. Relying entirely on the scripted
scenario below, which does not need a live Foundry (manifestTileToData/manifestWallsToDefs are
pure functions; the test/unit/setup.ts global stubs — PIXI/game/canvas/ui — cover the only Foundry
globals canvasToAnchor's call chain touches).

observed (`npx vitest run --config vitest.scenario.config.ts`):
```
PASS (9) FAIL (0)
```
Breakdown:
- 5x "DSL v2 twin — TS parse/massing cross-checked against a LIVE Python run (C1, C2)" — one per
  fixture (dsl_v2_groups, dsl_v2_invalid_badincl, dsl_v2_invalid_misplaced_r, dsl_v2_lroom,
  dsl_v2_multilevel). Each: TS parseTextV2's levels/groups/errors deep-equal a freshly-executed
  Python layout_parse.parse_text's output (via subprocess), AND — for the 3 valid fixtures — TS
  massing()'s GRP-box list deep-equals Python layout_massing.massing(layout, merge=False)'s GRP
  boxes. All 5 matched exactly; no manual tweaking of expected values (the oracle script runs the
  real Python source, unmodified, fresh per invocation).
- 3x "chained manifest consumption (C3)": (a) dsl_v2_groups's z0=1 GRP box → ManifestTile{z:1,
  boundHeight:1} → manifestTileToData → flags.isoroll.baseElevation===1, boundHeight===1 (passed);
  (b) manifest tile with no z → baseElevation===0 back-compat (passed); (c) synthetic wall box
  {axis:"u", h:3, z0:0} → ManifestWall{dir:"u", topOffset:3, bottomOffset:0} →
  manifestWallsToDefs → WallDef.dir==="u", topOffset===3, bottomOffset===0 (passed).
- 1x back-compat guard: manifest wall with no `dir` → resulting WallDef has no `dir` key (passed,
  re-confirms C4's back-compat tolerance holds under this scenario's own wall construction, not
  just the existing import-walls.test.ts fixtures).

Also ran the project's own gate for context (not a re-run of this scenario, sanity check that the
new scratch files under test/e2e/ and vitest.scenario.config.ts don't leak into it):
`npm run verify:fast` → lint 0 errors, 46 warnings (unchanged baseline); vitest 17 files / 92 tests
passed — identical to 4b-code.md's reported green, confirming the scenario's scratch files are
correctly excluded (eslint targets `src` only; vitest.config.ts's include is test/unit only).

matches-expected-result: yes. Loop 0's expected-result ("verify:fast green; TS twin outputs match
Python goldens exactly on l-room-v2, multilevel, groups fixtures; invalid fixtures rejected with
same error classes") is satisfied and strengthened: matched against a LIVE Python run rather than
only the hand-derived unit-test goldens, across all 5 fixtures (not just the 3 named), plus C3's
manifest-consumption chain verified end-to-end through the actual TS mapping functions.

New files this loop (flagging for Loop 6 diff-scope review, additive/scratch, keep-trail:yes):
test/e2e/dsl-v2-twin-scenario.test.ts, vitest.scenario.config.ts,
.loop/dsl-v2-ts-twin/py_dsl_v2_dump.py. None are referenced by src/ or by the default
`npm run verify:fast` path — Loop 6 should decide whether to keep them as a reusable twin-audit
script or fold them into `.loop/` cleanup.

executor: loop-medium model=sonnet tier=medium
