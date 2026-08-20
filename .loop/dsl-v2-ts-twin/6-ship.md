# Loop 6 — Ship — dsl-v2-ts-twin

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
keep-trail: yes

## Ship

diff-scope: clean
extras (pre-existing-dirty, floor-fog-spike contamination):
  M  src/core/module.ts
  M  src/assemble/index.ts (T8 facade removed from scope due to interleaving with spike-floor load() concerns)
  M  src/walls/wall-types.d.ts
  M  src/walls/wall-types.ts
  ?? .loop/floor-fog-spike/
  ?? .loop/ts-assembler/6-ship.md
  ?? src/assemble/load.d.ts
  ?? src/assemble/load.ts
  ?? src/core/CONTEXT.md
  ?? src/spike-floor/
  ?? test/e2e/assets/assembled/
  ?? test/e2e/spike-floor.spec.mjs
  ?? test/unit/spike-bg-regen.test.ts
  ?? test/unit/spike-floor-tiles.test.ts
  ?? test/unit/spike-measure.test.ts

roadmap: T8 (ROADMAP.md dsl-v2-ts-twin line) deliberately deferred — see leftovers.

commit: aad8dac (feat(dsl-v2-ts-twin): TS parser + massing + manifest twin for DSL v2 layouts)
pushed: yes

leftovers:
  T8 — facade index.ts re-export of layout-groups + layout-serialize, CONTEXT.md cross-reference, ROADMAP.md feature line — routed to P7a painter loop after floor-fog-spike resolution. Reason: src/assemble/index.ts facade edit conflicts with floor-fog spike's load() node:fs wrapping; defer facade update until spike branch lands and contamination can be cleanly separated.

executor: loop-low model=haiku tier=low
