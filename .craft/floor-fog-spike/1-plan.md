## Carry
slug: floor-fog-spike | branch: feature/floor-fog-spike | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `node test/e2e/spike-floor.spec.mjs`-style via existing runner vs live Foundry (localhost:30000, do NOT restart)
criticality: normal | verdict: standard
base-branch: feature/ts-assembler (branch the new branch from here — assembler+import+kit present)
criteria:
  C1 — prototype (a) FLOOR-AS-ISO-TILES: l-room floor from MERGED massing strips (src/assemble floorBoxes — floor runs, NOT wall boxes) placed as isoroll tiles in the fog stack (fog-apply/fog-state/iso-tile-fog-sync); measured: tile count, slice count, fog-state alpha (unseen/explored/visible darken floor).
  C2 — prototype (b) BACKGROUND REGEN: assembled scene image set as scene background via transformBackground/backgroundYScale; measured: does bg participate in isoroll fog (expected NO — document the gap exactly) + bg-swap latency on edit.
  C3 — measurement harness: scripted e2e producing a comparison table (counts, sort-tick load proxy, fog-coverage observations, screenshot refs) — numbers from code/oracles (isoroll.dumpZOrderJSON), not eyeballs.
  C4 — evidence recommendation in 5-user.md + SCENE-CREATION.md § Floor/background updated with the table; FINAL DECISION LEFT OPEN for Lucas (☐ co-decide) — do NOT pick/wire a winner.
tasks:
  T1 — prototype (a) pure floor-tile builder — src/spike-floor/floor-tiles-proto.ts, test/unit/spike-floor-tiles.test.ts — medium
  T2 — prototype (b) pure bg-regen builder — src/spike-floor/bg-regen-proto.ts, test/unit/spike-bg-regen.test.ts — medium
  T3 — measurement oracle module — src/spike-floor/measure.ts, test/unit/spike-measure.test.ts — medium
  T4 — e2e measurement scenario (THROWAWAY) — test/e2e/spike-floor.spec.mjs, test/e2e/output/spike-floor.json — medium
  T5 — comparison table + open recommendation — .craft/floor-fog-spike/5-user.md, code/isoroll-content/SCENE-CREATION.md — medium
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, src/CONTEXT.md, src/render/CONTEXT.md, src/assemble/CONTEXT.md, src/import/CONTEXT.md, src/background/CONTEXT.md, /mnt/workspace/core/skills/foundry.md, /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ Floor/background)
grounded-paths: l-room DSL=test/unit/assets/l-room.txt | composed imgs=isoroll-content/output/assembled/l-room_{NE,NW,SE,SW}.png | composite helper=test/unit/helpers/composite.ts | fog-drive refs=test/e2e/b33-unhide.spec.mjs, b35-stale-sync.spec.mjs | import template=test/e2e/import-manifest.spec.mjs

## Plan
branch: feature/floor-fog-spike (base: feature/ts-assembler)

