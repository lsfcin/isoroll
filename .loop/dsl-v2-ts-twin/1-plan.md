# Loop 1 — Plan — dsl-v2-ts-twin

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

## Plan
branch: loop/dsl-v2-ts-twin (base: feature/ts-assembler)

Python source to PORT (content repo branch loop/dsl-v2-python, src/pipeline/): layout_parse.py (v2 Level/Group/validate/rotate), layout_dsl_v2.py (the v2 grammar — parse_text_v2, imported lazily by layout_parse.parse_text), layout_groups.py, layout_massing.py, layout_serialize.py. Fixtures + mirror tests: content test/fixtures/golden/dsl_v2_*.txt and content test/test_dsl_v2_{parse,massing,serialize,manifest}.py.

| id | task | files | done-when | tier | effort |
|----|------|-------|-----------|------|--------|
| T1 | Copy the 5 v2 fixtures into module test tree (no cross-repo runtime ref) | test/unit/assets/dsl-v2/{lroom,multilevel,groups,invalid_badincl,invalid_misplaced_r}.txt | 5 files present, byte-identical to content test/fixtures/golden/dsl_v2_*.txt | low | low |
| T2 | Extend pure types + constants (additive, back-compat) | src/assemble/types.ts | Level{g,side,type,wmat,fh}, Group{kind,cells,form,dir,incl,z,enclose?}, Box gains z0 (default 0), Box.kind ∪ "GRP"; MARKERS(R,S)/ROOF_FORMS/STAIR_TYPES/ENCLOSE/DEFAULT_WALL_H exported; tsc clean | medium | medium |
| T3 | Port layout-groups.ts geometry twin | src/assemble/layout-groups.ts | grpBaseData/grpCellVoxels/diagSolid ported; flat roof span [z,z+1); shed1 stair rise=incl/5 (cell(1,0)→(0,1), (1,1)→(1,2)); group-geom unit tests green | high | high |
| T4 | Port v2 parser + validate (dispatch on `level N:` header; v1 headerless path unchanged) | src/assemble/layout-parse.ts (+ src/assemble/layout-dsl-v2.ts if file exceeds line-gate, mirroring Python split) | parseText reads level/layer(side/type/wmat/fh)/roof:/stair: blocks; validate: voxel-exclusivity union + double-book + stair incl∈{2.5,5} + misplaced-marker; 3 valid fixtures errors==[], 2 invalid errors!=[] (badincl msg contains "incl"); existing assemble-parse/golden/scenario tests stay green | high | high |
| T5 | Port massing v2 | src/assemble/massing.ts | every Box has z0 (lone wall → 0.0); massing emits one "GRP" box per group cell with (z0, z0+h) == grpCellVoxels span (v0==r, u0==c) | medium | medium |
| T6 | Port serialize (round-trip golden) | src/assemble/layout-serialize.ts | toDsl(parseText(fx)) == fx per-line-rstripped for lroom/multilevel/groups | medium | medium |
| T7 | Manifest consumption C3 | src/import/manifest-types.ts, src/import/import-tiles.ts, src/import/import-walls.ts | ManifestTile gains z (→ tile elevation), ManifestWall gains dir (→ WallDef.dir), boundHeight taken from z-run height; import-walls.test.ts + import-tiles.test.ts stay green | medium | medium |
| T8 | Facade + CONTEXT + ROADMAP | src/assemble/index.ts, src/assemble/CONTEXT.md, ROADMAP.md | index re-exports layout-groups + layout-serialize; CONTEXT lists new files; ROADMAP has a dsl-v2-ts-twin line (added ON the loop branch — see Review R5) | low | low |

Note: `.d.ts` files are auto-generated by the workspace tsc hook on every edit (`tsc --emitDeclarationOnly`). Executors edit only `.ts`; never hand-author `.d.ts`.

## Plan Review (adversarial, assume small executors)
- R1 clarify refs omit layout_dsl_v2.py, but the v2 grammar lives there (layout_parse.parse_text delegates lazily) → FIXED: T4 row + Plan header name BOTH layout_parse.py and layout_dsl_v2.py as port sources.
- R2 Python split parser across 2 files to stay under the per-file line gate; module has the same BLOCK_LINES gate (pre-edit.py) → a single layout-parse.ts may be blocked → FIXED: T4 files column authorizes a layout-dsl-v2.ts split mirroring Python; Loop 3 finalizes the seam.
- R3 executor might hand-write .d.ts → FIXED: explicit note — .d.ts are tsc-hook generated; edit only .ts.
- R4 dirty working tree on feature/floor-fog-spike must not contaminate the base → FIXED: Carry BRANCH WARNING pins base to feature/ts-assembler and tells Loop 2 to set aside uncommitted changes; load.ts/load.d.ts absent from base, so no dependency on them.
- R5 ROADMAP.md is uncommitted-dirty on floor-fog-spike; editing it now (wrong branch, Loop 1 has no branch yet) would pollute an unrelated diff and be lost on branch → DEVIATION: ROADMAP line deferred to the loop branch (Loop 2 adds it right after branch creation; Loop 6 finalizes to done). Still satisfies plans-live-in-roadmaps — lands in ROADMAP on the correct branch. T8 done-when reflects this.
- R6 no committed JSON goldens exist; "golden twin" = round-trip toDsl==fixture + hand-derived group spans + error-class parity, exactly mirroring content's 4 test files (fixtures copied in per T1, no cross-repo runtime ref) → clarifies C2 encoding for Loop 4a.
- R7 rotate_cw does NOT re-orient group cells/dir (documented Python limitation) → C3 group-cell manifest test must use view "SW" (identity turn); noted for T7 / Loop 4a.
- R8 grammar regex accepts any incl `[\d.]+ft`; the {2.5,5} constraint is enforced in validate, not the grammar → T4 validate must reject incl∉{2.5,5.0} (badincl fixture uses 3ft).
- R9 v2 is additive/back-compat: parseText dispatches to v2 only when a `level N:` header matches, else the existing v1 flat-grid path runs unchanged → existing assemble-parse/golden/scenario suites stay green (guards C4). Verified against content layout_parse.py:154 `_HAS_LEVEL.search`.
- Size: 8 rows (< 10 cap), single flow run appropriate (content side shipped as one loop). No split needed.
verdict: PASS

executor: loop-high model=opus tier=high
