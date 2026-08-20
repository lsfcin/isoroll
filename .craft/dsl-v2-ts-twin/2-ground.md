# Loop 2 — Ground — dsl-v2-ts-twin

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

## Ground
branch-created: loop/dsl-v2-ts-twin base: feature/ts-assembler (5efcbdb)
paths: 13/13 ok | missing: none
test-cmd-runs: yes (Test Files 14 passed, Tests 76 passed, 701ms)

executor: loop-low model=haiku tier=low
