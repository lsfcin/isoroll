# Loop 4a — Tests First — dsl-v2-ts-twin

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

## Tests

Wrote failing tests at the seams named in 3-arch.md for C1/C2/C3, ahead of any T2-T7 behavior.
Fixtures copied verbatim from isoroll-content (T1); expected values HAND-DERIVED by running the
Python twins (`layout_dsl_v2.parse_text_v2`, `layout_massing.massing(merge=False)`,
`layout_serialize.to_dsl`) offline against those fixtures — PIN-5, no shell-out at test-run-time.

New seam files (T2/T3/T4/T6 signatures only, bodies stubbed `throw Error("not implemented ...")`
for genuinely NEW logic; T2's data tables ported as real literals — nothing to get wrong there):
`src/assemble/types.ts` (Level, Group interfaces; Box.z0?/kind "GRP"; Layout.levels?/groups?),
`src/assemble/layout-groups.ts` (NEW — data tables real, diagSolid/grpBaseData/grpCellVoxels stubbed),
`src/assemble/layout-dsl-v2.ts` (NEW — parseTextV2 stubbed), `src/assemble/layout-serialize.ts`
(NEW — toDsl stubbed). T5/T7's actual behavior (massing v2 branch, manifest z/dir passthrough)
intentionally left untouched in massing.ts/import-tiles.ts/import-walls.ts/wall-types.ts/manifest-types.ts
— those tests assert against the CURRENT (pre-implementation) exports and fail via wrong-value
assertions instead, so Loop 4a's diff never touches T5/T7 production files (all real implementation
stays Loop 4b's job).

| test file | covers | asserts |
|-----------|--------|---------|
| test/unit/dsl-v2-parse.test.ts | C1 (parseTextV2 grammar+validation on 5 fixtures) | levels[].g / groups[] structure-exact for 3 valid fixtures; exact PIN-3 error strings, in order, for 2 invalid fixtures |
| test/unit/dsl-v2-roundtrip.test.ts | C2 (toDsl round-trip, PIN-2) | toDsl(parseTextV2(text)) line-by-line rstrip-equals source text, all 5 fixtures |
| test/unit/dsl-v2-massing.test.ts | C2 (massing GRP-box spans) + C4/PIN-1 back-compat guard | dsl_v2_groups → massing() GRP box list toEqual hand-derived voxLo/voxHi spans (6 boxes); separate v1-layout case asserts no box carries "GRP" kind or a z0 key (regression guard, passes today) |
| test/unit/import-tiles.test.ts (appended) | C3 (tile z → baseElevation) | new tile with z:5 → flags.isoroll.baseElevation===5; back-compat case (no z) still 0 |
| test/unit/import-walls.test.ts (appended) | C3 (WallDef.dir from opening side, PIN-4) | new wall with dir:"u" → def.dir==="u" and def.config unions kept separate (config.dir untouched); back-compat case (no dir) → no "dir" key on def |

red-run: 13 failed as expected (11 via thrown `Error: not implemented: <fn> (Loop 4b — T<n>)` at
the stub seams [dsl-v2-parse.test.ts ×5, dsl-v2-roundtrip.test.ts ×5, dsl-v2-massing.test.ts's
v2-GRP-box case ×1]; 2 via wrong-value assertion against existing, unmodified production code
[import-tiles.test.ts's z-passthrough case: baseElevation 0 vs expected 5; import-walls.test.ts's
dir-passthrough case: def.dir undefined vs expected "u"]) | wrong-failures: none (no import/module
resolution errors, no syntax errors; `./node_modules/.bin/eslint` on the 4 touched/new src files
is clean — 0 errors, 0 warnings)

Ran `npm run verify:fast` full suite: Test Files 5 failed | 12 passed (17); Tests 13 failed | 79
passed (92) — the 79 green include all 76 pre-existing tests (untouched) plus 3 new back-compat
regression guards (v1 massing shape, tile-no-z, wall-no-dir) that pass today by design. Lint: 0
errors, 46 warnings (identical count to the pre-Loop-4a baseline — no new warnings introduced by
the 4 touched/new source files).

Note (grounding, non-blocking): the working tree carries pre-existing uncommitted changes from a
different, unrelated feature (`floor-fog-spike`: `src/core/module.ts`, `src/assemble/index.ts`,
`src/assemble/layout-parse.ts`, `src/assemble/layout-parse.d.ts`, `src/assemble/CONTEXT.md`,
`ROADMAP.md`, untracked `src/assemble/load.ts`/`.d.ts`, `src/spike-floor/`, `test/unit/spike-*`) —
exactly the contamination Loop 2's BRANCH WARNING describes, present despite Loop 2's ground note
claiming a clean branch. `npm run verify:fast` passes green regardless (verified both before and
after this loop's edits), and none of this loop's new/touched files overlap those paths, so it did
not block Loop 4a. Flagging for Loop 6 (ship) diff-scope review — that contamination is NOT part
of this feature's diff and must not be committed under this branch.

executor: loop-medium model=sonnet tier=medium
