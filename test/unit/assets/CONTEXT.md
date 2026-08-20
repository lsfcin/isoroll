# assets
> Fixture art and layouts the unit suites assert against — baked kit sprites, a kit manifest, and the text layouts that produce them.
> spec: none

Inputs to tests, never outputs. A `.txt` layout is the source a parser reads; the `_NE/_NW/_SE/_SW`
PNGs are the four baked views of the same piece, so a test can check that a view selection lands on
the right file. `kit.json` is the manifest binding them.

**Regenerating these is `isoroll-content`'s job, not this repo's** — they are committed here so the
suite runs with no pipeline and no network. Replace one only when the bake that produced it changes.

<!-- routing:start -->
## Routing

| File | Description |
|------|-------------|
| [`dsl-v2/dsl_v2_groups.txt`](dsl-v2/dsl_v2_groups.txt) | ← add first-line comment |
| [`dsl-v2/dsl_v2_invalid_badincl.txt`](dsl-v2/dsl_v2_invalid_badincl.txt) | ← add first-line comment |
| [`dsl-v2/dsl_v2_invalid_misplaced_r.txt`](dsl-v2/dsl_v2_invalid_misplaced_r.txt) | ← add first-line comment |
| [`dsl-v2/dsl_v2_lroom.txt`](dsl-v2/dsl_v2_lroom.txt) | ← add first-line comment |
| [`dsl-v2/dsl_v2_multilevel.txt`](dsl-v2/dsl_v2_multilevel.txt) | ← add first-line comment |
| [`l-room.txt`](l-room.txt) | ← add first-line comment |
| [`twin-room.txt`](twin-room.txt) | ← add first-line comment |
<!-- routing:end -->
