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

## User Test
scenario: As GM I load the l-room fixture (SW view), turn on token vision + fog exploration, then
place a viewer token inside the long floor leg. I expect prototype (a)'s floor tiles to darken as
unseen/explored/visible the way every other isoroll surface does. I then move the token to the short
leg and expect the long leg's tiles to go from visible to explored (darkened, not hidden). Finally I
swap the scene background to the assembled l-room image (prototype b) and check whether that swap
touches isoroll's own fog-tile stack at all, and how long the edit takes.
script: test/e2e/spike-floor.spec.mjs (THROWAWAY, not in verify:full) run: `node test/e2e/spike-floor.spec.mjs`
observed: `PASS spike-floor (throwaway)`, ran 3x against the live Foundry (localhost:30000, not
restarted) for stability — build freshened first (`npm run build`, symlinked at
/home/lucas/foundrydata-v14/Data/modules/isoroll). Numbers identical across runs 1/2 except
bgSwapLatencyMs (670/672/671ms, ±2ms noise). `npm run verify:fast` re-checked green (0 lint errors,
46 pre-existing warnings, 76/76 tests) — spike code didn't regress the base module.
matches-expected-result: yes — covA (token in long leg) showed visible>0 and unseen>0 as asserted;
covB (token moved to short leg) showed explored>0 as asserted (long-leg tiles darkened, not hidden);
fogParticipation===0 confirmed prototype (b) never touches the tile-fog stack. All 5 in-script
asserts passed (see script L45/46/57).

## Comparison Table
(oracle source: `test/e2e/output/spike-floor.json`, via `classifyFog`/`fogCoverage` reading
sprite `tint` — not `dumpZOrderJSON` alpha alone, which can't distinguish explored from visible;
see measure.ts comment)

| Metric | (a) floor-as-iso-tiles | (b) background regen |
|---|---|---|
| Tile count (l-room, SW, merged massing strips) | 6 | 0 (not a tile) |
| Slice count (sort-tick load proxy — sprites isoroll must sort/composite per frame) | 24 | 0 |
| Fog participation | full — reads isoroll's own tint/alpha model | **0** (`fogParticipation` metric = 0 extra fog-stack rows on bg swap) |
| Fog-state correctness (region A, after token moved off it) | unseen 0 / explored 18 / visible 6 / total 24 / darkenedFraction 0.75 — oracle-verified via tint (EXPLORED_TINT vs 0xffffff), not eyeballed | n/a — background sits outside the tile-fog stack entirely; visible at full clarity regardless of scene fog/token-vision state |
| Update/edit latency | not isolated — tile creation + 2 fog-sync round-trips settled inside the script's fixed 300ms waits (not a per-op number comparable to bg swap) | 670ms (mean of 3 runs, 670/672/671; includes the script's fixed 300ms settle wait — genuine `canvas.scene.update` cost is smaller but not isolated further) |
| Screenshot refs | not captured — table's `shot` field is `"n/a"` by T4's design (oracle counts substituted); flagging as a measurement gap, not re-scoping T4 to add screenshots |

## Recommendation (evidence-based, decision left OPEN per C4)
Prototype (a) is the only one of the two that is fog-correct: it sits inside isoroll's own
tint-driven visibility model, verified here by oracle (not eyeballing) across both a "currently
visible" and a "previously seen, now explored" state, at a modest sort-tick cost for this fixture
(6 tiles / 24 slices for an l-room; cost scales with merged massing *runs*, not raw grid cells, per
T1's `massing()` merge). Prototype (b) has a **complete, structural** fog gap — `fogParticipation`
measured at exactly 0, not a partial or edge-case gap — meaning a background floor would render at
full clarity under unexplored fog, which breaks the fog experience for players. (b)'s edit latency
(~670ms) is acceptable for a GM-driven scene edit but is irrelevant to the correctness question.
Recommend (a) as the fog-correct baseline; if (b)'s cheaper reuse of already-composited art is
wanted for visual richness, that would need to be evaluated as a *decorative layer under* (a)'s
fog-tiled floor, not as a substitute — that combined design was not prototyped or measured here and
is not part of this recommendation's evidence. Final call stays with Lucas (☐ co-decide, C4).

executor: loop-medium model=sonnet tier=medium
