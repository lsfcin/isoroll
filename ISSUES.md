# isoroll-module — Issues

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

## B2 — Tile position jumps on grid size change

**Symptom:** When grid size changes (e.g. via GridConfig), tokens and walls reposition
consistently to maintain their grid-unit position. Tiles jump to a wrong position. Moving
the tile afterward snaps linked walls back to the tile correctly (walls track the correct
position; the tile is the one that jumps).

**Note:** Foreground tile behavior was intentionally designed to hold pixel size through
grid rescales (unlike tokens which scale). The POSITION should still follow the same
rescale logic as tokens/walls — only SIZE should be stable.

**Affected:** `onPreUpdateScene` / `onUpdateSceneGridRescale` in `object-transform.ts`.

**Finding (2026-07-02, spec `test/e2e/b2-rescale.spec.mjs`):** the direct `scene.update({grid:{size}})`
path rescales tile position CORRECTLY — the spec guards it. The bug therefore lives in the
GridConfig dialog path (preview/submit); a GridConfig-driven spec variant is still needed
to reproduce.

---

## B25 — imageOffset anchor not refreshed on the spot when flag changes

**Symptom:** After changing `imageOffset` (via drag or TileConfig form), the tile mesh
anchor and position are not always updated immediately. The change is correct after a
manual tile re-select or scene reload.

**Root cause:** `tile.document.setFlag(MODULE_ID, "imageOffset", ...)` sends a document
update where `changed` only contains `flags.*`. Foundry's `Tile._onUpdate` sets render
flags only for `x`, `y`, `width`, `height`, `rotation`, etc. — flag-only updates set no
render flags, so `refreshTile` hook never fires and our `onRefreshTile` is not called.

A partial fix (`onUpdateTileFlags` in `tile-transform.ts`) detects isoroll flag changes
and manually sets `renderFlags.set({ refreshMesh: true })` to trigger the hook. However
the imgOff→anchor mapping has a coordinate-space subtlety: `imgOff` is stored as a
WORLD-space displacement normalized by gridSize (anchor moves to `baseCenterWorld + imgOff
* gridSize`), and correctly expressing it in IMAGE [0,1]² space to update the anchor
in-place requires a two-point `transformCoord` difference. Not worth the complexity now.

**Workaround:** Re-select the tile after changing imageOffset.

---

## B26 — Fog extraction ImageData zero-width crash on tile hover

**Symptom:** `IndexSizeError: Failed to construct 'ImageData': The source width is zero or not a number` appears in the console, originating from `worker.js → image-compressor.js → pixelsToOffscreenCanvas`. Happens intermittently when hovering a tile. Foundry also logs `FogExtractor | Buffer compression has failed!`. Does not break functionality visibly.

**Stack:** Foundry's FogExtractor tries to compress a fog buffer where the source canvas has zero width. Triggered by `commit → #save → _extractBase64 → compressBufferBase64 → ImageData(buffer, 0)`.

**Likely cause:** A zero-dimension offscreen canvas produced during fog extraction when a tile has unusual dimensions or when the scene is in an intermediate state during hover. Not isoroll code — entirely in Foundry internals.

**Action:** Monitor for Foundry upstream fix. If it worsens, investigate whether isoroll tile dimension handling produces zero-width image regions.

---

## B27 — Black screen flash when entering scene (F5, scene activation, GridConfig close)

**Symptom:** On scene load (page reload / F5, scene activation from scene list, or closing
GridConfig and returning to the active scene), tiles briefly appear projected against a
black background before the background image renders in. Lasts ~0.5–1s then resolves.

**Trigger conditions confirmed:**
- Page reload (F5) with isoroll scene active
- Activating a scene from the sidebar
- Closing the GridConfig dialog (returns to the scene mid-animation tick)

**Likely cause:** `onCanvasReady` fires and draws tile overlays (3D boxes, sprite clones)
before Foundry finishes painting the background sprite. IsoRenderer renders into canvas
layers that are already visible while `canvas.environment.primary.background` is still
loading/positioning. When GridConfig closes, `onGridConfigClose` → `onCanvasReady` may
fire before the background restores its non-preview state.

