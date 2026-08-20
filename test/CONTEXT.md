# test
> Verification suites: unit/ (vitest+fast-check, T1 pure math) and e2e/ (Playwright headless Foundry, T2 regression specs). See workspace VERIFY.md.

## Layout

| Directory | Tier | Runner | What |
|-----------|------|--------|------|
| `unit/` | T1 | `npm run test` (vitest) | Property tests over pure math: iso-tile-depth, iso-tile-geom, coord-map. No Foundry, no PIXI — stubs in `unit/setup.ts`. |
| `e2e/` | T2 | `node test/e2e/run.mjs` | Real Foundry headless via Playwright: fixture scenes (`fx-*`), `isoroll.dumpZOrderJSON()` oracle assertions, one spec per KNOWN-BUG (`b<N>-*.spec.mjs`). |

## Rules

- Regression specs are named `b<N>-<slug>.spec.mjs` — ISSUES.md status flips to FIXED only with a matching spec (enforced by workspace hook).
- Specs for OPEN bugs set `xfail` with the bug id; the runner treats their failure as expected and flags XPASS when the bug is gone.
- Oracles assert on the JSON dump only, never on pixels; the dump calls live-path functions (never re-derives depth).
- Every visually-confirmed bug exports its scene as a fixture here.

<!-- routing:start -->
## Routing

| Subdirectory | Description |
|--------------|-------------|
| [`unit/`](unit/CONTEXT.md) | — |

| File | API | Description |
|------|-----|-------------|
| [`e2e/dsl-v2-twin-scenario.test.ts`](e2e/dsl-v2-twin-scenario.test.ts) | `runPythonOracle`, `tsLevelsAsPairs` | Loop 5 (.craft/dsl-v2-ts-twin/5-user.md) — DSL v2 twin guarantee, scripted end-to-end scenario. |
| [`manual/cabin-test.js`](manual/cabin-test.js) | — | Manual test setup — builds the cabin test scene from scratch in a live world. |
<!-- routing:end -->
