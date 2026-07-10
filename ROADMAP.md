# isoroll — Roadmap
> Pending work only. Completed milestones move to HISTORY.md. See [SPECS.md](SPECS.md) for design decisions and [SETUP.md](SETUP.md) for dev setup.

<!-- Goal: agent-ready roadmap. Each milestone includes file paths, function names, flag names,
     and technical context sufficient for implementation without prior session context. -->

## Status

Feature Phases 3 + 4 complete (see HISTORY.md). **Scene Painter track (below) is the program spine (approved plan 2026-07-09); Phase 5 (door secondary image) folds into its P9.**

IsoRenderer refactor — Phases 0–11 complete, merged to `develop`. Wall bugs 3a/3b/3c + B29 + B28 + B31 fixed (see HISTORY.md). Occluder lifecycle path verified.

**Active branch:** `develop` — Phase 6 slice z-ordering complete and merged. Phase 6B (per-slice fog) deferred (see below). B28 and B31 resolved this session.

## Backlog

- **Shadow params in presets** — shadow shape, radius, opacity, and enabled state should be included when saving/loading image presets for tiles and tokens. Currently presets only capture image transform fields.
- **Compass / orientation HUD** — N/S/E/W indicator on the iso canvas; helps read direction. (INBOX 2026-07)
- **Vertical sight** — line-of-sight accounting for elevation/height; not covered by any phase yet. (INBOX 2026-07)
- **Reassess foreground-tile checkbox** — is the Iso-tab foreground checkbox still relevant to the current design? Decide keep/remove. (INBOX 2026-07)

---

## Scene Painter Track (program P2–P9) — approved 2026-07-09

> Canonical spec + contract + kill-log: `isoroll-content/SCENE-CREATION.md`. Content-side twin: `isoroll-content/ROADMAP-content-gen.md`. Every loop touching this track loads `/foundry` first.

Module-side phases, in dependency order:

1. **`module-walls-import` (P2, /loops medium)** — import scene manifest JSON (tiles + `WallDef[]`, schema = `src/walls/wall-types.d.ts`) → `createWallsFromDefs()` (`src/walls/wall-crud.ts`) + tile placement with `boundHeight`/`imageOffset` flags. Verify: gray l-room from content pipeline loads in live Foundry; wall count matches layout; vision blocked; `verify:full` green. Depends on content `export-manifest` loop. **IN PROGRESS** — plan at `.loop/module-walls-import/1-plan.md` (T1–T6; new `src/import/` module + `isoroll.importSceneManifest`).
2. **TS assembler port (P4, /loops medium)** — port `scene_assemble.py` per-cell painter to TS (kit manifest → composed scene texture(s)). Verify: golden diff vs Python output on the l-room demo.
3. **Floor/fog spike (P6, /loops high design + medium prototypes)** — floor must join the isoroll fog stack (`src/render/fog-apply.ts`, `fog-state.ts`, `iso-tile-fog-sync.ts` — sprites sit above Foundry default fog, darkened by isoroll). Prototype BOTH: (a) floor as isoroll tiles from merged massing strips; (b) live background regeneration (`transformBackground`, `backgroundYScale`, background gizmos). Measure slice count/perf + fog correctness. DECIDE here, record in SCENE-CREATION.md. ☐ Lucas co-decides.
3.5. **Painter UX design (P6.5, design-first — added 2026-07-09 user request)** — interaction-design doc (contextual grammar, keys/mouse/HUD map) + clickable HTML prototype (browser, real gray-kit sprites) to iterate the "magic feel" before any Foundry code. ☐ Lucas plays prototype, iterates until it feels like magic. Output = the interaction spec P7 implements.
4. **Painter MVP (P7, /loops high arch + medium code)** — implements the P6.5-approved interaction design as a new canvas layer: paint/erase wall/floor/door/window/stairs; autotile (blob/Wang bitmask; piece taxonomy in SCENE-CREATION.md § Painter grammar) picks kit pieces; live re-assembly via #2; WallDefs auto-registered; floor per #3; basic props layer. Verify: paint a room in live Foundry → walls/vision/fog correct without reload; interactions match P6.5 doc. ☐ usability session.
5. **Multiview (P8)** — (a) dimetric view switch: rotation = cell remapping (never mirroring — chirality), wire the ORIENTATION-ROTATION HOOK (`src/render/iso-tile-depth.ts:21`), resolver facing selection (`src/resolver/asset-resolver.ts`, `DEFAULT_FACING` becomes dynamic), token 8-direction placeholder (`object-transform.ts`); (b) cardinal: second projection preset (custom projection flags exist) + cardinal kit art batch (content S0-E7). Verify: view toggle keeps z-order stable (`isoroll.dumpZOrderJSON()`); cross-view QC green.
6. **Polish (P9)** — magic-feel pass (shortcuts + mouse + HUD redundancy, contextual grammar); Phase 5 door secondary image (below); door webm animations (desired; Foundry tiles play video natively). ☐ final usability + style verdict.

