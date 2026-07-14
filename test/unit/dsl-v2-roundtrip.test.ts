// C2 — round-trip contract: toDsl(parseTextV2(text)) == text, compared PER-LINE-RSTRIPPED
// (PIN-2, Python contract — level grids are right-padded so rstrip reconciles both sides).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseTextV2 } from "../../src/assemble/layout-dsl-v2";
import { toDsl } from "../../src/assemble/layout-serialize";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "assets", "dsl-v2");

const FIXTURE_NAMES = [
  "dsl_v2_lroom",
  "dsl_v2_multilevel",
  "dsl_v2_groups",
  "dsl_v2_invalid_badincl",
  "dsl_v2_invalid_misplaced_r",
];

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, `${name}.txt`), "utf-8");
}

function rstripLines(text: string): string[] {
  return text.split("\n").map((l) => l.replace(/\s+$/, ""));
}

describe.each(FIXTURE_NAMES)("toDsl round-trip — %s", (name) => {
  it("matches the source fixture line-by-line after rstrip on both sides", () => {
    const text = loadFixture(name);
    const layout = parseTextV2(text, name);
    const actual = rstripLines(toDsl(layout));
    const expected = rstripLines(text.replace(/\n+$/, ""));
    expect(actual).toEqual(expected);
  });
});
