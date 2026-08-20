## Carry
slug: floor-fog-spike | branch: feature/floor-fog-spike | root: /mnt/workspace/code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: scripted measurement scenario vs live Foundry (localhost:30000, do NOT restart)
criticality: normal | verdict: standard
criteria:
  C1 — prototype (a) FLOOR-AS-ISO-TILES: l-room floor built from MERGED massing strips (use `src/assemble/massing.ts` merge lane — floor strips, not per-cell) placed as isoroll tiles participating in the fog stack (`fog-apply`/`fog-state`/`iso-tile-fog-sync`); measured: tile count, slice count, fog state correctness (unseen/explored/visible darken floor as designed)
  C2 — prototype (b) BACKGROUND REGEN: assembled scene image (TS assembler output) set as scene background via `transformBackground`/`backgroundYScale` path; measured: does background participate in isoroll fog (expected: NO — document exactly what the gap looks like), update latency for a background swap on edit
  C3 — measurement harness: scripted e2e scenario producing a comparison table (counts, sort-tick load proxy, fog coverage observations, screenshots refs) recorded in the loop file — numbers from code/oracles, not eyeballs
  C4 — evidence-based recommendation drafted in 5-user.md + SCENE-CREATION.md § Floor/background updated with the table; FINAL DECISION EXPLICITLY LEFT OPEN for Lucas (☐ co-decide checkpoint) — do NOT pick and wire a winner
tasks: <filled by Loop 1>
context: /mnt/workspace/code/isoroll-module/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/CONTEXT.md, /mnt/workspace/code/isoroll-module/src/render/CONTEXT.md, /mnt/workspace/core/skills/foundry.md (canvas.md, stage-transform.md subfiles), /mnt/workspace/core/skills/iso-visual.md, /mnt/workspace/code/isoroll-content/SCENE-CREATION.md (§ Floor/background — OPEN design item; this spike resolves its evidence)

## Clarify
intent: program P6 — evidence spike deciding how painted floors join isoroll's fog/visibility model: (a) floor as isoroll tiles from merged strips vs (b) live background regeneration.
motivation: floor is the last unresolved architectural seam before the Painter MVP (P7); Lucas flagged floors must sit ABOVE Foundry default fog and be darkened by isoroll's own strategy — plain background/underfoot tiles sit below that model.
refs: SCENE-CREATION.md § Floor/background (constraint + both candidates); module fog stack src/render/{fog-apply,fog-state,iso-tile-fog-sync}.ts; TS assembler (feature/ts-assembler, SHIPPED) provides composed textures + massing strips; import surface src/import/ (module-walls-import, SHIPPED) places tiles; scene flags transformBackground/backgroundYScale + src/background/ gizmos.
scope-files: prototype code under `src/spike-floor/` or test/e2e scripts (throwaway clearly marked), measurement scenario in test/e2e or .craft scripts; SCENE-CREATION.md update (content repo, docs-only); NO changes to shipped import/assemble/render subsystems beyond read-only use.
expected-result: comparison table with real numbers for both prototypes; recommendation + open decision for Lucas; verify:fast/full no regressions (b32-real-junction + golden-junction failures are PRE-EXISTING).
ambition: solid
criticality: normal tolerance: prototypes may be rough/throwaway; WRONG MEASUREMENTS are not tolerable (they'd steer the architecture).
innovation: some — measurement design needs judgment; that's why Loop 3 is high tier.
verdict: standard
keep-trail: yes
note-base-branch: branch from `feature/ts-assembler` (stack tip — assembler + import + kit assets all present).

executor: orchestrator (Fable session, plan-approved) model=claude-fable-5 tier=max
