## Carry
slug: ts-assembler | branch: feature/ts-assembler | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: golden diff vs Python output (Loop 5 scripts; Python outputs at /mnt/workspace/code/isoroll-content/output/assembled/l-room_{NW,NE,SW,SE}.png)
criticality: normal | verdict: standard
criteria:
  C1 — TS port of the deterministic per-cell assembler (`scene_assemble.py` twin) in `src/assemble/`: input = layout grid (parsed model) + kit meta (kit.json shape: px_per_unit, pieces{origin,size}) + kit piece textures; output = composed scene image (PIXI RenderTexture or offscreen canvas) for a given view (SW/SE/NE/NW)
  C2 — semantics EXACTLY match Python: view rotation = real coordinate rotation of the grid (rotate never mirror), painter order = (h>0, u0+v0), piece selection = floor | wall | {door,window}_{axis} with horizontal-run-wins-ties axis rule, placement = proj(u0,v0,0) − piece origin, proj(u,v,z) = ((u−v)s, (u+v)s/2 − zs)
  C3 — layout parsing: minimal TS twin of `layout_parse.py` for the DSL subset (#/./D/W/space; name/wall_h directives) with the same validation (door/window must sit in a wall run); stairs cells tolerated but skipped (assembly v1 parity)
  C4 — golden test: assembled l-room (all 4 views) pixel-diffs ≤1% vs the Python PNGs (allow AA/codec tolerance), automated in the e2e or unit harness
tasks: T1 assets — copy full kit(json+6png)+4 goldens — test/unit/assets/* — low | T2 types — src/assemble/types.ts — medium | T3 layout-parse — src/assemble/layout-parse.ts — medium | T4 massing — src/assemble/massing.ts — medium | T5 assemble core — src/assemble/assemble.ts — high | T6 facade+CONTEXT — src/assemble/index.ts,CONTEXT.md — low | T7 parse/massing unit tests — test/unit/assemble-parse.test.ts — medium | T8 golden test+compositor — test/unit/assemble-golden.test.ts,test/unit/helpers/composite.ts — high
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/CONTEXT.md, /mnt/workspace/core/skills/foundry.md, /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ contract), Python reference: /mnt/workspace/code/isoroll-content/src/pipeline/{scene_assemble.py,layout_parse.py,layout_massing.py,scene_guide_render.py}
criticality-note: this becomes the painter's live re-render engine (P7) — keep it PURE (no Foundry document writes; rendering only), so painter can call it per stroke.

## Code

Implemented all five stub bodies per 3-arch.md, cross-checked line-by-line against the Python twins
(`layout_parse.py`, `layout_massing.py`, `scene_assemble.py`, `scene_guide_render.py._proj`/`Cam.pt`)
before running tests — not iterated blind against red output.

attempt 1: T3 layout-parse.ts (parseText/load/kind/rotateCw/validate), T4 massing.ts (floorBoxes/
runOpenings/cellAxis/cellWallBoxes/massing), T5 assemble.ts (pieceFor/planScene), T8 composite.ts
(loadTextures/composite, source-over alpha blit onto opaque black) → 0 red on first `vitest run`
(all 12 new tests green); lint FAILED: 35 errors — project's local ESLint rules (`local/single-return`,
`local/one-call-per-statement` max 1 call/statement, `local/max-chain-depth` max `a.b.c`, `curly:"all"`)
were not visible in 3-arch.md/4a-tests.md and my first draft used multi-return early-exits, chained
`.map().length` / `Math.max(...)` in one statement, and `box.openings[0].kind` (chain depth 3).
attempt 2: rewrote `layout-parse.ts`, `massing.ts`, `assemble.ts` to single-result-variable style
(one `return` per function, every multi-call expression split into intermediate `const`s, deep
member chains flattened to intermediate variables, all `if`/`while` bodies braced) — logic unchanged,
same oracle values. `npm run verify:fast` → lint 0 errors (46 pre-existing warnings elsewhere,
untouched), vitest 52/52 green (40 pre-existing + 12 new).
green: yes run: `Test Files  10 passed (10) | Tests  52 passed (52)` (exit 0); golden test individually
re-run verbose: all 4 views (`SW`,`SE`,`NE`,`NW`) pass `pixelmatch` ≤1% vs the real Python-rendered
PNGs (72/61/59/57ms), confirming genuine pixel parity, not a vacuous pass.
touched: src/assemble/{layout-parse,massing,assemble}.ts (implemented stub bodies, all ≤150 lines),
test/unit/helpers/composite.ts (implemented loadTextures/composite), src/assemble/CONTEXT.md (new,
T6), src/CONTEXT.md (routing entry for assemble/ — pre-existing auto-sync hook also refreshed
unrelated `core/`/`import/`/`tokens/` rows on this edit, out of this task's scope but harmless and
required by the repo's CONTEXT.md sentinel-sync convention).

executor: loop-medium model=sonnet tier=medium
