# Loop 0 — Clarify — dsl-v2-ts-twin

## Carry
slug: dsl-v2-ts-twin | branch: loop/dsl-v2-ts-twin (TBD Loop 1) | root: code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (needs Foundry at localhost:30000 — Loop 5 only if server up, else skip note)
criticality: normal | verdict: standard
criteria:
  C1 TS parser twin — parses the SAME DSL v2 fixtures as Python (level blocks, attr grids side/type/wmat/fh, roof:/stair: group lines authoritative, R/S derived+validated, voxel-exclusivity + stair-incl∈{2.5,5} validation)
  C2 golden twin — TS parse output (levels, groups, massing-equivalent box list where applicable) matches committed Python goldens byte/structure-exact on all fixtures (pattern = P4 assembler port: golden diff TS == Python)
  C3 manifest consumption — module import path consumes v2 manifest fields: tile elevation from level/z0, WallDef.dir from opening side, boundHeight from z-run height; existing walls-import stays green
  C4 `npm run verify:fast` fully green (lint + unit suites)
tasks: TBD (Loop 1)
context: code/CONTEXT.md, code/isoroll-module/CONTEXT.md, code/isoroll-module/SPECS.md, code/isoroll-module/src/CONTEXT.md

## Clarify
intent: TypeScript twin of the DSL v2 parser shipped in content loop dsl-v2-python, + v2 manifest field consumption in the module import path.
motivation: P7 painter (next loop) needs the frozen grammar parsed module-side; twin-golden pattern proved out in P4 (TS assembler == Python, 59 tests).
refs: content repo branch loop/dsl-v2-python (commits 0a4d990+45a2f97): src/pipeline/layout_parse.py, layout_groups.py, layout_serialize.py, layout_massing.py — PORT these (they are themselves a port of design/feel-rig/rig.frag, the frozen normative reference). Fixtures + goldens: content test/fixtures/golden/*. Spec: content SCENE-CREATION.md § contract (DSL v2 FROZEN 2026-07-13) + design/PAINTER-UX.md rounds 12–19.
scope-files: src/ (new layout parser module + types; walls/wall-types.d.ts mapping touch), test/unit/ (twin golden tests; fixtures copied from content repo — copy files in, do not reference across repos), ROADMAP.md
expected-result: verify:fast green; TS twin outputs match Python goldens exactly on l-room-v2, multilevel, groups fixtures; invalid fixtures rejected with same error classes.
ambition: solid
criticality: normal tolerance: none on golden divergence — any TS≠Python diff is a bug in the twin, Python is authoritative
innovation: none (twin port)
verdict: standard
keep-trail: yes
BRANCH WARNING for Loop 1/2: do NOT base on develop blindly — base on the module stack tip carrying the shipped TS assembler (feature/ts-assembler lineage / current stack tip; verify with git log that scene-assembler + walls-import code is present on the base).

executor: orchestrator(fable, Loop 0 — fields from approved post-freeze plan + D1 ship report, same session) model=claude-fable-5 tier=max
