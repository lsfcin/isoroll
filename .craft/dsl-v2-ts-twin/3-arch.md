# Loop 3 — Architecture — dsl-v2-ts-twin

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

## Architecture

Verified against the Python originals (isoroll-content/src/pipeline/{layout_groups,layout_parse,layout_dsl_v2,layout_massing,layout_serialize}.py, scene_manifest.py) and the 5 fixtures under isoroll-content/test/fixtures/golden/dsl_v2_*.txt. `verify:fast` = `eslint src` + `vitest run` (NO tsc gate; test files are esbuild-transpiled, not typechecked — but keep types honest).

MODULE GRAPH (must be an acyclic DAG — Python breaks a cycle with a lazy import; TS breaks it by placement, NOT static circular import):
- `layout-groups.ts` (NEW, T3) — leaf runtime. Value consts NLVL=10, WALLISH, DIAG(Set), STAIRS(Set), ARROW_CW, DIAG_CW, ASCENT, SIDE_NAME, ROOF_FORMS=["flat","shed1","shed2"], STAIR_TYPES=["solid","thin"], ENCLOSE=["none","edge","inset"], TYPES. Fns `diagSolid(grid,r,c,ch)`, `grpBaseData(group)→{aOf,aLow,aHigh,rise,form,hAt}`, `grpCellVoxels(base,group,r,c)→[voxLo,voxHi]`. Imports ONLY `import type { Group }` from types (type-only, erased → no runtime edge). Float math: Number.POSITIVE_INFINITY, Math.floor(lo+1e-9), Math.min(NLVL, Math.max(voxLo+1, Math.ceil(hi-1e-9))). form: stairs always use "shed1" for hAt regardless of STAIR_TYPES[form].
- `types.ts` (T2) — add MARKERS=new Set(["R","S"]), COMPASS_TO_ARROW (invert SIDE_NAME: N→"^" E→">" S→"v" W→"<"), KNOWN_V2 (SOLID∪STAIRS∪DIAG∪MARKERS∪{FLOOR,VOID}); interfaces `Level{g:string[]; side/type/wmat/fh: Record<string,string|number>}`, `Group{kind:"roof"|"stair"; cells:[number,number][]; form:number; dir:string; incl:number; z:number; enclose?:number|null}`; extend `Box` with `z0?: number` (OPTIONAL — see PIN-1) and kind union += `"GRP"`; extend `Layout` with `levels?: Record<number,Level>`, `groups?: Group[]`. Imports value SIDE_NAME/DIAG from layout-groups for COMPASS_TO_ARROW/KNOWN_V2 (runtime edge types→groups is fine; groups→types is type-only).
- `layout-dsl-v2.ts` (NEW, T4) — `parseTextV2(text,name)→Layout`. Ports layout_dsl_v2.py: `_LEVEL_RE=/^level (\d+):$/`, `_LAYER_RE=/^layer (side|type|wmat|fh):$/`, `_GROUP_RE=/^(roof|stair): (\d+),(\d+) (\d+),(\d+) form=(\w+) dir=([NESW]) incl=([\d.]+)ft z=(-?[\d.]+)(?: enclose=(\w+))?$/`; readDirectives/readBlock (block boundary = "" empty line or header line — a v2 grid/attr row is never zero-length), parseLevelBlock, makeGroup, validateGroups (D3 union/double-book), validateLevel, touchesWall (≥1 SOLID orthogonal neighbor). Order MUST be: validateGroups THEN per-level validateLevel (matches Python parse_text_v2 lines 163-165). Imports from types + layout-groups only (never from layout-parse → no cycle).
- `layout-parse.ts` (T4) — add dispatch at top of `parseText`: `if (/^level \d+:$/m.test(text)) return parseTextV2(text, name);` before the v1 path. v1 path 100% unchanged. Static `import { parseTextV2 } from "./layout-dsl-v2"` is one-directional (dsl-v2 does not import parse) → safe.
- `massing.ts` (T5) — keep v1 `massing(layout)` body but branch: if `layout.levels && Object.keys(layout.levels).length>0` → for each level key sorted ASCENDING numerically, build sub-Layout {grid:level.g, wallH, rows, cols, errors:[], warnings:[]}, run floorBoxes+cellWallBoxes (SAME helpers, order floor-then-wall), set `box.z0 = lvl*layout.wallH` on each, collect; then append groupBoxes: per group, per cell (r,c): grpBaseData→grpCellVoxels(base,group,r,c)=[voxLo,voxHi] → push `{u0:c, v0:r, l:1, d:1, h:voxHi-voxLo, kind:"GRP", openings:[], axis:"u", z0:voxLo}`. v1 (no levels) path returns unchanged (NO z0 property, NO GRP) — see PIN-1.
- `layout-serialize.ts` (NEW, T6) — `toDsl(layout)→string`. Ports layout_serialize.py: `["name: "+name]`, then per sorted level: "" + "level N:" + level.g rows + per attr(side,type,wmat,fh) non-empty → "layer X:" + rows(each col → attr["r,c"] or "."); then one group line per group. groupLine: `roof|stair: {minR},{minC} {maxR},{maxC} form={ROOF_FORMS|STAIR_TYPES[form]} dir={SIDE_NAME[dir]} incl={incl}ft z={z}`, roof appends ` enclose={ENCLOSE[enclose||0]}`. Join with "\n". Round-trip contract compared PER-LINE-RSTRIPPED (see PIN-2).
- `types.ts`/`index.ts` facade (T8) — index re-exports `parseTextV2`? no — export `toDsl` from ./layout-serialize, `diagSolid/grpBaseData/grpCellVoxels` from ./layout-groups, plus existing. Keep load() out (node:fs) as today.
- `src/import/manifest-types.ts` (T7) — add OPTIONAL `z?: number` to ManifestTile; add OPTIONAL `dir?: "u" | "v"` to ManifestWall. Both optional so existing test literals (import-tiles/import-walls.test.ts, no z/dir) keep compiling (PIN-3).
- `src/import/import-tiles.ts` (T7) — change `baseElevation: 0` → `baseElevation: t.z ?? 0`. Existing test (baseTile has no z) still asserts 0; new test asserts z propagates.
- `src/import/import-walls.ts` (T7) — pass `dir` through: return `{...canvasToAnchor(...), topOffset, bottomOffset, config, ...(w.dir !== undefined ? { dir: w.dir } : {})}`. Requires WallDef to carry dir → PIN-4.
- `src/walls/wall-types.ts` (T7, ADD to plan file list) — add OPTIONAL `dir?: "u" | "v"` to `WallDef`. Additive/optional → no ripple to wall-crud/coords/paste, eslint(src) stays green. This file is NOT in T7's Carry list; it is a required 1-line addition (PIN-4).