**Action:** Investigate deferring `onCanvasReady` tile/token rendering until background
sprite is confirmed ready, or hook into a later Foundry lifecycle event.

---

## Design Discussion — TileConfig / TokenConfig popup hides isoroll overlays

**Observation:** Opening the TileConfig or TokenConfig popup causes all isoroll visuals
(volume gizmo handles, 3D bounding box, image contour) to disappear. Closing the popup
does not restore them — tile/token must be deselected and reselected.

**Cause:** Foundry fires `controlTile`/`controlToken` with `controlled = false` when the
config popup opens, which our hooks interpret as a deselect.

**Open question:** Is this the right UX? Overlays are editing tools — having them disappear
while the config popup is open may be intentional (reduces clutter). The cost is one
extra click (reselect) after closing the popup. Decide before fixing.

## B28 — Painter/kit lighting rotates WITH the camera

**Symptom (Lucas 2026-07-15):** rotating the view changes nothing about which faces are
lit — the "sun" follows the camera. A south-facing wall should keep its world-lit tone
while the camera yaws; instead every view gets identical FACE_TOP/LONG/CAP shading.

**Root cause:** grayscale face ramp is assigned by SCREEN role per view
(`tile_guide_render.py` convention, mirrored in `kit_module_render.py`), not by world
normal. Fix = shade from world-frame face normal with a fixed sun (rotate normals per
yaw). Same machinery as the normal-map lane (content ROADMAP.md § RICHNESS).
Also: painter must support all 9 views (8 yaws + TOP) — content ROADMAP.md § PLAYABLE, D2.

---

## B29 — Undo of linked-wall displacement lost

**Symptom:** wall drag commit does not produce an undoable Tile-layer history entry.

**Carried here 2026-08-19** from `REFACTOR.md` § Open Items, deleted under the workspace `.md`
cap. That file pointed at this one for the full symptom description, and B29 had never been
written here — so the two lines above were the only record of it anywhere.

**Both diagnostic checks it asked for now come back positive**, so this may already be
fixed and needs one Foundry run to confirm or close:
- `wall-overlay-ops.ts:108` drag `onUp` path DOES call `WallHistory.push({ k:"move", ... })`
- `wall-history.ts:58` has `undoMove`, and `:112` dispatches `e.k === "move"` to it

Onset was to be bisected against `3403e6e`. Nothing has verified the *behaviour*, only that
the code path exists — so this stays open until someone drags a linked wall and hits undo.

## The TS assembler twin no longer mirrors the Python

`src/assemble/massing.ts` still strip-merges floors in the RENDER lane. isoroll-content stopped
doing that on 2026-08-01 (`_floor_cell_boxes`), because arm A pastes ONE one-cell sprite per box —
so a merged 10-cell strip drew a tenth of itself, and nine tenths of every floor was missing from
the bake. See isoroll-content ROADMAP § PARITY LADDER.

**Nothing goes red**, which is the problem: `test/unit/assemble-golden.test.ts` compares the TS
assembly against l-room PNGs rendered by the OLD Python, so both sides are stale together and the
twin quietly stopped being a twin. Whoever next opens `src/assemble/` owns this — the subtree had
uncommitted spike work when it was found, so it was written down rather than edited.

Fix is `_floor_cell_boxes`'s one loop; the goldens then need re-rendering from current Python.

<!-- entropy:start -->
## Entropy

> Generated by `core/hooks/entropy/dashboard/entropy-dashboard.py`, which scans `code/isoroll-module`. Never edit inside this block, and never copy a count out of it — a copied number is the drift these checks exist to catch.

2026-09-04 · 429 tracked files scanned · **95 findings here**

