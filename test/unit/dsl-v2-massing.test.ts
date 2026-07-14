// C2 — massing() GRP box list for a parsed v2 layout: one box per group cell, z0 = voxLo,
// h = voxHi - voxLo (PIN-5: hand-derived from Python `massing(layout, merge=False)`, the render
// lane — matches the TS twin's cell-box output; GRP boxes are merge-independent).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { massing } from "../../src/assemble/massing";
import { parseTextV2 } from "../../src/assemble/layout-dsl-v2";
import type { Box } from "../../src/assemble/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "assets", "dsl-v2");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, `${name}.txt`), "utf-8");
}

describe("massing — v2 GRP boxes (dsl_v2_groups)", () => {
  it("emits one GRP box per group cell, in group-then-cell order, with correct z0/h", () => {
    const layout = parseTextV2(loadFixture("dsl_v2_groups"), "dsl_v2_groups");
    expect(layout.errors).toEqual([]);
    const boxes = massing(layout);
    const grpBoxes = boxes.filter((b: Box) => b.kind === "GRP");
    expect(grpBoxes).toEqual([
      { u0: 0, v0: 0, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 1 },
      { u0: 1, v0: 0, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 1 },
      { u0: 2, v0: 0, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 1 },
      { u0: 3, v0: 0, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 1 },
      { u0: 0, v0: 1, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 0 },
      { u0: 1, v0: 1, l: 1, d: 1, h: 1, kind: "GRP", openings: [], axis: "u", z0: 1 },
    ]);
  });
});

describe("massing — v1 back-compat (PIN-1)", () => {
  it("v1 layout boxes stay byte-identical: no z0 key, no GRP kind", () => {
    const v1Layout = {
      name: "v1",
      grid: ["#D#", "#.#", "###"],
      wallH: 3,
      rows: 3,
      cols: 3,
      errors: [],
      warnings: [],
    };
    const boxes = massing(v1Layout);
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.kind).not.toBe("GRP");
      expect(Object.prototype.hasOwnProperty.call(box, "z0")).toBe(false);
    }
  });
});
