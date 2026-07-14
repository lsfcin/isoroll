// C1/C2 — TS twin parses the SAME DSL v2 fixtures as Python (.loop/dsl-v2-ts-twin/3-arch.md).
// Oracle values cross-checked by running the Python twins offline (layout_dsl_v2.parse_text_v2)
// against the fixtures copied verbatim into ./assets/dsl-v2/ — PIN-5. Error strings are asserted
// EXACT per PIN-3 (Python `{ch!r}` single-quote repr, (col,row) order).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseTextV2 } from "../../src/assemble/layout-dsl-v2";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "assets", "dsl-v2");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, `${name}.txt`), "utf-8");
}

describe("parseTextV2 — valid fixtures, structure", () => {
  it("dsl_v2_lroom: single level, no groups, no errors", () => {
    const layout = parseTextV2(loadFixture("dsl_v2_lroom"), "dsl_v2_lroom");
    expect(layout.errors).toEqual([]);
    expect(layout.groups).toEqual([]);
    expect(layout.levels?.[0].g).toEqual([
      "########",
      "#......#",
      "#......W",
      "#......#",
      "#..#####",
      "#..#    ",
      "#..#    ",
      "#D##    ",
    ]);
  });

  it("dsl_v2_multilevel: two levels, no groups, no errors", () => {
    const layout = parseTextV2(loadFixture("dsl_v2_multilevel"), "dsl_v2_multilevel");
    expect(layout.errors).toEqual([]);
    expect(layout.groups).toEqual([]);
    expect(layout.levels?.[0].g).toEqual(["####", "#..#", "#..#", "####"]);
    expect(layout.levels?.[1].g).toEqual(["####", "#..#", "#D.#", "####"]);
  });

  it("dsl_v2_groups: two levels, one roof group + one stair group, no errors", () => {
    const layout = parseTextV2(loadFixture("dsl_v2_groups"), "dsl_v2_groups");
    expect(layout.errors).toEqual([]);
    expect(layout.levels?.[0].g).toEqual([" ", "S"]);
    expect(layout.levels?.[1].g).toEqual(["RRRR", " S  "]);
    expect(layout.groups).toEqual([
      {
        kind: "roof",
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
        ],
        form: 0,
        dir: "^",
        incl: 5,
        z: 1,
        enclose: 0,
      },
      {
        kind: "stair",
        cells: [
          [1, 0],
          [1, 1],
        ],
        form: 0,
        dir: ">",
        incl: 5,
        z: 0,
        enclose: null,
      },
    ]);
  });
});

describe("parseTextV2 — invalid fixtures, error-class parity (PIN-3)", () => {
  it("dsl_v2_invalid_badincl: bad incl error THEN uncovered-marker error, in that order", () => {
    const layout = parseTextV2(loadFixture("dsl_v2_invalid_badincl"), "dsl_v2_invalid_badincl");
    expect(layout.errors).toEqual([
      "group incl must be 2.5 or 5 (ft/cell): 3",
      "level 0 (0,0) marker 'S' not covered by any group",
    ]);
  });

  it("dsl_v2_invalid_misplaced_r: uncovered 'R' marker, no group defined at all", () => {
    const layout = parseTextV2(
      loadFixture("dsl_v2_invalid_misplaced_r"),
      "dsl_v2_invalid_misplaced_r",
    );
    expect(layout.errors).toEqual(["level 0 (0,0) marker 'R' not covered by any group"]);
  });
});