| Check | Findings |
|-------|----------|
| Off-allowlist `.md` types | 0 |
| CONTEXT.md hand-written inventories | 13 |
| Naming and placement | 0 |
| Routing tables pointing at files git does not carry | 0 |
| Projects not declaring their goal | 0 |
| Wiki-links naming nothing | 0 |
| Retired tokens still alive | 0 |
| Roadmap item numbers cited outside a roadmap | 1 |
| Items claimed by two ledgers | 0 |
| Size signals | 29 |
| Source files with no interface stub | 25 |
| Directories holding too many files | 9 |
| Prose describing finished work | 1 |
| Unanswered scaffold placeholders | 9 |
| Doubt stores missing their own discipline | 0 |
| Ledgers naming a model where they mean a tier | 0 |
| Header fields naming code that is not there | 0 |
| Truncated routing descriptions | 0 |
| Constraints trapped in a CONTEXT.md head | 2 |
| Local branches holding unpromoted work | 5 |
| Work that exists on this disk and nowhere else | 1 |
| Local branches already merged into their base | 0 |
| Remote branches already merged into their base | 0 |

### Off-allowlist `.md` types

*route via core/SCHEMA.md § four disposal routes*

Clean.

### CONTEXT.md hand-written inventories

*the routing block owns inventory*

- src/CONTEXT.md: hand-written file inventory (15 bullets/table rows listing real files).
- src/assemble/CONTEXT.md: hand-written file inventory (5 bullets/table rows listing real files).
- src/background/CONTEXT.md: hand-written file inventory (3 bullets/table rows listing real files).
- src/draw/CONTEXT.md: hand-written file inventory (4 bullets/table rows listing real files).
- src/gizmos/CONTEXT.md: hand-written file inventory (4 bullets/table rows listing real files).
- src/hud/CONTEXT.md: hand-written file inventory (3 bullets/table rows listing real files).
- src/import/CONTEXT.md: hand-written file inventory (5 bullets/table rows listing real files).
- src/preset/CONTEXT.md: hand-written file inventory (7 bullets/table rows listing real files).
- src/tiles/CONTEXT.md: hand-written file inventory (3 bullets/table rows listing real files).
- src/tokens/CONTEXT.md: hand-written file inventory (3 bullets/table rows listing real files).
- src/transform/CONTEXT.md: hand-written file inventory (17 bullets/table rows listing real files).
- src/ui/CONTEXT.md: hand-written file inventory (4 bullets/table rows listing real files).
- src/walls/CONTEXT.md: hand-written file inventory (11 bullets/table rows listing real files).

### Naming and placement

*kebab-case ASCII, types where their scope allows*

Clean.

### Routing tables pointing at files git does not carry

*a clone gets the table and not the file — track the target, or stop routing to it*

Clean.

### Projects not declaring their goal

*line 3 of a code/ CONTEXT.md*

Clean.

### Wiki-links naming nothing

*a [[slug]] is a goal file or an item in one*

Clean.

### Retired tokens still alive

*a rename is unfinished until these are zero*

Clean.

### Roadmap item numbers cited outside a roadmap

*a closed item is deleted — cite the SPECS.md/SCHEMA.md section that owns the rule*

- ISSUES.md: cites 'Front 17' (line 230).

### Items claimed by two ledgers

*v1 criterion 2 — an item lives in one place*

Clean.

### Size signals

*a signal for review, never a cap — do not summarize to fit*

