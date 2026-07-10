## Carry
slug: ts-assembler | branch: feature/ts-assembler | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: golden diff vs Python output (Loop 5 scripts; Python outputs at /mnt/workspace/code/isoroll-content/output/assembled/l-room_{NW,NE,SW,SE}.png)
criticality: normal | verdict: standard
criteria:
  C1 — TS port of the deterministic per-cell assembler (`scene_assemble.py` twin) in `src/assemble/`: input = layout grid (parsed model) + kit meta (kit.json shape: px_per_unit, pieces{origin,size}) + kit piece textures; output = composed scene image (PIXI RenderTexture or offscreen canvas) for a given view (SW/SE/NE/NW)
  C2 — semantics EXACTLY match Python: view rotation = real coordinate rotation of the grid (rotate never mirror), painter order = (h>0, u0+v0), piece selection = floor | wall | {door,window}_{axis} with horizontal-run-wins-ties axis rule, placement = proj(u0,v0,0) − piece origin, proj(u,v,z) = ((u−v)s, (u+v)s/2 − zs)
  C3 — layout parsing: minimal TS twin of `layout_parse.py` for the DSL subset (#/./D/W/space; name/wall_h directives) with the same validation (door/window must sit in a wall run); stairs cells tolerated but skipped (assembly v1 parity)
  C4 — golden test: assembled l-room (all 4 views) pixel-diffs ≤1% vs the Python PNGs (allow AA/codec tolerance), automated in the e2e or unit harness
tasks: <filled by Loop 1>
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/CONTEXT.md, /mnt/workspace/core/skills/foundry.md, /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ contract), Python reference: /mnt/workspace/code/isoroll-content/src/pipeline/{scene_assemble.py,layout_parse.py,layout_massing.py,scene_guide_render.py}
criticality-note: this becomes the painter's live re-render engine (P7) — keep it PURE (no Foundry document writes; rendering only), so painter can call it per stroke.
tasks: <filled by Loop 1>

## Clarify
intent: port the deterministic scene assembler to TS inside isoroll-module (program P4) so the future painter (P7) can re-render scenes live in Foundry without Python.
motivation: P7 painter needs per-stroke re-assembly in the client; contract stability proven by P2 seam (export/import shipped); golden diff pins parity.
refs: kit fixture /mnt/workspace/code/isoroll-content/output/kit-guide/ (kit.json + 6 PNGs; e2e kit assets already copied under test/e2e/assets/kit by the walls-import loop); layout fixture /mnt/workspace/code/isoroll-content/src/pipeline/layouts/l-room.txt; VIEW_TURNS {SW:0,SE:1,NE:2,NW:3}.
scope-files: new `src/assemble/` (layout-parse.ts, assemble.ts, types, index facade + CONTEXT.md), `test/unit/` + golden harness additions; NO changes to import/walls/render subsystems.
expected-result: `assembleScene(layout, kitMeta, textures, view)` produces the l-room images matching Python goldens ≤1% diff, verify:fast green, verify:full no regressions (two golden failures b32-real-junction/golden-junction are PRE-EXISTING — not this loop's).
ambition: solid
criticality: normal tolerance: minor AA differences vs PIL OK within the 1% budget; wrong piece/order/rotation NOT tolerable.
innovation: none — port with pinned semantics.
verdict: standard
keep-trail: yes
note-base-branch: branch from `feature/module-walls-import` (stack tip — has manifest types + kit e2e assets). Foundry server already at localhost:30000; do NOT restart. Files ≤200 lines each (workspace hook gate) — plan the module split accordingly.

executor: orchestrator (Fable session, plan-approved) model=claude-fable-5 tier=max
