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

## Ground
branch-created: feature/floor-fog-spike base: feature/ts-assembler (5efcbdb feat(src/assemble): TS port of scene_assemble.py — deterministic per-cell isometric compositor)
paths: 13/13 ok | all new file parents exist (src/, test/unit/, test/e2e/, .craft/floor-fog-spike/, /mnt/workspace/code/isoroll-content/); reference assets exist (l-room.txt, SCENE-CREATION.md, fog-drive specs)
test-cmd-runs: yes | 11 test files passed (59 tests), verify:fast green, lint 46 warnings (pre-existing)

executor: loop-low model=haiku tier=low