- code/isoroll-module/.craft/floor-fog-spike/0-clarify.md — 12 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/1-plan.md — 19 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/2-ground.md — 12 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/3-arch.md — 34 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/4a-tests.md — 10 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/4b-code.md — 11 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/floor-fog-spike/5-user.md — 10 line(s) over the 120-column cap (first at line 3)
- code/isoroll-module/.craft/painter-mvp-1/0-clarify.md — 17 line(s) over the 120-column cap (first at line 4)
- code/isoroll-module/.craft/painter-mvp-1/1-plan.md — 18 line(s) over the 120-column cap (first at line 5)
- code/isoroll-module/.craft/painter-mvp-1/2-ground.md — 9 line(s) over the 120-column cap (first at line 5)
- code/isoroll-module/.craft/painter-mvp-1/3-arch.md — 26 line(s) over the 120-column cap (first at line 5)
- code/isoroll-module/.craft/painter-mvp-1/4a-tests.md — 9 line(s) over the 120-column cap (first at line 5)
- code/isoroll-module/.craft/painter-mvp-1/4b-code.md — 9 line(s) over the 120-column cap (first at line 5)
- code/isoroll-module/CONTEXT.md — 3 line(s) over the 120-column cap (first at line 12)
- code/isoroll-module/ROADMAP.md — 355 lines, over the 200 cap; introduced by 09c9ac4 lsfcin
- code/isoroll-module/ROADMAP.md — 39 line(s) over the 120-column cap (first at line 2)
- code/isoroll-module/refs/CONTEXT.md — 1 line(s) over the 120-column cap (first at line 2)
- code/isoroll-module/refs/REFS.md — 1 line(s) over the 120-column cap (first at line 6)
- code/isoroll-module/src/assemble/CONTEXT.md — 2 line(s) over the 120-column cap (first at line 19)
- code/isoroll-module/src/background/CONTEXT.md — 3 line(s) over the 120-column cap (first at line 14)
- code/isoroll-module/src/gizmos/CONTEXT.md — 1 line(s) over the 120-column cap (first at line 15)
- code/isoroll-module/src/hud/CONTEXT.md — 2 line(s) over the 120-column cap (first at line 14)
- code/isoroll-module/src/preset/CONTEXT.md — 3 line(s) over the 120-column cap (first at line 18)
- code/isoroll-module/src/tiles/CONTEXT.md — 3 line(s) over the 120-column cap (first at line 14)
- code/isoroll-module/src/transform/CONTEXT.md — 10 line(s) over the 120-column cap (first at line 54)
- code/isoroll-module/src/ui/CONTEXT.md — 2 line(s) over the 120-column cap (first at line 15)
- code/isoroll-module/src/walls/CONTEXT.md — 1 line(s) over the 120-column cap (first at line 22)
- code/isoroll-module/test/CONTEXT.md — 3 line(s) over the 120-column cap (first at line 2)
- code/isoroll-module/test/unit/assets/CONTEXT.md — 1 line(s) over the 120-column cap (first at line 2)

### Source files with no interface stub

*the read gate only fires when a stub exists — a missing one turns it off silently*

- code/isoroll-module/test/e2e/dsl-v2-twin-scenario.test.ts — no .d.ts
- code/isoroll-module/test/unit/assemble-golden.test.ts — no .d.ts
- code/isoroll-module/test/unit/assemble-parse.test.ts — no .d.ts
- code/isoroll-module/test/unit/assemble-scenario.test.ts — no .d.ts
- code/isoroll-module/test/unit/coord-map.test.ts — no .d.ts
- code/isoroll-module/test/unit/dsl-v2-massing.test.ts — no .d.ts
- code/isoroll-module/test/unit/dsl-v2-parse.test.ts — no .d.ts
- code/isoroll-module/test/unit/dsl-v2-roundtrip.test.ts — no .d.ts
- code/isoroll-module/test/unit/flags.test.ts — no .d.ts
- code/isoroll-module/test/unit/helpers/composite.ts — no .d.ts
- code/isoroll-module/test/unit/import-scene-manifest.test.ts — no .d.ts
- code/isoroll-module/test/unit/import-tiles.test.ts — no .d.ts
- code/isoroll-module/test/unit/import-walls.test.ts — no .d.ts
- code/isoroll-module/test/unit/iso-tile-depth.test.ts — no .d.ts
- code/isoroll-module/test/unit/iso-tile-geom.test.ts — no .d.ts
- code/isoroll-module/test/unit/manifest-validate.test.ts — no .d.ts
- code/isoroll-module/test/unit/painter-gestures.test.ts — no .d.ts
- code/isoroll-module/test/unit/painter-model.test.ts — no .d.ts
- code/isoroll-module/test/unit/painter-reassemble-perf.test.ts — no .d.ts
- code/isoroll-module/test/unit/painter-reassemble-plan.test.ts — no .d.ts
- code/isoroll-module/test/unit/parity-placement.test.ts — no .d.ts
- code/isoroll-module/test/unit/spike-bg-regen.test.ts — no .d.ts
- code/isoroll-module/test/unit/spike-floor-tiles.test.ts — no .d.ts
- code/isoroll-module/test/unit/spike-measure.test.ts — no .d.ts
- code/isoroll-module/test/unit/tile-sprite-anchor.test.ts — no .d.ts

