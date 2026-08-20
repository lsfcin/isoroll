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

## User Test
scenario: I hand the assembler a layout it has never seen — not l-room, not the hand-computed
unit fixture — a two-room "twin-room" plan (6x9, `test/unit/assets/twin-room.txt`): two 3-wide
rooms split by an interior wall with a door, exterior windows on both flanks, and two T-junctions
where that interior wall meets the exterior wall (a tie case for the horizontal-run-wins-ties axis
rule, C2, that no existing fixture exercises). I go through the module's real front door — the
public facade `src/assemble/index.ts` (nothing in the suite had imported it before; every prior
test reached into internal modules directly) — parse the layout, then assemble all four views
(SW/SE/NE/NW) with `planScene`, and expect the piece counts, piece-name histograms, and axis
choices to match what the actual Python pipeline computes on the byte-identical fixture.
script: test/unit/assemble-scenario.test.ts (oracle: .craft/ts-assembler/scripts/oracle_twin_room.py)
run: `npx vitest run test/unit/assemble-scenario.test.ts` then `npm run verify:fast` then `npm run build`
observed:
  - Oracle (`python3 .craft/ts-assembler/scripts/oracle_twin_room.py`, real layout_parse.py/
    layout_massing.py/scene_assemble.py against test/unit/assets/twin-room.txt): SW 38 placements
    {floor:8,wall:27,window_v:2,door_v:1}; SE 36 {floor:6,wall:27,window_u:2,door_u:1}; NE 38
    {floor:8,wall:27,window_v:2,door_v:1}; NW 36 {floor:6,wall:27,window_u:2,door_u:1}. Floor count
    genuinely differs SW/NE vs SE/NW (8 vs 6) — the rooms are 3-wide x 4-tall, so a 90° turn changes
    the merge-run geometry; not a copy-paste coincidence, both engines derive it independently.
    T-junction cells (4,0) and (4,5): axis 'u' (tie, horizontal wins); interior door cell (4,2):
    axis 'v' (no horizontal solid neighbor) — confirms the tie rule on a shape no prior test hit.
  - TS scenario test via the public facade: `PASS (7) FAIL (0)` — parse-no-errors, both T-junction
    axes + door axis, all 4 views' placement counts + histograms, and the SW→SE door_v→door_u
    rotation check all matched the oracle on first run (no debugging loop needed).
  - `npm run verify:fast`: lint 0 errors (46 pre-existing warnings, unrelated files, untouched);
    `Test Files 11 passed (11) | Tests 59 passed (59)` (52 pre-existing + 7 new).
  - `npm run build`: `vite build` exit 0, `dist/module.js` 180.53 kB (gzip 47.98 kB); only a
    pre-existing dynamic/static dual-import warning on `wall-overlay.ts` (unrelated to this feature).
  - Foundry server at localhost:30000 was not touched — confirmed still up (`curl` → 302) before and
    after this loop; no restart issued, no `verify:full`/e2e run (out of Loop 5's scope here).
matches-expected-result: yes — a genuinely novel layout, chained through the real public API across
all four views, reproduces the Python oracle's piece counts and axis choices exactly, including a
tie-rule case (T-junction) and an asymmetric-geometry case (view-dependent floor merge count) that
no prior unit or golden test exercised; verify:fast and build both stay green.
touched: test/unit/assemble-scenario.test.ts (new), test/unit/assets/twin-room.txt (new fixture),
.craft/ts-assembler/scripts/oracle_twin_room.py (new, oracle script), .craft/ts-assembler/scripts/
oracle_twin_room_output.json (new, raw oracle transcript).

executor: loop-medium model=sonnet tier=medium
