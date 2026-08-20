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

## Ground
branch-created: feature/ts-assembler base: feature/module-walls-import
paths: 8/8 ok | missing: none
test-cmd-runs: yes (8 test files passed, 40 tests passed)

executor: loop-low model=haiku tier=low

## Architecture

**Core split (purity seam):** the assembler is two layers. `planScene` is PURE and PIXEL-FREE — it computes placements + canvas box from *metadata only* (kit.json sizes, not textures). Rasterization is a pluggable compositor that takes the plan + textures. This keeps the reusable core Foundry-free and PIXI-free (P7 painter calls `planScene` per stroke, then blits with a PIXI compositor), while the golden test uses a Node/pngjs compositor. "Rendering only, no Foundry writes" is satisfied — neither layer touches a Foundry document.

- `src/assemble/types.ts` (T2) — pure types, no logic. `View = "SW"|"SE"|"NE"|"NW"`; `Cell` chars; `Layout {name; grid:string[]; wallH; rows; cols; errors:string[]; warnings:string[]}`; `Opening {kind:"door"|"window"; offset}`; `Box {u0;v0;l;d;h; kind:"wall"|"floor"|"step"; openings:Opening[]; axis:"u"|"v"}`; `KitMeta {px_per_unit; pieces:Record<string,{origin:[number,number]; size:[number,number]}>}`; `Placement {piece:string; left:number; top:number}`; `AssemblyPlan {placements:Placement[]; width:number; height:number; dx:number; dy:number}`.
- `src/assemble/layout-parse.ts` (T3) — twin of `layout_parse.py` subset. `parseText(text,name)→Layout`, `load`, `kind(layout,u,v)` (VOID `" "` outside bounds), `rotateCw(layout,turns)`, `validate`. Consts WALL`#` FLOOR`.` VOID`" "` DOOR`D` WINDOW`W`, STAIRS `^>v<`, SOLID={#,D,W}, DEFAULT_WALL_H=3. Directive split: leading `key: val` lines where key is a valid identifier → directives; rest = grid; **right-pad every row with spaces to max width** before storing (rectangular). `validate`: unknown cell → error; D/W not in a straight wall run (`_in_wall_run`: both horizontal OR both vertical neighbors ∈ SOLID) → error. Stairs are KNOWN (no error) but massing skips them.
- `src/assemble/massing.ts` (T4) — twin of `layout_massing.massing(layout, merge=False)` → `Box[]`, insertion order **floorBoxes ++ wallBoxes** (stairs skipped, see C3). `floorBoxes`: per row, merge consecutive `.` cells into ONE box `Box(u0,v0, run,1, 0,"floor")` at the run START (advance `u += max(run,1)`). `cellWallBoxes`: one 1×1 box per SOLID cell `Box(u,v,1,1, wallH,"wall", runOpenings(u,v), cellAxis(u,v))`. `runOpenings(u,v)`: cell is D→Opening("door",0), W→Opening("window",0), else none. `cellAxis(u,v)`: horizontal (`u`) if left|right neighbor ∈ SOLID, else vertical (`v`) if up|down neighbor ∈ SOLID, else `u` — **horizontal wins ties**.
- `src/assemble/assemble.ts` (T5) — twin of `scene_assemble.assemble`, but returns the plan. `pieceFor(box)`: floor→"floor"; wall→ openings.length? `${openings[0].kind}_${box.axis}` (door_u/window_v/…) : "wall"; step→null. `planScene(layout, kit:KitMeta, view)→AssemblyPlan`: (1) `turned = rotateCw(layout, VIEW_TURNS[view])`, VIEW_TURNS `{SW:0,SE:1,NE:2,NW:3}`; (2) `boxes = stableSort(massing(turned), key=(b.h>0, b.u0+b.v0))` — floors first, then by u0+v0; (3) for each box, `name=pieceFor`; skip if null or `!(name in kit.pieces)`; `px=(u0−v0)*s`, `py=(u0+v0)*0.5*s`, `s=kit.px_per_unit`; `[ox,oy]=kit.pieces[name].origin`; `left=px−ox`, `top=py−oy`; `[w,h]=kit.pieces[name].size`; track xs∈{left,left+w}, ys∈{top,top+h}; push `{piece:name,left,top}`; (4) `MARGIN=16`; `width=trunc(max(xs)−min(xs))+2*MARGIN`, `height=trunc(max(ys)−min(ys))+2*MARGIN`; `dx=MARGIN−min(xs)`, `dy=MARGIN−min(ys)`.
- `src/assemble/index.ts` + `CONTEXT.md` (T6) — facade re-exporting `planScene`, `pieceFor`, `parseText`/`load`, `rotateCw`, `massing`, and all types.
- `test/unit/helpers/composite.ts` (T8) — Node compositor: `composite(plan, textures:Map<name,PNG>)→PNG`. New pngjs RGBA sized `plan.width×plan.height`, filled OPAQUE BLACK (0,0,0,255); for each placement in order, **source-over alpha-composite** the piece PNG at `(trunc(left+dx), trunc(top+dy))` (not naive overwrite — AA edges must blend). Also `loadTextures(dir)` reading the 6 kit PNGs.
- `test/unit/assemble-golden.test.ts` (T8) — for each view: load l-room.txt, `planScene`, `composite`, `pixelmatch` vs golden; assert diff-ratio ≤ 0.01. Pre-assert each `kit.pieces[name].size` equals the actual PNG width/height (parity of the metadata the pure planner trusts).
- `test/unit/assemble-parse.test.ts` (T7) — oracle asserts: `rotateCw` grid values; `validate` errors (D/W outside wall run; unknown char; stairs char accepted); `massing` box list for a fixture (floor-run merge, wall axes, door/window openings); painter order; `pieceFor` names; `planScene` placement coords for a hand-computed cell.
- `test/unit/assets/` (T1) — copy `kit.json`+6 pngs (from isoroll-content/output/kit-guide/), 4 goldens `l-room_{SW,SE,NE,NW}.png` (output/assembled/), and **`l-room.txt` (from src/pipeline/layouts/) byte-identical** — the golden was produced from THIS file; a retyped grid breaks parity.

## Evaluation

criteria-coverage: C1→ planScene (pure plan) + composite.ts (image); index.ts facade — C2→ assemble.ts (proj/sort/pieceFor/placement) + massing.ts (axis, floor-run) + layout-parse.rotateCw — C3→ layout-parse.ts (parse+validate, stairs tolerated) + massing skips step boxes — C4→ assemble-golden.test.ts + composite.ts (pixelmatch ≤1%, 4 views).
seams: unit oracle values (rotateCw, massing box list, pieceFor, one placement coord) test C2/C3 in isolation; the 4-view pixelmatch tests C1/C4 end-to-end; the size-vs-PNG pre-assert guards the pure-planner/compositor metadata contract.

Adversarial pins (medium-executor traps — each is a FATAL if missed):
1. **Floor = MERGED horizontal runs, ONE sprite at run start** — NOT one per cell. `#......#` → a single floor box at (u0,v0,len 6). Per-cell placement diverges from the golden. (Confirmed against l-room.txt.)
2. **Painter sort STABLE**, key `(h>0, u0+v0)`: floors (h=0) before walls (h>0), ties by u0+v0 keep insertion order — rely on JS Array.sort stability; comparator must not reorder equal keys.
3. **`int()` = `Math.trunc`** (toward zero) on width/height AND on paste coords `(trunc(left+dx), trunc(top+dy))`.
4. **Compositor does source-over ALPHA compositing on opaque black**, not paste/overwrite — overlapping AA edges must blend or the diff blows past 1%.
5. **Axis rule**: horizontal (`u`) wins ties; piece naming `${kind}_${axis}` → door_u / window_v etc.
6. **rotateCw = 90° CW** matching `zip(*grid[::-1])`: `new[r][c] = old[rows−1−c][r]`; right-pad rows BEFORE rotating; recompute rows/cols after.
7. **Origin is subtracted** from the projected point (`left=px−originX`) — origin is the sprite's own anchor.
8. **Pure planner reads sizes from kit.json**, not textures; parity of `kit.pieces[].size` vs actual PNG dims is load-bearing → pre-asserted in the golden test.

Files: all ≤200 lines (workspace hook) with wide margin. No new public API surface leaks Foundry/PIXI. No criterion infeasible; no criteria conflict.
verdict: PASS

executor: loop-high model=opus tier=high