### Directories holding too many files

*splitting costs one hop — pay it only when it removes more table than it adds*

- code/isoroll-module/src/assemble — 10 code files in one directory, over the WARN_FILES signal; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/core — 9 code files in one directory, over the WARN_FILES signal; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/preset — 9 code files in one directory, over the WARN_FILES signal; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/render — 31 code files in one directory, over the BLOCK_FILES cap; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/tiles — 8 code files in one directory, over the WARN_FILES signal; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/tokens — 8 code files in one directory, over the WARN_FILES signal; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/transform — 20 code files in one directory, over the BLOCK_FILES cap; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/src/walls — 16 code files in one directory, over the BLOCK_FILES cap; split by responsibility if the split removes more table than the hop adds
- code/isoroll-module/test/unit — 24 code files in one directory, over the BLOCK_FILES cap; split by responsibility if the split removes more table than the hop adds

### Prose describing finished work

*git is the history — cut it, or rewrite it as present-tense state*

- ROADMAP.md:127: a ticked item — prose describing finished work.

### Unanswered scaffold placeholders

*a generator asked a question — answer it at the source, never by cutting the marker*

- src/core/CONTEXT.md:2: 5 unanswered placeholder(s).
- src/preset/CONTEXT.md:39: 2 unanswered placeholder(s).
- src/render/CONTEXT.md:50: 2 unanswered placeholder(s).
- src/resolver/CONTEXT.md:22: 1 unanswered placeholder(s).
- src/sorter/CONTEXT.md:22: 1 unanswered placeholder(s).
- src/transform/CONTEXT.md:79: 5 unanswered placeholder(s).
- src/ui/CONTEXT.md:31: 2 unanswered placeholder(s).
- src/walls/CONTEXT.md:44: 2 unanswered placeholder(s).
- test/unit/CONTEXT.md:2: 1 unanswered placeholder(s).

### Doubt stores missing their own discipline

*an experiment states its Method, Results, What changed and Limitations; a judged reference carries a source tier*

Clean.

### Ledgers naming a model where they mean a tier

*which model fills a tier is data — core/flows/craft/routing.md*

Clean.

### Header fields naming code that is not there

*a field naming our own tree is a claim, and it is checked before a later session inherits it as fact — core/SCHEMA.md § Every field that names our own code is verified*

Clean.

### Truncated routing descriptions

*the source wrote past the bound — shorten it there, never edit the table*

Clean.

### Constraints trapped in a CONTEXT.md head

*the only enforced-read type — move the contract to a sibling SPECS.md*

- src/assemble/CONTEXT.md: head is 417 tok carrying 3 constraint(s).
- src/transform/CONTEXT.md: head is 1641 tok carrying 4 constraint(s).

### Local branches holding unpromoted work

*promote when the work is green, or say which reason applies — /roundup Phase 5*

- code/isoroll-module — feature/b24-b20-wip is 2 ahead of main
- code/isoroll-module — feature/phase-1-depth-refinement is 2 ahead of main
- code/isoroll-module — feature/phase-6-roadmap-wip is 5 ahead of main
- code/isoroll-module — feature/token-visual-regrouping-wip is 2 ahead of main
- code/isoroll-module — refactor/phase-6-cleanup is 3 ahead of main

### Work that exists on this disk and nowhere else

*two machines share this workspace — push it, or give the repo a remote to push to: code/SPECS-git.md § Push policy*

- code/isoroll-module — develop is 16 ahead of origin/develop

### Local branches already merged into their base

*safe to delete, and purely local — `git -C <repo> branch -d <branch>`*

Clean.

### Remote branches already merged into their base

*safe to delete, and outward-facing — `git -C <repo> push origin --delete <branch>`, Lucas*

Clean.

<!-- entropy:end -->
