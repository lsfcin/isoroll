# test
> Verification suites: unit/ (vitest+fast-check, T1 pure math) and e2e/ (Playwright headless Foundry, T2 regression specs). See workspace VERIFY.md.

## Layout

| Directory | Tier | Runner | What |
|-----------|------|--------|------|
| `unit/` | T1 | `npm run test` (vitest) | Property tests over pure math: iso-tile-depth, iso-tile-geom, coord-map. No Foundry, no PIXI — stubs in `unit/setup.ts`. |
| `e2e/` | T2 | `node test/e2e/run.mjs` | Real Foundry headless via Playwright: fixture scenes (`fx-*`), `isoroll.dumpZOrderJSON()` oracle assertions, one spec per KNOWN-BUG (`b<N>-*.spec.mjs`). |

## Rules

- Regression specs are named `b<N>-<slug>.spec.mjs` — KNOWN-BUGS.md status flips to FIXED only with a matching spec (enforced by workspace hook).
- Specs for OPEN bugs set `xfail` with the bug id; the runner treats their failure as expected and flags XPASS when the bug is gone.
- Oracles assert on the JSON dump only, never on pixels; the dump calls live-path functions (never re-derives depth).
- Every visually-confirmed bug exports its scene as a fixture here.

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`unit/coord-map.test.ts`](unit/coord-map.test.ts) | — | `expectClose` | T1 unit tests — coord-map: roundtrip identities for every coordinate system pair. |
| [`unit/iso-tile-depth.test.ts`](unit/iso-tile-depth.test.ts) | — | `projectedFaces` | T1 unit tests — iso-tile-depth: frontier faces, depth-cell assignment, zIndex banding (B32 oracle). |
| [`unit/iso-tile-geom.test.ts`](unit/iso-tile-geom.test.ts) | — | `fakeMesh`, `fakeTile` | T1 unit tests — iso-tile-geom: slice cuts, cell overlaps, and the cross-tile no-ties zIndex oracle (B32). |
| [`unit/setup.ts`](unit/setup.ts) | — | — | Vitest global stubs — minimal Foundry/PIXI globals so pure-math modules import cleanly in Node. |
<!-- routing:end -->
