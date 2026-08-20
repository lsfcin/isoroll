# Loop 0 — Clarify — painter-mvp-1

## Carry
slug: painter-mvp-1 | branch: loop/painter-mvp-1 (TBD Loop 1; base = loop/dsl-v2-ts-twin tip aad8dac) | root: code/isoroll-module
test-cmd: `npm run verify:fast` | e2e-cmd: `npm run verify:full` (live Foundry at localhost:30000 — Loop 5 MAY start the server per SETUP.md if down; world isoroll-test)
criticality: normal | verdict: standard
criteria:
  C1 painter mode — togglable canvas layer on an isoroll-enabled scene; entering paint mode shows the editable extent (full-board faint diamond grid) and a tool rail; leaving restores normal play
  C2 core tools at the editing slice — wall (line drag, brush height writes column of voxels), floor (rect drag, fh 0–2ft), door/window (click wall voxel, nearest-side pick, per-tool height), erase (rect, slice-scoped), undo per stroke, slice control (PgUp/Dn + Shift+wheel + HUD stepper); ghost preview on drag, commit on release
  C3 live re-assembly — stroke commit reruns the TS massing/assembler and updates placed tiles + WallDefs in the live scene WITHOUT reload; walls block movement/vision (fog correct per isoroll stack)
  C4 camera rules — painter reuses Foundry pan/zoom untouched; ZERO camera moves on any edit operation
  C5 input redundancy — every action reachable by (a) tool-rail click, (b) keyboard (1-4, X, PgUp/Dn, Ctrl+Z), (c) mouse gesture where natural (RMB erase)
  C6 floor = iso-tiles with PERF GATE — floors emitted as merged massing strips, not per-cell; l-room baseline 6 tiles/24 slices; gate counts slices per re-assembly and logs a warning above threshold
  C7 verify:fast green; e2e scenario: scripted paint of the l-room in live Foundry → wall count matches layout, vision blocked, dumpZOrderJSON stable, no page reload
tasks: TBD (Loop 1)
context: code/CONTEXT.md, code/isoroll-module/CONTEXT.md, code/isoroll-module/SPECS.md, code/isoroll-module/src/CONTEXT.md, core/skills/foundry.md

## Clarify
intent: In-Foundry painter MVP-1 implementing the FROZEN grammar CORE (walls/floors/openings + slice + live re-assembly + auto WallDefs); sloped groups/opacity-window/group-ops are MVP-2 (separate loop, out of scope here).
motivation: P7a of the approved post-freeze plan (2026-07-13). All dependencies shipped: TS assembler (P4), walls-import (P2), floor=iso-tiles decision (P6), DSL v2 TS twin (loop dsl-v2-ts-twin, aad8dac). Gate after ship: ☐ Lucas usability session.
refs: content design/PAINTER-UX.md = the interaction spec (rounds 1–19; hard P7 rules logged in rounds 1–2: no camera moves on edit, reuse canvas nav, editable extent visible; round 5 item 2 hotkeys; v15/v16 voxel semantics). design/feel-rig/rig.frag = reference implementation of gestures/slice/undo (port interaction logic; rendering differs — module uses real tiles). Module: src/assemble/* (v2 parser+massing, just shipped), src/import/* (tile/wall creation), src/walls/*, fog stack src/render/*. Leftover T8 from dsl-v2-ts-twin (facade index.ts re-exports) lands here.
scope-files: src/ (new painter/ folder: layer, tool state, gestures, HUD rail; touches to module.ts wiring, assemble facade index.ts), styles/isoroll.scss (rail), test/unit/ (gesture/state math), test/e2e/ (paint scenario), ROADMAP.md
expected-result: In live Foundry (world isoroll-test): enable painter, paint the l-room with walls/floor/door/window at slice 0, see gray-kit tiles + walls appear live, token vision blocked by painted walls, undo removes last stroke, perf gate reports l-room ≈ 6 floor tiles/24 slices; verify:fast green.
ambition: solid
criticality: normal tolerance: visual polish deferred to P9; group tools absent by design (MVP-2); NO tolerance for camera moves on edit or scene reloads
innovation: none (interaction spec frozen; implementation is porting + Foundry wiring)
verdict: standard
keep-trail: yes
BRANCH NOTE for Loop 1/2: base on loop/dsl-v2-ts-twin (aad8dac). The tree may still carry pre-existing uncommitted floor-fog-spike changes — same fence as the twin loop: never touch/commit those paths; if src/assemble/index.ts facade work (T8 leftover) conflicts with spike dirt, prefer adding a new painter-facing facade seam and note it.

executor: orchestrator(fable, Loop 0 — fields from approved plan + PAINTER-UX frozen spec + D2 ship report, same session) model=claude-fable-5 tier=max
