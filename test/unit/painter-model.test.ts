// T1 — unit seam for src/painter/model.ts (3-arch.md painter-mvp-1, Loop 4a).
// Scope per PIN D1 (3-arch.md): the model's internal attr encoding (side/type/wmat/fh maps) is
// NOT frozen here — only two things are pinned: (1) the `g` grid character per tool, which
// 3-arch.md states explicitly ("wall->#", "floor->.", "door->D", "window->W", "erase->' '"), and
// (2) toLayout() round-tripping through massing() to the l-room baseline, which is the OTHER
// pinned test (painter-reassemble-plan.test.ts) per 3-arch.md: "the T5 plan-unit test is the pin,
// not this prose." This file only covers the lighter identity round-trip + grid-char contract.
import { describe, expect, it } from "vitest";

import { PainterModel } from "../../src/painter/model";
import type { Stroke } from "../../src/painter/types";
import type { Layout } from "../../src/assemble/types";

function blankLayout(rows: number, cols: number, wallH = 3): Layout {
  const g = Array.from({ length: rows }, () => " ".repeat(cols));
  return {
    name: "blank",
    grid: [],
    wallH,
    rows: 0,
    cols: 0,
    errors: [],
    warnings: [],
    levels: { 0: { g } },
  };
}

function strokeAt(tool: Stroke["tool"], cells: Stroke["cells"], slice = 0): Stroke {
  return { tool, cells, slice, h: 3, fh: 0 };
}

describe("PainterModel — construction + toLayout identity", () => {
  it("wraps a given Layout and toLayout() returns it unchanged when no strokes were applied", () => {
    const layout = blankLayout(3, 3);
    const model = new PainterModel(layout);
    expect(model.toLayout()).toEqual(layout);
  });
});

describe("PainterModel — slice pointer", () => {
  it("defaults to slice 0 and setSlice(n) updates the readable pointer", () => {
    const model = new PainterModel(blankLayout(3, 3));
    expect(model.slice).toBe(0);
    model.setSlice(2);
    expect(model.slice).toBe(2);
  });
});

describe("PainterModel — applyStroke grid-char contract (3-arch.md model.ts prose)", () => {
  it.each([
    ["wall", "#"],
    ["floor", "."],
    ["door", "D"],
    ["window", "W"],
    ["erase", " "],
  ] as const)("tool=%s writes char %j into Level.g at the stroke's cells", (tool, ch) => {
    const model = new PainterModel(blankLayout(3, 3));
    model.applyStroke(strokeAt(tool, [{ u: 1, v: 1 }]));
    const level = model.toLayout().levels![0];
    expect(level.g[1][1]).toBe(ch);
  });

  it("edits only the target cells, leaving the rest of the row untouched", () => {
    const model = new PainterModel(blankLayout(3, 3));
    model.applyStroke(
      strokeAt("wall", [
        { u: 0, v: 1 },
        { u: 2, v: 1 },
      ]),
    );
    const level = model.toLayout().levels![0];
    expect(level.g[1]).toBe("# #");
  });

  it("creates the Level lazily when a stroke targets a slice with no existing Level", () => {
    const model = new PainterModel(blankLayout(2, 2));
    model.applyStroke(strokeAt("floor", [{ u: 0, v: 0 }], 1));
    const level = model.toLayout().levels![1];
    expect(level).toBeDefined();
    expect(level.g[0][0]).toBe(".");
  });
});

describe("PainterModel — per-stroke undo", () => {
  it("undo() reverts exactly the last stroke, not the whole session", () => {
    const model = new PainterModel(blankLayout(3, 3));
    model.applyStroke(strokeAt("wall", [{ u: 0, v: 0 }]));
    const afterFirst = model.toLayout().levels![0].g[0];

    model.applyStroke(strokeAt("wall", [{ u: 1, v: 0 }]));
    expect(model.toLayout().levels![0].g[0]).not.toBe(afterFirst);

    model.undo();
    expect(model.toLayout().levels![0].g[0]).toBe(afterFirst);
  });

  it("undo() on an empty history is a safe no-op (does not throw)", () => {
    const model = new PainterModel(blankLayout(2, 2));
    expect(() => model.undo()).not.toThrow();
  });
});