Supersedes "Future — Multiview" below (kept for its INBOX notes). The 4+1-vs-8+1 question is DECIDED: 8+1, two art regimes (user decision 2026-07-09).

---

## Phase 6 -- Iso-Diagonal Slice Depth Sorting :COMPLETE:

### What was built

All tiles are sliced into `Wg+Hg-1` `PIXI.Sprite` sub-frames (vertical bands of the original texture) and sorted on the `ISO_SPRITES` layer using PIXI's native `sortChildren()`. Tokens are inserted at a half-band offset between slices.

**Depth formula (`src/render/iso-tile-depth.ts`)**
- `depthZIndex(row, col, elev, band) = (row - col + elev) * DEPTH_SCALE + band`
- `DEPTH_SCALE = 10000`, `TOKEN_BAND = 5000`
- Tile slice band = `tileSortBand(tileId, peers)` -- peer tiebreaker based on `(document.sort, id)`
- Each slice gets its own `zIndex` from `sliceDepthCell()`, which maps the slice to its nearest frontier face

**PIXI layer setup (`src/render/iso-sprite-layer.ts`)**
- `isoLayer.sortableChildren = true`
- Ticker at priority `-25` forces `isoLayer.sortChildren()` every frame
- Original tile meshes in `canvas.primary` are forced to `alpha=0` every tick

### Key files

- `src/render/iso-tile-renderer.ts` -- `_createTileSlices()` creates slices
- `src/render/iso-tile-slice-build.ts` -- `buildSlice()` creates sub-frame sprites
- `src/render/iso-tile-depth.ts` -- `depthZIndex()`, `frontierFaces()`, `sliceDepthCell()`, `tileSortBand()`
- `src/render/iso-tile-zsync.ts` -- `syncTileZ()`, `tileBand()`
- `src/render/iso-sprite-layer.ts` -- `_onTick()` drives `sortChildren()`

### What was removed

- `src/sorter/` (entire `DepthSorter` module) -- obsolete; incompatible with slice model
- `IsoSpriteLayer._sort()` stub -- never called; sorting is done by PIXI
- `src/render/iso-tile-debug-cells.ts` -- empty `drawCellMarkers()`, superseded by labels

### Known limitations (future, not Phase 6)

- `imageOffset` not handled in cut point calculation -- assumes `imageOffset=0`
- Cross-tile cyclic occlusion possible with overlapping multi-cell tiles; no cycle detection yet
- `tileSortBand` wraps at >5000 tiles (clamped to `TOKEN_BAND - 1`)

### References

- isometric-perspective fork `foreground.js`:
  - `assignTileDepths()` (lines 316-341) -- banded depth model (no slicing)
  - `computeTokenEntries()` (lines 354-406) -- token insertion between tile bands



## Phase 5 — Door Secondary Image 🔲 PENDING

### Problem