| id | task | files | done-when | tier | effort |
|----|------|-------|-----------|------|--------|
| T1 | Prototype (a) pure builder: parse l-room.txt (src/assemble load/parseText), take MERGED floor runs via `floorBoxes(layout)` (NOT wall boxes / not `massing()` output), map each strip → Foundry Tile creation-data with flags.isoroll.enabled=true + transformTile=true (mirror manifestTileToData v14-center conventions, standalone in spike module) | src/spike-floor/floor-tiles-proto.ts (new), test/unit/spike-floor-tiles.test.ts (new) | verify:fast green; unit asserts merged-strip tile count < FLOOR-cell count for l-room | medium | medium |
| T2 | Prototype (b) pure builder: given a composed scene image path + grid dims, return a scene.update()-shaped payload {background.src, flags.isoroll.transformBackground=true, flags.isoroll.backgroundYScale:<number>}. No live write in the builder | src/spike-floor/bg-regen-proto.ts (new), test/unit/spike-bg-regen.test.ts (new) | verify:fast green; unit asserts payload sets transformBackground=true + numeric backgroundYScale + a background.src | medium | medium |
| T3 | Measurement oracle module: pure fn taking an `isoroll.dumpZOrderJSON()` payload + scene snapshot → {tileCount, sliceCount, perFogState:{unseen,explored,visible}→floor alpha, sortProxy}. sortProxy = total floor-tile slice count (stand-in for per-frame depth-sort cost; DepthSorter dormant). Numbers from the dump only | src/spike-floor/measure.ts (new), test/unit/spike-measure.test.ts (new) | verify:fast green; unit extracts all fields from a fixture dump | medium | medium |
| T4 | e2e measurement scenario (header-marked THROWAWAY/spike): (a) place T1 floor tiles into an l-room fixture scene, drive fog unseen→explored→visible (reuse b33/b35 fog-drive path), dump oracle, record floor alpha + counts + sortProxy; (b) set T2 composed bg (copy isoroll-content/output/assembled/l-room_SE.png → test/e2e/assets/ first), drive same states, record bg-sprite alpha (expected CONSTANT = no fog participation) + bg-swap latency via Date.now(); write test/e2e/output/spike-floor.json | test/e2e/spike-floor.spec.mjs (new), test/e2e/output/spike-floor.json (gen) | runs vs live Foundry (no restart); spike-floor.json has both prototypes' numbers; verify:fast still green with NO NEW regressions (b32-real-junction + golden-junction fails are PRE-EXISTING) | medium | high |
| T5 | Comparison table + evidence recommendation with FINAL DECISION OPEN: fill numbers from spike-floor.json into 5-user.md table + SCENE-CREATION § Floor/background; add ☐ co-decide checkpoint leaving the pick to Lucas; keep spike modules (branch stays unmerged) | .craft/floor-fog-spike/5-user.md, code/isoroll-content/SCENE-CREATION.md | SCENE-CREATION § Floor/background has the table + recommendation + ☐ co-decide; no winner wired into shipped code | medium | medium |

Loop mapping: L3 designs the fog-drive + oracle-schema seams (high tier owns the tricky fog-state driving); L4a writes T1–T3 unit tests + T4 spec failing; L4b implements T1–T3 green + T4 e2e green; L5 runs T4 for real + does T5; L6 commits branch, keeps `.craft/` (keep-trail=yes), leaves spike code in place (unmerged).

## Plan Review (adversarial, assume small executors)
- "merged massing strips" ambiguous — an executor could call `massing()` (floors+walls) or per-cell floors → FIX: T1 pins `floorBoxes(layout)` by name, explicitly excludes wall boxes. Grounded: floorBoxes is exported from src/assemble/massing.ts and returns merged floor runs.
- Prototype (b) needs a real composed scene image; a small executor could stall hunting one → FIX: exact path pinned (isoroll-content/output/assembled/l-room_SE.png) + T4 copies it into test/e2e/assets/ so the live scene URL resolves (modules/isoroll/test/e2e/assets/...). Fallback composite helper named (test/unit/helpers/composite.ts) but not needed.
- Driving fog to unseen/explored/visible in a script is the hardest seam and "wrong measurements are not tolerable" → FIX: deferred to L3 (high tier) which must pin the exact fog-drive sequence; T4 references the two existing specs (b33-unhide, b35-stale-sync) that already exercise the fog/visibility path. Not FATAL: named references + high-tier owner.
- Risk of eyeballed numbers violating C3 → FIX: T3 is a pure oracle module reading `isoroll.dumpZOrderJSON()`; T4 records its output to spike-floor.json; T5 must read that JSON, not prose. Alpha is read per-slice from the dump.
- "No changes to shipped subsystems" could be broken if an executor edits fog-apply to expose a helper → FIX: all spike code confined to src/spike-floor/ + test/e2e/spike-floor.spec.mjs + spike unit tests; shipped src/assemble, src/import, src/render, src/background imported READ-ONLY. Files columns enforce the boundary.
- src/spike-floor/ is under src/ so vite/tsc/eslint (verify:fast) will lint+typecheck it → FIX: called out; spike modules must be clean TS (no `any`-leak, pass eslint R1–R6). Not throwaway-sloppy despite being throwaway.
- l-room layout DSL availability for T1 unit test → RESOLVED at ground: test/unit/assets/l-room.txt exists and is already used by assembler unit tests.
- Decision-open guard (C4): T5 must NOT wire a winner. FIX: T5 done-when forbids any shipped-code edit choosing a candidate; only docs + ☐ co-decide checkpoint. Loop 6 keeps spike code unmerged.
verdict: PASS

executor: loop-high model=opus tier=high
