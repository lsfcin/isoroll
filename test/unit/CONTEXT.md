# unit
> ← add description

<!-- routing:start -->
## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`assets/`](assets/CONTEXT.md) | — |

| File | API | Description |
|------|-----|-------------|
| [`assemble-golden.test.ts`](assemble-golden.test.ts) | `loadKit` | T8 — C4 golden test: assembled l-room (4 views) pixel-diffs <=1% vs the Python-rendered PNGs. |
| [`assemble-parse.test.ts`](assemble-parse.test.ts) | — | T7 — oracle unit tests for the assembler seams: rotateCw, validate, massing, pieceFor, planScene. |
| [`assemble-scenario.test.ts`](assemble-scenario.test.ts) | `loadKit`, `countBy` | Loop 5 — user test: a NOVEL two-room layout (not l-room, not the unit-test FIXTURE), chained |
| [`coord-map.test.ts`](coord-map.test.ts) | `expectClose` | T1 unit tests — coord-map: roundtrip identities for every coordinate system pair. |
| [`dsl-v2-massing.test.ts`](dsl-v2-massing.test.ts) | `loadFixture` | C2 — massing() GRP box list for a parsed v2 layout: one box per group cell, z0 = voxLo, |
| [`dsl-v2-parse.test.ts`](dsl-v2-parse.test.ts) | `loadFixture` | C1/C2 — TS twin parses the SAME DSL v2 fixtures as Python (.loop/dsl-v2-ts-twin/3-arch.md). |
| [`dsl-v2-roundtrip.test.ts`](dsl-v2-roundtrip.test.ts) | `loadFixture`, `rstripLines` | C2 — round-trip contract: toDsl(parseTextV2(text)) == text, compared PER-LINE-RSTRIPPED |
| [`flags.test.ts`](flags.test.ts) | — | T1 unit tests — VolumeFlags.mirrorImageOffset: flip transform invariants (B34). |
| [`helpers/composite.ts`](helpers/composite.ts) | `composite`, `loadTextures`, `blit` | T8 — Node/pngjs compositor test helper: source-over alpha-composite an AssemblyPlan onto opaque black. |
| [`import-scene-manifest.test.ts`](import-scene-manifest.test.ts) | `mockScene` | T1 unit test — import-scene-manifest: validate-before-write atomicity guard (C3). |
| [`import-tiles.test.ts`](import-tiles.test.ts) | `baseTile` | T1 unit tests — import-tiles: pure manifest-tile → Foundry Tile creation-data mapping (C1). |
| [`import-walls.test.ts`](import-walls.test.ts) | `fakeFrame` | T1 unit tests — import-walls: manifest scene-grid-normalized walls → per-tile WallDef[] (C1/C2). |
| [`iso-tile-depth.test.ts`](iso-tile-depth.test.ts) | `projectedFaces` | T1 unit tests — iso-tile-depth: frontier faces, depth-cell assignment, zIndex banding (B32 oracle). |
| [`iso-tile-geom.test.ts`](iso-tile-geom.test.ts) | `fakeMesh`, `fakeTile` | T1 unit tests — iso-tile-geom: slice cuts, cell overlaps, and the cross-tile no-ties zIndex oracle (B32). |
| [`manifest-validate.test.ts`](manifest-validate.test.ts) | `validWall`, `validTile`, `validManifest` | T1 unit tests — manifest-validate: structural validation of import manifests (C3). |
| [`painter-gestures.test.ts`](painter-gestures.test.ts) | `sortCells` | T2 — unit seam for src/painter/gestures.ts (3-arch.md painter-mvp-1, Loop 4a). Pure geometry: |
| [`painter-model.test.ts`](painter-model.test.ts) | `blankLayout`, `strokeAt` | T1 — unit seam for src/painter/model.ts (3-arch.md painter-mvp-1, Loop 4a). |
| [`painter-reassemble-perf.test.ts`](painter-reassemble-perf.test.ts) | — | T5 — unit seam for src/painter/reassemble-perf.ts (3-arch.md painter-mvp-1, C6 perf gate). |
| [`painter-reassemble-plan.test.ts`](painter-reassemble-plan.test.ts) | `loadLRoomLayout`, `loadLRoomModel` | T5 — unit seam for src/painter/reassemble-plan.ts (3-arch.md painter-mvp-1, the C6 seam). |
| [`parity-placement.test.ts`](parity-placement.test.ts) | `load`, `stagePoint`, `spriteTopLeft` | T1 — the OFFLINE twin of the parity e2e specs: does the placement rule reproduce |
| [`setup.ts`](setup.ts) | — | Vitest global stubs — minimal Foundry/PIXI globals so pure-math modules import cleanly in Node. |
| [`spike-bg-regen.test.ts`](spike-bg-regen.test.ts) | — | T2 — oracle unit tests for buildBackgroundSpec: view -> filename map, flags, yScale passthrough. |
| [`spike-floor-tiles.test.ts`](spike-floor-tiles.test.ts) | — | T1 — oracle unit tests for buildFloorTileSpecs. Fixture: test/unit/assets/l-room.txt (same |
| [`spike-measure.test.ts`](spike-measure.test.ts) | — | T3 — oracle unit tests for the measurement module. classifyFog is the ONE classifier shared by |
| [`tile-sprite-anchor.test.ts`](tile-sprite-anchor.test.ts) | — | T1 unit tests — tile-sprite-anchor: density scale, origin anchor, and the ground factor identity. |
<!-- routing:end -->
