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
| [`dsl-v2/dsl_v2_groups.txt`](dsl-v2/dsl_v2_groups.txt) | v2, valid: a level carrying GRP cells — the massing fixture, one box expected per group cell. |
| [`dsl-v2/dsl_v2_invalid_badincl.txt`](dsl-v2/dsl_v2_invalid_badincl.txt) | v2, invalid on purpose: a stair whose `incl=3ft` is not a legal incline. Asserts the parser REJECTS. |
| [`dsl-v2/dsl_v2_invalid_misplaced_r.txt`](dsl-v2/dsl_v2_invalid_misplaced_r.txt) | v2, invalid on purpose: an `R` cell where no ramp may sit. The second half of the reject pair. |
| [`dsl-v2/dsl_v2_lroom.txt`](dsl-v2/dsl_v2_lroom.txt) | v2, valid: the L-room as one level, no groups, no errors — the twin-guarantee baseline against the Python parser. |
| [`dsl-v2/dsl_v2_multilevel.txt`](dsl-v2/dsl_v2_multilevel.txt) | v2, valid: more than one `level:` block, so stacking and per-level z are exercised. |
| [`l-room.txt`](l-room.txt) | v1: the L-shaped room, `wall_h: 3`. The golden fixture — its four baked PNGs here are what the pixel-diff compares against. |
| [`twin-room.txt`](twin-room.txt) | v1: two rooms, `wall_h: 3`. The NOVEL layout for scenario tests, deliberately not l-room so a pass cannot come from the golden. |
<!-- routing:end -->