PINS (a medium executor WILL guess wrong here):
- PIN-1 (C4 back-compat): v1 massing boxes MUST stay byte-identical to today (assemble-parse.test.ts uses exact `toEqual` on boxes with NO z0). So `z0` is OPTIONAL and the v1 path never sets it; only the v2 branch writes z0. Diverges from Python (Box.z0=0.0 always) intentionally — v1 fixtures are never in the v2 golden comparison, so it is invisible.
- PIN-2 (C2 round-trip): compare `toDsl` output to fixture line-by-line after rstrip on BOTH sides (Python contract), NOT raw string ==. Level grids are right-padded (" S"→" S  ") and rstrip reconciles. Number formatting aligns naturally: parse incl/z as Number; JS `String(5)`="5", `String(2.5)`="2.5" matches Python int/float repr — do NOT force decimals.
- PIN-3 error-class parity (C1/C2): error strings must match Python EXACTLY incl. single-quoted chars (Python `{ch!r}`) and (col,row) order: `level {lvl} ({c},{r}) unknown cell 'X'`; `level {lvl} ({c},{r}) 'D' not adjacent to any wall`; `group incl must be 2.5 or 5 (ft/cell): {incl}`; `level {lvl} ({c},{r}) marker 'R' not covered by any group`; `level {lvl} ({c},{r}) marker 'R' != group type 'S'`; `level {lvl} ({c},{r}) double-booked by {n} groups`. NOTE badincl fixture yields TWO errors (incl error + uncovered-'S'), in that order — not one.
- PIN-4 (C3 dir): "WallDef.dir from opening side" = ManifestWall.dir (Python `"dir": box.axis`, a "u"/"v" wall-run axis) passed through into WallDef.dir. This needs the optional field on WallDef (wall-types.ts, outside T7's Carry file list) — include it. boundHeight-for-walls is redundant with topOffset (both = box.h) so NO new wall field for boundHeight; the boundHeight z-run seam lives on the TILE side (t.boundHeight → flags.boundHeight, already wired; a test confirms a GRP tile's vox-span boundHeight flows through).
- PIN-5 (C2 golden source): copy the 5 fixtures verbatim (T1). Expected parse/massing values are HAND-DERIVED and cross-checked by running the Python twins offline (pattern of assemble-parse.test.ts); tests do NOT shell out to Python at run-time. Golden massing is Python `massing(layout, merge=False)` (render lane, cell walls) so it matches the TS twin's cell-box output; GRP boxes are merge-independent.
- PIN-6 scope: v2 grids contain no arrow-stairs (^>v<) — stairs are GROUPS with 'S' markers — so `massing` need NOT port `_stair_boxes`; count_hud and rendering/diag placement are OUT of scope (no criterion). Port diagSolid (T3) for twin fidelity; it is exported (no eslint no-unused) but exercised only by a light spot test.

## Evaluation
criteria-coverage:
- C1 → layout-dsl-v2.ts parseTextV2 (level/layer/group grammar, R/S validation, stair-incl∈{2.5,5}) + layout-groups.ts grpCellVoxels (voxel-exclusivity spans) + parse dispatch in layout-parse.ts.
- C2 → layout-serialize.ts toDsl (round-trip, PIN-2), massing.ts groupBoxes GRP spans (PIN-5), error-class parity in validateGroups/validateLevel (PIN-3).
- C3 → manifest-types.ts (z?, dir?), import-tiles.ts (baseElevation:t.z??0), import-walls.ts + wall-types.ts (dir passthrough, PIN-4); existing walls-import green because all additions are optional.
- C4 → all src additions additive/optional, v1 paths untouched (PIN-1); eslint(src) + existing vitest suites unaffected.
seams (each criterion has a pure, Node-testable unit seam — no Foundry/PIXI):
- C1/C2: parseTextV2/toDsl/massing on the 5 copied fixtures → assert levels/groups shape, GRP box list (toEqual), toDsl rstrip-equality, and layout.errors arrays (exact strings) for the two invalid fixtures.
- C3: manifestTileToData (z→baseElevation), manifestWallsToDefs (dir passthrough) → new asserts; existing import-tiles/import-walls tests re-run unchanged as the back-compat guard.
- C4: `npm run verify:fast`.
No criterion is infeasible and none contradict (C4 back-compat is the only tension with C2's z0/GRP additions, fully resolved by PIN-1's optional-z0/v1-untouched design). No two criteria conflict.
verdict: PASS

executor: loop-high model=opus tier=high