Tiles with linked door walls support `hide`, `fade`, and `none` behavior on door open/close. No way to swap to a secondary texture (e.g. closed door tile → open doorway tile).

### Solution

Add a fourth door behavior mode `"image"` that swaps `tile.mesh.texture` to a configurable secondary texture on open, restores on close.

### Checklist

- [ ] Add `"image"` to `DoorBehavior` type in `src/walls/wall-types.ts`
- [ ] Add `flags.isoroll.doorOpenTexture` (string URL) to `TileDocument` flags in `src/flags.ts`
- [ ] Add `mode === "image"` branch in `applyDoorBehavior()` in `src/walls/wall-door.ts`: on open swap `tile.mesh.texture` to texture loaded from flag; on close restore from `tile.document.texture.src`
- [ ] Cache loaded texture (use Foundry's `loadTexture(url)`)
- [ ] Add `"image"` to cycle sequence in `cycleDoorBehavior()` in `src/walls/wall-door.ts` (after `"fade"`)
- [ ] Add texture picker field for `doorOpenTexture` to Iso tab in `src/ui/tile-config.ts` (shown only when behavior = `"image"`)

### Key Files

- `src/walls/wall-door.ts` — `applyDoorBehavior()`, `cycleDoorBehavior()`
- `src/walls/wall-types.ts` — `DoorBehavior` type
- `src/flags.ts` — tile flags
- `src/ui/tile-config.ts` — Iso tab config form

---


## Phase 7 — Image Edit Mode UX 🔲 PENDING

### Problem

Image handles and contour work. Mode-switching UX is missing — no way to enter/exit image-edit mode without touching volume handles.

### Solution

Double-click enters image-edit mode (volume handles hidden, image handles shown). ESC or click-outside exits. Numeric inputs for offset/scale.

### Checklist

- [ ] Add per-tile/token `imageEditMode` in-memory state flag to `VolumeGizmos` (`src/tiles/tile-gizmos.ts`) and `TokenGizmos` (`src/tokens/token-gizmos.ts`)
- [ ] On enter image-edit mode: hide volume handles, keep image handles; on exit: restore
- [ ] Wire double-click entry point in gizmo classes
- [ ] Add ESC keydown listener to exit image-edit mode
- [ ] Add pointerdown-outside check to exit image-edit mode
- [ ] Add fine-tune numeric text inputs for offset/scale in `src/ui/tile-config.ts` and `src/ui/token-config.ts`

### Key Files

- `src/tiles/tile-gizmos.ts` — `VolumeGizmos`
- `src/tokens/token-gizmos.ts` — `TokenGizmos`
- `src/ui/tile-config.ts`, `src/ui/token-config.ts`

### Scope

`imageEditMode` is in-memory only — not persisted to flags.

---

## Phase 8 — Stance State Machine 🔲 PENDING

### Problem

Stance switching exists but lacks system integration and manual override.

### Checklist

- [ ] dnd5e hook integration (attack, skill, condition changes)
- [ ] Keyboard shortcut for manual stance override
- [ ] Fallback chain resolution at display time

---

## Phase 9 — Template Scene 🔲 PENDING

### Checklist

- [ ] Pre-built scene: ISO enabled, sample tiles placed
- [ ] Demonstrates volume gizmos + occlusion

---

## Phase 10 — Right-Click Context Menus 🔲 PENDING

### Checklist

- [ ] Redundant access to all controls (volume edit, image edit, presets)

---

## Future — Multiview → PROMOTED to Scene Painter Track item 5 (P8)

- 8 directional facings + TOP — DECIDED 8+1 (2026-07-09): dimetric regime = cell remapping of existing art; cardinal regime = new kit art (content S0-E7) + cardinal projection preset.
- Auto-detect from token movement direction — still open, part of P8 token work.

## Future — Animations 🔲 DEFERRED

- Single-frame impact → fluid frame sequences
- Frame naming: `{name}_{stance}_{facing}_{frame:04d}.{ext}`
